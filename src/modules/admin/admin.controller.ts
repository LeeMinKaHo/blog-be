import {
    Controller, Get, Param, Patch, Delete, Query, Body,
    ParseIntPipe
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from '../users/entity/user.entity';
import { AdminService } from './admin.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('admin')
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /** GET /admin/stats — Tổng quan số liệu hệ thống */
    @Get('stats')
    getStats() {
        return this.adminService.getSystemStats();
    }

    /** GET /admin/blogs — Danh sách tất cả blogs (có phân trang + tìm kiếm) */
    @Get('blogs')
    getBlogs(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
        @Query('status') status?: string,
    ) {
        return this.adminService.getAllBlogs({ page: +page, limit: +limit, search, status });
    }

    /** GET /admin/blogs/:id */
    @Get('blogs/:id')
    getBlog(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getBlogById(id);
    }

    /** PATCH /admin/blogs/:id/status — Đổi trạng thái bài viết */
    @Patch('blogs/:id/status')
    updateBlogStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { status: string },
    ) {
        return this.adminService.updateBlogStatus(id, body.status);
    }

    /** DELETE /admin/blogs/:id — Xóa bài viết */
    @Delete('blogs/:id')
    @Roles(UserRole.ADMIN)
    deleteBlog(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.deleteBlog(id);
    }

    /** GET /admin/users — Danh sách người dùng */
    @Get('users')
    getUsers(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('search') search?: string,
        @Query('role') role?: string,
    ) {
        return this.adminService.getAllUsers({ page: +page, limit: +limit, search, role });
    }

    /** PATCH /admin/users/:id/role — Đổi role */
    @Patch('users/:id/role')
    @Roles(UserRole.ADMIN)
    updateUserRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { role: UserRole },
    ) {
        return this.adminService.updateUserRole(id, body.role);
    }

    /** PATCH /admin/users/:id/ban — Ban/Unban user */
    @Patch('users/:id/ban')
    @Roles(UserRole.ADMIN)
    toggleBanUser(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.toggleBanUser(id);
    }
}
