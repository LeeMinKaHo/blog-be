import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UsersController } from './user.controller';
import { UsersService } from './users.service';
import { UserAdvance } from './entity/user-advance.entity';
import { Follow } from './entity/follow.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAdvance, Follow]), CacheModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
