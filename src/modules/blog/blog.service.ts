import { Injectable, NotFoundException } from '@nestjs/common';
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


@Injectable()
export class BlogsService {
  constructor(
    private cacheService: CacheService,
    private dataSource: DataSource,
    private blogRepo: BlogRepository,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
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
        createBlogDto.descrtiption,
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
      // KHÔNG throw lỗi, không làm ảnh hưởng flow
    }

    // 3) Trả về blog bình thường
    return blog;
  }
  async findAll(search?: string, categoryId?: number, pagination?: PaginationQueryDto) {
    const { page = 1, limit = 10 } = pagination ?? {};

    const query = this.blogRepo.repo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.createdBy', 'createdBy')
      .leftJoinAndSelect('blog.updatedBy', 'updatedBy');

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

  async getCategories() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Blog> {
    const cacheKey = `blog_${id}`;

    // 1️⃣ Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as Blog;
    }

    // 2️⃣ Nếu không có cache → query DB
    const blog = await this.blogRepo.findOne(id, { category: true });

    // 3️⃣ Cache kết quả (không block nếu cache fail)
    try {
      await this.cacheService.set(cacheKey, blog, 3600); // TTL 1 giờ
    } catch (err) {
      console.error('⚠ Cache set failed:', err);
    }

    // 4️⃣ Trả về blog
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
  async update(id: number, updateBlogDto: Partial<Blog>): Promise<Blog> {
    const blog = await this.blogRepo.findOne(id);

    Object.assign(blog, updateBlogDto);

    await this.dataSource.transaction(async (manager) => {
      // Lưu vào Database
      await manager.getRepository(Blog).save(blog);

      // Lưu vào Cache - Nếu fail sẽ throw error và Rollback transaction
      await this.cacheService.set(`blog_${id}`, blog, 3600);
    });

    return blog;
  }
  async getStats() {
    const blogs = await this.blogRepo.repo.find({
      select: ['id', 'title'],
    });
    return blogs;
  }

  // async search(keyword: string, page = 1, limit = 10) {
  //   return this.blogRepo
  //     .createQueryBuilder('blog')
  //     .leftJoin('blog.tags', 'tag')
  //     .where('blog.title LIKE :keyword OR tag.name LIKE :keyword', {
  //       keyword: `%${keyword}%`,
  //     })
  //     .distinct(true)
  //     .skip((page - 1) * limit)
  //     .take(limit)
  //     .getMany();
  // }
}
