import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like } from 'typeorm';
import { Blog, BlogStatus } from '../blog/entity/blog.entity';
import { User, UserRole } from '../users/entity/user.entity';
import { Comment } from '../comments/comment.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Blog) private blogRepo: Repository<Blog>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Comment) private commentRepo: Repository<Comment>,
        private dataSource: DataSource,
    ) { }

    /** Tổng quan số liệu hệ thống */
    async getSystemStats() {
        const manager = this.dataSource.manager;

        const [blogs] = await manager.query(
            `SELECT COUNT(*) as total,
              SUM(status = 'Pushlish') as published,
              SUM(status = 'Draft') as drafts,
              COALESCE(SUM(views), 0) as totalViews
       FROM blogs WHERE status != 'Delete'`
        );

        const [users] = await manager.query(
            `SELECT COUNT(*) as total,
              SUM(isActive = 1) as active,
              SUM(isVerified = 0) as unverified,
              SUM(role = 'Admin') as admins
       FROM users`
        );

        const [comments] = await manager.query(
            `SELECT COUNT(*) as total FROM comments WHERE isActive = 1`
        );

        // Bài viết mới nhất (trong 7 ngày)
        const [recentBlogs] = await manager.query(
            `SELECT COUNT(*) as count FROM blogs WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        // User mới nhất (trong 7 ngày)
        const [recentUsers] = await manager.query(
            `SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        return {
            blogs: {
                total: Number(blogs.total),
                published: Number(blogs.published),
                drafts: Number(blogs.drafts),
                totalViews: Number(blogs.totalViews),
                recentWeek: Number(recentBlogs.count),
            },
            users: {
                total: Number(users.total),
                active: Number(users.active),
                unverified: Number(users.unverified),
                admins: Number(users.admins),
                recentWeek: Number(recentUsers.count),
            },
            comments: {
                total: Number(comments.total),
            },
        };
    }

    /** Lấy tất cả blogs với filter + pagination */
    async getAllBlogs(opts: { page: number; limit: number; search?: string; status?: string }) {
        const { page, limit, search, status } = opts;
        const skip = (page - 1) * limit;

        const qb = this.blogRepo
            .createQueryBuilder('blog')
            .leftJoinAndSelect('blog.createdBy', 'author')
            .leftJoinAndSelect('blog.category', 'category')
            .where('blog.status != :del', { del: BlogStatus.DELETE })
            .orderBy('blog.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (search) {
            qb.andWhere('blog.title LIKE :search', { search: `%${search}%` });
        }
        if (status && status !== 'all') {
            qb.andWhere('blog.status = :status', { status });
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getBlogById(id: number) {
        const blog = await this.blogRepo.findOne({
            where: { id },
            relations: ['createdBy', 'category'],
        });
        if (!blog) throw new NotFoundException('Blog not found');
        return blog;
    }

    /** Đổi status bài viết (Admin có thể publish/draft/delete) */
    async updateBlogStatus(id: number, status: string) {
        const blog = await this.getBlogById(id);
        await this.blogRepo.update(id, { status: status as BlogStatus });
        return { ...blog, status };
    }

    /** Xóa hẳn bài viết (soft delete bằng status = Delete) */
    async deleteBlog(id: number) {
        await this.getBlogById(id);
        await this.blogRepo.update(id, { status: BlogStatus.DELETE });
        return { message: 'Đã xóa bài viết' };
    }

    /** Lấy danh sách user với filter + pagination */
    async getAllUsers(opts: { page: number; limit: number; search?: string; role?: string }) {
        const { page, limit, search, role } = opts;
        const skip = (page - 1) * limit;

        const qb = this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.userAdvance', 'advance')
            .orderBy('user.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (search) {
            qb.andWhere('(user.name LIKE :s OR user.email LIKE :s)', { s: `%${search}%` });
        }
        if (role && role !== 'all') {
            qb.andWhere('user.role = :role', { role });
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /** Đổi role của user */
    async updateUserRole(id: number, role: UserRole) {
        const user = await this.userRepo.findOneBy({ id });
        if (!user) throw new NotFoundException('User not found');
        await this.userRepo.update(id, { role });
        return { ...user, role };
    }

    /** Ban hoặc unban user (toggle isActive) */
    async toggleBanUser(id: number) {
        const user = await this.userRepo.findOneBy({ id });
        if (!user) throw new NotFoundException('User not found');
        const newStatus = !user.isActive;
        await this.userRepo.update(id, { isActive: newStatus });
        return { id, isActive: newStatus, message: newStatus ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' };
    }
}
