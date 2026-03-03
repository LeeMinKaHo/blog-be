import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { Blog } from './entity/blog.entity';
import { SavePost } from './entity/save-post.entity';
import { BlogRepository } from './blog.repository';
import { paginate } from 'src/common/helper/pagination/pagination';

@Injectable()
export class BlogInteractionService {
    constructor(
        @InjectRepository(SavePost)
        private readonly savePostRepo: Repository<SavePost>,
        private readonly cacheService: CacheService,
        private readonly blogRepo: BlogRepository,
    ) { }

    async findByIds(ids: number[]): Promise<Blog[]> {
        if (!ids || !ids.length) return [];

        const posts = await this.blogRepo.repo.find({
            where: { id: In(ids) },
        });

        // Giữ đúng thứ tự như mảng input
        const map = new Map(posts.map((p) => [p.id, p]));

        return ids.map((id) => map.get(id)).filter(Boolean) as Blog[];
    }

    async addSeenBlog(userId: number, postId: number) {
        const key = `seen_posts:${userId}`;
        let list = await this.cacheService.get(key);

        if (!Array.isArray(list) || list === null) list = [];

        // Nếu đã có rồi thì remove rồi thêm lên đầu
        list = list.filter((id) => id !== postId);

        // Add vào đầu
        list.unshift(postId);

        // Giới hạn size (ví dụ 500 bài)
        list = list.slice(0, 500);

        // TTL 30 ngày
        await this.cacheService.set(key, list, 30 * 24 * 60 * 60);
    }

    async getSeenBlog(userId: number, page: number = 1, limit: number = 10) {
        const key = `seen_posts:${userId}`;
        const list = (await this.cacheService.get(key)) || [];

        const total = (list as number[]).length;
        const start = (page - 1) * limit;
        const end = start + limit;

        const ids = (list as number[]).slice(start, end);

        return {
            data: await this.findByIds(ids),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async addSavedBlog(userId: number, postId: number) {
        const blog = await this.blogRepo.repo.findOneBy({ id: postId });

        if (!blog) throw new NotFoundException('Blog not found');

        // Kiểm tra đã lưu chưa
        const exist = await this.savePostRepo.findOneBy({ userId, postId });
        if (exist) return exist;

        const savePost = this.savePostRepo.create({ userId, postId });
        return await this.savePostRepo.save(savePost);
    }

    async getSavedBlog(userId: number, page: number = 1, limit: number = 10) {
        const query = this.savePostRepo.createQueryBuilder('savePost')
            .leftJoinAndSelect('savePost.blog', 'blog')
            .where('savePost.userId = :userId', { userId })
            .orderBy('savePost.createdAt', 'DESC');

        return paginate(query, page, limit);
    }
}
