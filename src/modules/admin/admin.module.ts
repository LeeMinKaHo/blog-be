import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blog } from '../blog/entity/blog.entity';
import { User } from '../users/entity/user.entity';
import { Comment } from '../comments/comment.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
    imports: [TypeOrmModule.forFeature([Blog, User, Comment])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
