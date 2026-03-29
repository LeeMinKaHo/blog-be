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
        try {
            const manager = this.dataSource.manager;

            // 1. Stats cơ bản
            const blogsResult = await manager.query(
                `SELECT COUNT(*) as total,
                  SUM(CASE WHEN status = 'Pushlish' THEN 1 ELSE 0 END) as published,
                  SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as drafts,
                  COALESCE(SUM(views), 0) as totalViews
                FROM blogs WHERE status != 'Delete'`
            );
            const blogs = blogsResult[0];

            const usersResult = await manager.query(
                `SELECT COUNT(*) as total,
                  SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
                  SUM(CASE WHEN isVerified = 0 THEN 1 ELSE 0 END) as unverified,
                  SUM(CASE WHEN role = 'Admin' THEN 1 ELSE 0 END) as admins
                FROM users`
            );
            const users = usersResult[0];

            const commentsResult = await manager.query(
                `SELECT COUNT(*) as total FROM comments WHERE isActive = 1`
            );
            const comments = commentsResult[0];

            const recentBlogsResult = await manager.query(
                `SELECT COUNT(*) as count FROM blogs WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
            );
            const recentBlogs = recentBlogsResult[0];

            const recentUsersResult = await manager.query(
                `SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
            );
            const recentUsers = recentUsersResult[0];

            // 2. Dữ liệu biểu đồ (14 ngày qua)
            const userGrowth = await manager.query(
                `SELECT DATE_FORMAT(createdAt, '%d/%m') as date, COUNT(*) as count 
                 FROM users 
                 WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY) 
                 GROUP BY date 
                 ORDER BY MIN(createdAt) ASC`
            );

            const blogGrowth = await manager.query(
                `SELECT DATE_FORMAT(createdAt, '%d/%m') as date, COUNT(*) as count 
                 FROM blogs 
                 WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND status != 'Delete'
                 GROUP BY date 
                 ORDER BY MIN(createdAt) ASC`
            );

            // 3. Phân bổ category
            const categoryStats = await manager.query(
                `SELECT c.name, COUNT(b.id) as count 
                 FROM categories c 
                 LEFT JOIN blogs b ON c.id = b.categoryId AND b.status != 'Delete'
                 GROUP BY c.id 
                 ORDER BY count DESC 
                 LIMIT 5`
            );

            // 4. Top bài viết xem nhiều
            const topBlogs = await manager.query(
                `SELECT title, views 
                 FROM blogs 
                 WHERE status = 'Pushlish' 
                 ORDER BY views DESC 
                 LIMIT 5`
            );

            return {
                blogs: {
                    total: Number(blogs?.total || 0),
                    published: Number(blogs?.published || 0),
                    drafts: Number(blogs?.drafts || 0),
                    totalViews: Number(blogs?.totalViews || 0),
                    recentWeek: Number(recentBlogs?.count || 0),
                },
                users: {
                    total: Number(users?.total || 0),
                    active: Number(users?.active || 0),
                    unverified: Number(users?.unverified || 0),
                    admins: Number(users?.admins || 0),
                    recentWeek: Number(recentUsers?.count || 0),
                },
                comments: {
                    total: Number(comments?.total || 0),
                },
                charts: {
                    userGrowth: (userGrowth || []).map(i => ({ date: i.date, count: Number(i.count) })),
                    blogGrowth: (blogGrowth || []).map(i => ({ date: i.date, count: Number(i.count) })),
                    categoryStats: (categoryStats || []).map(i => ({ name: i.name, value: Number(i.count) })),
                    topBlogs: (topBlogs || []).map(i => ({ title: (i.title || '').substring(0, 20) + '...', views: Number(i.views) })),
                }
            };
        } catch (error) {
            console.error("DEBUG - getSystemStats error:", error);
            throw error;
        }
    }

    /** Lấy tất cả blogs với filter + pagination */
    async getAllBlogs(opts: { page: number; limit: number; search?: string; status?: string }) {
        const { page, limit, search, status } = opts;
        const skip = (page - 1) * limit;

        const qb = this.blogRepo
            .createQueryBuilder('blog')
            .leftJoinAndSelect('blog.author', 'author')
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
            relations: ['author', 'category'],
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
