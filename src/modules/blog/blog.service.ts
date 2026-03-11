import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

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

  /** Lấy danh sách bài viết của chính user đăng nhập (cả 3 trạng thái: DRAFT, PUSHLISH, DELETE) */
  async findMyBlogs(authorId: number, pagination?: PaginationQueryDto) {
    const { page = 1, limit = 10 } = pagination ?? {};

    const query = this.blogRepo.repo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
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

      return { views: blog.views };
    });
  }
}
