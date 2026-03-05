import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/users/entity/user.entity';
import { UsersModule } from './modules/users/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { CacheModule } from './modules/cache/cache.module';
import { CacheService } from './modules/cache/cache.service';
import { UserAdvance } from './modules/users/entity/user-advance.entity';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Blog } from './modules/blog/entity/blog.entity';
import { Category } from './modules/blog/entity/category.entity';
import { SavePost } from './modules/blog/entity/save-post.entity';
import { Tag } from './modules/blog/entity/tag.entity';
import { CommentLike } from './modules/comments/comment-like.entity';
import { Comment } from './modules/comments/comment.entity';
import { CommentModule } from './modules/comments/comment.module';
import { FilesModule } from './modules/files/files.module';
import { AppDataSource } from './db/data-source';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { UserContextService } from './common/services/user-context.service';
import { AuditSubscriber } from './common/subscribers/audit.subscriber';
import { VerifiedGuard } from './common/guards/verified.guard';

import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    CacheModule,
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource,
      type: 'mysql',
      synchronize: true,
      entities: [
        User,
        UserAdvance,
        Blog,
        Tag,
        Category,
        SavePost,
        Comment,
        CommentLike,
      ],
      subscribers: [AuditSubscriber],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/static',
    }),

    UsersModule,
    AuthModule,
    BlogModule,
    CommentModule,
    FilesModule,
    AdminModule,
  ],
  providers: [
    UserContextService,
    AuditSubscriber,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: VerifiedGuard,
    },
  ],
})
export class AppModule { }
