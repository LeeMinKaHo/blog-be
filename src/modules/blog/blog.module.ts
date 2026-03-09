
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogsController } from './blog.controller';
import { BlogsService } from './blog.service';

import { Category } from './entity/category.entity';
import { Tag } from './entity/tag.entity';
import { CacheModule } from '../cache/cache.module';
import { Blog } from './entity/blog.entity';
import { SavePost } from './entity/save-post.entity';
import { BlogRepository } from './blog.repository';
import { BlogInteractionService } from './blog-interaction.service';
import { BlogLike } from './entity/blog-like.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blog, Category, Tag, SavePost, BlogLike]), CacheModule],

  providers: [BlogsService, BlogRepository, BlogInteractionService],
  controllers: [BlogsController],
})

export class BlogModule { }
