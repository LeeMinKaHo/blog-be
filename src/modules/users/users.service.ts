import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from './user.helper';
import { UserAdvance } from './entity/user-advance.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { Follow } from './entity/follow.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { NotificationType } from '../notifications/notification.entity';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAdvance)
    private userAdvanceRepo: Repository<UserAdvance>,
    @InjectRepository(Follow)
    private followRepo: Repository<Follow>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly cacheService: CacheService,
  ) { }
  async create(dto: CreateUserDto): Promise<User> {
    return await this.dataSource.transaction(async (manager) => {
      const hash = await hashPassword(dto.password);
      dto.password = hash;

      const user = manager.create(User, dto);
      await manager.save(user);

      const userAdvance = manager.create(UserAdvance);
      userAdvance.user = user;
      await manager.save(userAdvance);

      return user;
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }
  async findOneByUuid(uuid: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ uuid });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async findOneWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // explicit select password
      .where('user.email = :email', { email })
      .getOne();
  }
  async update(userId: number, dto: UpdateUserDto) {
    // Nếu có name thì update bảng users trước
    if (dto.name) {
      await this.usersRepository.update(userId, { name: dto.name });
    }

    // lấy userAdvance theo user_id
    const userAdvance = await this.userAdvanceRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!userAdvance) return null;

    // chỉ update field nào có truyền vào (bỏ name vì đã update riêng)
    const { name: _name, ...rest } = dto;
    Object.assign(userAdvance, rest);
    await this.userAdvanceRepo.save(userAdvance);

    // ❌ Invalidate toàn bộ cache liên quan đến user sau khi update
    await this.cacheService.deleteByPattern(`keyv:user:${userId}:*`);

    // Tải lại profile đầy đủ (sẽ set lại cache mới)
    return this.profile(userId);
  }

  async remove(uuid: string): Promise<void> {
    await this.usersRepository.update({ uuid }, { isActive: false });
  }

  async profile(userId: number): Promise<UserAdvance> {
    const cacheKey = CACHE_KEYS.profile(userId);

    // ✅ Cache Hit: trả về ngay từ Redis
    const cached = await this.cacheService.get(cacheKey) as UserAdvance | undefined;
    if (cached) return cached;

    // ❌ Cache Miss: query DB
    const user = await this.userAdvanceRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Lưu vào cache với TTL 30m
    await this.cacheService.set(cacheKey, user, CACHE_TTL.PROFILE);

    return user;
  }

  /** Thống kê hoạt động của user: số bài viết, lượt xem, bình luận, ngày tham gia */
  async getStats(userId: number) {
    const cacheKey = CACHE_KEYS.stats(userId);

    // ✅ Cache Hit
    const cached = await this.cacheService.get(cacheKey) as Awaited<ReturnType<UsersService['getStats']>> | undefined;
    if (cached) return cached;

    // ❌ Cache Miss: tính toán từ DB
    const manager = this.usersRepository.manager;

    const [blogStats] = await manager.query(
      `SELECT COUNT(*) as totalPosts, COALESCE(SUM(views), 0) as totalViews
       FROM blogs WHERE authorId = ? AND status != 'Delete'`,
      [userId]
    );

    const [commentStats] = await manager.query(
      `SELECT COUNT(*) as totalComments FROM comments WHERE userId = ? AND isActive = 1`,
      [userId]
    );

    const followerCount = await this.followRepo.count({ where: { followingId: userId } });
    const followingCount = await this.followRepo.count({ where: { followerId: userId } });

    const user = await this.usersRepository.findOneBy({ id: userId });

    const stats = {
      totalPosts: Number(blogStats?.totalPosts ?? 0),
      totalViews: Number(blogStats?.totalViews ?? 0),
      totalComments: Number(commentStats?.totalComments ?? 0),
      followerCount,
      followingCount,
      joinedAt: user?.createdAt ?? null,
    };

    // Lưu vào cache với TTL 10m
    await this.cacheService.set(cacheKey, stats, CACHE_TTL.STATS);

    return stats;
  }

  async toggleFollow(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new BadRequestException('Bạn không thể follow chính mình');
    }

    const followingUser = await this.usersRepository.findOneBy({ id: followingId });
    if (!followingUser) throw new NotFoundException('Người dùng không tồn tại');

    const exist = await this.followRepo.findOneBy({ followerId, followingId });

    if (exist) {
      await this.followRepo.remove(exist);
      return { followed: false, message: 'Đã bỏ theo dõi' };
    }

    const follow = this.followRepo.create({ followerId, followingId });
    await this.followRepo.save(follow);

    // Gửi thông báo
    const notification = await this.notificationService.createNotification({
      recipientId: followingId,
      senderId: followerId,
      type: NotificationType.FOLLOW,
      targetId: followerId, // ID của người follow
      content: `đã bắt đầu theo dõi bạn`,
    });

    if (notification) {
      this.notificationGateway.sendNotificationToUser(followingId, notification);
    }

    return { followed: true, message: 'Đã theo dõi' };
  }

  async getFollowers(userId: number) {
    return this.followRepo.find({
      where: { followingId: userId },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
    });
  }

  async getFollowing(userId: number) {
    return this.followRepo.find({
      where: { followerId: userId },
      relations: ['following'],
      order: { createdAt: 'DESC' },
    });
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const exist = await this.followRepo.findOneBy({ followerId, followingId });
    return !!exist;
  }

  /** Lưu mã OTP và thời gian hết hạn vào DB */
  async saveVerificationCode(userId: number, code: string): Promise<void> {
    await this.usersRepository.update(userId, {
      verificationCode: code,
      isVerified: false,
    });
  }

  /** Xác thực OTP — trả về user nếu đúng, throw nếu sai */
  async verifyCode(email: string, code: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) throw new NotFoundException('User không tồn tại');
    if (user.isVerified) throw new BadRequestException('Tài khoản đã được xác thực rồi');
    if (user.verificationCode !== code) {
      throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    }

    // Kích hoạt tài khoản
    await this.usersRepository.update(user.id, {
      isVerified: true,
      verificationCode: '',
    });

    user.isVerified = true;
    return user;
  }

  /** Tìm user theo email (public, không lấy password) */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }
}
