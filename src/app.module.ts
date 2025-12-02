import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './common/database/data-source';
import { User } from './modules/users/entity/user.entity';
import { UsersModule } from './modules/users/user.module';

import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { CacheService } from './modules/cache/cache.service';
import { UserAdvance } from './modules/users/entity/user-advance.entity';
import { BlogModule } from './modules/blog/blog.module';

import { Category } from './modules/blog/entity/category.entity';
import { Tag } from './modules/blog/entity/tag.entity';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { Blog } from './modules/blog/entity/blog.entity';
import { SavePost } from './modules/blog/entity/save-post.entity';

@Module({
  imports: [
    CacheModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...AppDataSource,
      type: 'mysql',
      entities: [User, UserAdvance, Blog, Tag, Category , SavePost],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    CacheModule,
    BlogModule,
  ],
  providers: [
    CacheService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // chạy trước
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // chạy sau
    },
  ],
})
export class AppModule {}
