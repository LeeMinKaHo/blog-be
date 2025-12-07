import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { CreateBlogDto } from './dto/create-blog.dto';

import { Tag } from './entity/tag.entity';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Blog, BlogStatus } from './entity/blog.entity';
import { SavePost } from './entity/save-post.entity';
import { paginate } from 'src/common/helper/pagination/pagination';
import { PaginationQueryDto } from 'src/common/helper/pagination/pagination.dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(SavePost)
    private readonly savePostRepo: Repository<SavePost>,
    private cacheService: CacheService,
    private dataSource: DataSource,
    @InjectRepository(Blog)
    private blogRepo: Repository<Blog>,
    @InjectRepository(Tag)
    private tagRepo: Repository<Tag>,
  ) {}

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
  async findAll(search?: string, pagination?: PaginationQueryDto) {
    const { page = 1, limit  = 10} = pagination ?? {}

    const query = this.blogRepo
      .createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category');

    if (search) {
      query.andWhere(
        '(blog.title LIKE :search OR category.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return paginate(query, page, limit);
  }

  async findOne(id: number): Promise<Blog> {
    const cacheKey = `blog_${id}`;

    // 1️⃣ Check cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as Blog;
    }

    // 2️⃣ Nếu không có cache → query DB
    const blog = await this.blogRepo.findOne({
      where: { id, status: BlogStatus.PUSHLISH },
      relations: ['tags', 'category'], // nếu cần join quan hệ
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // 3️⃣ Cache kết quả (không block nếu cache fail)
    try {
      await this.cacheService.set(cacheKey, blog, 3600); // TTL 1 giờ
    } catch (err) {
      console.error('⚠ Cache set failed:', err);
    }

    // 4️⃣ Trả về blog
    return blog;
  }
  async findByIds(ids: number[]): Promise<Blog[]> {
    if (!ids || !ids.length) return [];

    const posts = await this.blogRepo.find({
      where: { id: In(ids) },
    });

    // Giữ đúng thứ tự như mảng input
    const map = new Map(posts.map((p) => [p.id, p]));

    return ids.map((id) => map.get(id)).filter(Boolean) as Blog[];
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
  async update(id: number, updateBlogDto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.blogRepo.findOne({ where: { id } });
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }
    Object.assign(blog, updateBlogDto);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Blog).save(blog);
      await this.cacheService.set(`blog_${id}`, blog, 3600);
    });

    return blog;
  }

  async addSeenBlog(userId: number, postId: number) {
    const key = `seen_posts:${userId}`;
    let list = await this.cacheService.get(key);

    if (!Array.isArray(list)) list = [];

    // Nếu đã có rồi thì remove rồi thêm lên đầu
    list = list.filter((id) => id !== postId);

    // Add vào đầu
    list.unshift(postId);

    // Giới hạn size (ví dụ 500 bài)
    list = list.slice(0, 500);

    // TTL 30 ngày
    await this.cacheService.set(key, list, 30 * 24 * 60 * 60);
  }
  async getSeenBlogs(userId: number, page = 1, limit = 10) {
    const key = `seen_posts:${userId}`;
    const list = (await this.cacheService.get(key)) || [];

    const start = (page - 1) * limit;
    const end = start + limit;

    const ids = list.slice(start, end);

    return {
      data: await this.findByIds(ids),
      total: list.length,
      page,
      limit,
    };
  }
  async saveBlog(userId: number, postId: number) {
    const blog = await this.blogRepo.findOneBy({ id: postId });

    if (!blog) throw new NotFoundException('Blog not found');

    // Kiểm tra đã lưu chưa
    const exist = await this.savePostRepo.findOneBy({ userId, postId });
    if (exist) return exist;

    const savePost = this.savePostRepo.create({ userId, postId });
    return await this.savePostRepo.save(savePost);
  }
  async getSavedBlogs(userId: number, page = 1, limit = 10) {
    const [items, total] = await this.savePostRepo.findAndCount({
      where: { userId },
      relations: ['blog'], // join blog để lấy thông tin blog
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { items, total, page, limit };
  }
}
