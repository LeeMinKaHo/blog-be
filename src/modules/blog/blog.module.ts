
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogsController } from './blog.controller';
import { BlogsService } from './blog.service';

import { Category } from './entity/category.entity';
import { Tag } from './entity/tag.entity';
import { CacheModule } from '../cache/cache.module';
import { Blog } from './entity/blog.entity';
import { SavePost } from './entity/save-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blog, Category, Tag , SavePost]), CacheModule],
  providers: [BlogsService],
  controllers: [BlogsController],
})
export class BlogModule {}
