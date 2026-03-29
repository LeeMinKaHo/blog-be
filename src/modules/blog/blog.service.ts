import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { CreateBlogDto } from './dto/create-blog.dto';

import { Tag } from './entity/tag.entity';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Blog, BlogStatus } from './entity/blog.entity';
import { paginate } from 'src/common/helper/pagination/pagination';
import { PaginationQueryDto } from 'src/common/helper/pagination/pagination.dto';
import { Category } from './entity/category.entity';
import { BlogRepository } from './blog.repository';
import { User } from '../users/entity/user.entity';
import Redis from 'ioredis';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { NotificationType } from '../notifications/notification.entity';
import { Follow } from '../users/entity/follow.entity';


@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  constructor(
    private cacheService: CacheService,
    private dataSource: DataSource,
    private blogRepo: BlogRepository,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
    @InjectRepository(Follow)
    private followRepo: Repository<Follow>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) { }

  private extractTags(description: string): string[] {
    const regex = /#([\p{L}\p{N} ]+)/gu;
    const tags: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(description)) !== null) {
      tags.push(match[1].trim());
    }

    // loại trùng + giới hạn 3 tag
    return [...new Set(tags)].slice(0, 3);
  }

  private async createOrGetTag(
    name: string,
    manager: EntityManager,
  ): Promise<Tag> {
    const tagRepo = manager.getRepository(Tag);

    let tag = await tagRepo.findOne({ where: { name } });
    if (tag) return tag;

    tag = tagRepo.create({ name });
    return tagRepo.save(tag);
  }

  async seedData() {
    try {
      // 1. Lấy user đầu tiên
      const users = await this.dataSource.query('SELECT id FROM users LIMIT 1');
      if (users.length === 0) {
        throw new NotFoundException('Cần ít nhất 1 user trong DB để seed');
      }
      const userId = users[0].id;

      // 2. Tạo categories
      const categories = ['Công nghệ', 'Đời sống', 'Du lịch', 'Ẩm thực', 'Sức khỏe'];
      for (const name of categories) {
        const existing = await this.dataSource.query('SELECT id FROM categories WHERE name = ?', [name]);
        if (existing.length === 0) {
          await this.dataSource.query('INSERT INTO categories (name) VALUES (?)', [name]);
        }
      }

      // Lấy lại list IDs category
      const catResults = await this.dataSource.query('SELECT id FROM categories');
      const catIds = catResults.map((c: any) => c.id);

      // 3. Tạo 50 blogs bằng SQL
      const titles = [
        'Tiêu điểm công nghệ 2024',
        'Cẩm nang du lịch tự túc',
        'Món ngon mỗi ngày cho gia đình',
        'Sống khỏe cùng chuyên gia',
        'Bí quyết khởi nghiệp thành công',
      ];

      for (let i = 1; i <= 50; i++) {
        const title = `${titles[i % titles.length]} - Phần ${i}`;
        const catId = catIds[i % catIds.length];
        const uuid = require('uuid').v4();

        await this.dataSource.query(
          `INSERT INTO blogs 
          (uuid, title, description, content, thumbnail, categoryId, authorId, status, createdBy, updatedBy, createdAt, updatedAt, active) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`,
          [
            uuid,
            title,
            `Mô tả bài viết số ${i}`,
            `Nội dung bài viết số ${i}`,
            `https://picsum.photos/seed/${i}/800/450`,
            catId,
            userId,
            'Pushlish', // BlogStatus.PUSHLISH
            userId,
            userId,
          ]
        );
      }

      return { message: 'Đã seed thành công 50 bài viết bằng RAW SQL!' };
    } catch (err: any) {
      console.error('Raw SQL Seed Error:', err);
      throw err;
    }
  }

  private async processTagsFromDescription(
    description: string,
    manager: EntityManager,
  ): Promise<Tag[]> {
    const names = this.extractTags(description);

    return Promise.all(names.map((name) => this.createOrGetTag(name, manager)));
  }
  async create(authorId: number, createBlogDto: CreateBlogDto) {
    const isCategory = await this.categoryRepo.findOne({ where: { id: createBlogDto.categoryId } });
    if (!isCategory) {
      throw new NotFoundException('Category not found');
    }
    // 1) Lưu DB bằng transaction
    const blog = await this.dataSource.transaction(async (manager) => {
      const tags = await this.processTagsFromDescription(
        createBlogDto.description,
        manager,
      );

      const blogEntity = manager.getRepository(Blog).create({
        ...createBlogDto,
        tags,
        authorId,
      });

      return manager.getRepository(Blog).save(blogEntity);
    });

    // 2) Cache thử — thất bại thì bỏ qua
    try {
      await this.cacheService.set(`blog_${blog.id}`, blog, 3600);
    } catch (err) {
      console.error('⚠ Cache failed:', err);
    }

    // 3) Nếu bài được publish → gửi thông báo cho followers (fire-and-forget)
    if (blog.status === BlogStatus.PUSHLISH) {
      this.notifyFollowers(authorId, blog, isCategory.name).catch((err) =>
        this.logger.error('⚠ notifyFollowers failed:', err),
      );
    }

    // 4) Trả về blog bình thường
    return blog;
  }

  /**
   * Gửi in-app notification (WebSocket) + email queue cho tất cả followers.
   * Chạy hoàn toàn bất đồng bộ, không block API response.
   */
  private async notifyFollowers(authorId: number, blog: Blog, categoryName: string) {
    // Lấy danh sách tất cả followers của tác giả (kèm thông tin user)
    const follows = await this.followRepo.find({
      where: { followingId: authorId },
      relations: ['follower'],
    });

    if (follows.length === 0) return;

    // Lấy thông tin tác giả
    const author = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: authorId });

    if (!author) return;

    const authorName = author.name || author.email;
    const authorInitial = (authorName[0] || 'U').toUpperCase();
    const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
    const postUrl = `${siteUrl}/blog/${blog.id}`;

    const emailJobs: Parameters<MailService['queueNewPostNotification']>[0] = [];

    for (const follow of follows) {
      const follower = follow.follower;
      if (!follower?.email) continue;

      // 1️⃣ In-app notification qua WebSocket (realtime)
      const notification = await this.notificationService.createNotification({
        recipientId: follower.id,
        senderId: authorId,
        type: NotificationType.NEW_POST,
        targetId: blog.id,
        content: `vừa đăng bài viết mới: "${blog.title}"`,
      });

      if (notification) {
        this.notificationGateway.sendNotificationToUser(follower.id, notification);
      }

      // 2️⃣ Chuẩn bị dữ liệu email job
      emailJobs.push({
        to: follower.email,
        recipientName: follower.name || follower.email,
        authorName,
        authorInitial,
        title: blog.title,
        description: blog.description ?? '',
        thumbnail: blog.thumbnail ?? undefined,
        category: categoryName,
        postUrl,
        siteUrl,
      });
    }

    // 3️⃣ Đẳy tất cả email vào queue 1 lần (bulk) - không block
    if (emailJobs.length > 0) {
      await this.mailService.queueNewPostNotification(emailJobs);
      this.logger.log(
        `📨 Đã queue ${emailJobs.length} email thông báo bài mới cho blog #${blog.id}`,
      );
    }
  }
  async findAll(search?: string, categoryId?: number, pagination?: PaginationQueryDto) {
    const { page = 1, limit = 10 } = pagination ?? {};

    const query = this.blogRepo.repo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.status = :status', { status: BlogStatus.PUSHLISH });

    if (search) {
      query.andWhere(
        '(blog.title LIKE :search OR category.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      query.andWhere('blog.categoryId = :categoryId', { categoryId });
    }

    return paginate(query, page, limit);
  }

  /** Lấy danh sách bài viết của chính user đăng nhập (cả 3 trạng thái: DRAFT, PUSHLISH, DELETE) */
  async findMyBlogs(authorId: number, pagination?: PaginationQueryDto) {
    const { page = 1, limit = 10 } = pagination ?? {};

    const query = this.blogRepo.repo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.authorId = :authorId', { authorId })
      .andWhere('blog.status != :deleted', { deleted: BlogStatus.DELETE })
      .orderBy('blog.createdAt', 'DESC');

    return paginate(query, page, limit);
  }

  async getCategories() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Blog> {
    const cacheKey = `blog_${id}`;

    // 1️⃣ Check cache
    const cached = await this.cacheService.get(cacheKey);
    let blog: Blog;

    if (cached) {
      blog = cached as Blog;
    } else {
      // 2️⃣ Nếu không có cache → query DB
      blog = await this.blogRepo.findOne(id, { category: true, author: true });

      // 3️⃣ Cache kết quả (không block nếu cache fail)
      if (blog) {
        try {
          await this.cacheService.set(cacheKey, blog, 3600); // TTL 1 giờ
        } catch (err) {
          console.error('⚠ Cache set failed:', err);
        }
      }
    }

    // 🔥 Chỉ trả về nếu status là Pushlish
    if (!blog || blog.status !== BlogStatus.PUSHLISH) {
      throw new NotFoundException(`Bài viết không tồn tại hoặc chưa được xuất bản`);
    }

    return blog;
  }

  async delete(id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const blogRepo = manager.getRepository(Blog);

      // 1️⃣ Lấy blog
      const blog = await blogRepo.findOne({ where: { id } });
      if (!blog) {
        throw new Error('Blog not found'); // hoặc NotFoundException
      }

      // 2️⃣ Update status thành DELETE
      blog.status = BlogStatus.DELETE;
      await blogRepo.save(blog);

      // 3️⃣ Xóa cache — nếu fail sẽ throw và rollback
      const cacheKey = `blog_${id}`;

      await this.cacheService.delete(cacheKey);
    });
  }
  async update(id: number, updateBlogDto: UpdateBlogDto, requesterId: number): Promise<Blog> {
    const blog = await this.blogRepo.findOne(id);

    // Chỉ chính tác giả mới được cập nhật
    if (blog.authorId && blog.authorId !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết này');
    }

    Object.assign(blog, updateBlogDto);

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Blog).save(blog);
      await this.cacheService.set(`blog_${id}`, blog, 3600);
    });

    return blog;
  }

  /**
   * Tăng lượt xem bài viết bằng pessimistic locking.
   * Sử dụng `FOR UPDATE` lock để đảm bảo chỉ 1 transaction
   * có thể đọc-và-ghi cột `views` tại một thời điểm,
   * tránh race condition khi nhiều user xem đồng thời.
   */
  async incrementViews(id: number): Promise<{ views: number }> {
    return this.dataSource.transaction(async (manager) => {
      const blogRepo = manager.getRepository(Blog);

      // 1️⃣ Khoá dòng (pessimistic_write = SELECT ... FOR UPDATE)
      const blog = await blogRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!blog) {
        throw new NotFoundException(`Blog #${id} không tồn tại`);
      }

      // 2️⃣ Tăng views
      blog.views = (blog.views ?? 0) + 1;
      await blogRepo.save(blog);

      // 3️⃣ Cập nhật cache (bỏ qua nếu fail)
      try {
        await this.cacheService.set(`blog_${id}`, blog, 3600);
      } catch { }

      // 4️⃣ Ghi nhận lượt xem vào Redis cho Trending (theo ngày)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const trendingKey = `blog:trending:${today}`;
      try {
        await this.redis.zincrby(trendingKey, 1, id.toString());
        await this.redis.expire(trendingKey, 86400 * 8); // Giữ trong 8 ngày để tính trending tuần
      } catch (err) {
        console.error('⚠ Redis trending update failed:', err);
      }

      return { views: blog.views };
    });
  }

  async getTrending(limit = 5): Promise<Blog[]> {
    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      last7Days.push(`blog:trending:${dateString}`);
    }

    const tempWeeklyKey = `blog:trending:weekly_temp:${Date.now()}`;

    try {
      // Gộp 7 ngày gần nhất thành 1 tập hợp duy nhất
      // @ts-ignore
      await this.redis.zunionstore(tempWeeklyKey, last7Days.length, ...last7Days);

      // Lấy top bài viết từ key tạm
      const topIds = await this.redis.zrevrange(tempWeeklyKey, 0, limit - 1);

      // Xóa key tạm ngay sau khi lấy ID
      await this.redis.del(tempWeeklyKey);

      if (topIds.length === 0) {
        return this.getFallbackTrending(limit);
      }

      // Query database để lấy thông tin chi tiết các bài viết này
      const blogs = await this.blogRepo.repo
        .createQueryBuilder('blog')
        .leftJoinAndSelect('blog.category', 'category')
        .leftJoinAndSelect('blog.author', 'author')
        .where('blog.id IN (:...ids)', { ids: topIds.map(id => parseInt(id)) })
        .andWhere('blog.status = :status', { status: BlogStatus.PUSHLISH })
        .getMany();

      // Sắp xếp lại danh sách blog cho đúng thứ tự trending từ Redis trả về
      return topIds
        .map(id => blogs.find(b => b.id === parseInt(id)))
        .filter((b): b is Blog => !!b);
    } catch (err) {
      console.error('⚠ Get trending failed:', err);
      return this.getFallbackTrending(limit);
    }
  }

  private async getFallbackTrending(limit: number): Promise<Blog[]> {
    // Fallback 1: Lấy bài viết có view cao nhất toàn thời gian (từ DB)
    const fallbackBlogs = await this.blogRepo.repo.find({
      where: { status: BlogStatus.PUSHLISH },
      order: { views: 'DESC' },
      take: limit,
      relations: ['category', 'author'],
    });

    // Fallback 2: Nếu DB cũng chưa có bài có view, lấy những bài mới nhất
    if (fallbackBlogs.length === 0) {
      return this.blogRepo.repo.find({
        where: { status: BlogStatus.PUSHLISH },
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['category', 'author'],
      });
    }

    return fallbackBlogs;
  }
}
