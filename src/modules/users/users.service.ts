import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from './user.helper';
import { transactionDb } from 'src/db/transaction.db';
import { UserAdvance } from './entity/user-advance.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAdvance)
    private userAdvanceRepo: Repository<UserAdvance>,
  ) {}
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
    // lấy userAdvance theo user_id
    const userAdvance = await this.userAdvanceRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!userAdvance) return null;

    // chỉ update field nào có truyền vào
    Object.assign(userAdvance, dto);
    const { user } = await this.userAdvanceRepo.save(userAdvance);
    // trả về bản đã update
    return user;
  }

  async remove(uuid: string): Promise<void> {
    await this.usersRepository.update({ uuid }, { isActive: false });
  }
  async profile(userId: number): Promise<UserAdvance> {
    const user = await this.userAdvanceRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
