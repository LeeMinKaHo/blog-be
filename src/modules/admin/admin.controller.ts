import {
    Controller, Get, Param, Patch, Delete, Query, Body,
    ParseIntPipe
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from '../users/entity/user.entity';
import { AdminService } from './admin.service';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@SkipThrottle()
@Controller('admin')
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /** GET /admin/stats — Tổng quan số liệu hệ thống */
    @Get('stats')
    @ApiOperation({ summary: 'Thống kê hệ thống', description: 'Tổng quan: tổng users, tổng blogs, tổng comments, tổng views. Yêu cầu quyền Admin/Moderator.' })
    @ApiResponse({ status: 200, description: 'Số liệu thống kê hệ thống.' })
    @ApiResponse({ status: 403, description: 'Không đủ quyền hạn.' })
    getStats() {
        return this.adminService.getSystemStats();
    }

    /** GET /admin/blogs — Danh sách tất cả blogs (có phân trang + tìm kiếm) */
    @Get('blogs')
    @ApiOperation({ summary: 'Quản lý bài viết', description: 'Lấy danh sách tất cả bài viết (bao gồm Draft, Deleted) với phân trang, tìm kiếm, và lọc theo status.' })
    @ApiQuery({ name: 'page', required: false, example: 1, description: 'Số trang' })
    @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Số bài viết mỗi trang' })
    @ApiQuery({ name: 'search', required: false, description: 'Từ khóa tìm kiếm trong tiêu đề' })
    @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái (Draft, Pushlish, Delete)', enum: ['Draft', 'Pushlish', 'Delete'] })
    @ApiResponse({ status: 200, description: 'Danh sách bài viết (phân trang).' })
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
    @ApiOperation({ summary: 'Chi tiết bài viết (Admin)', description: 'Xem chi tiết bài viết bao gồm metadata ẩn.' })
    @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
    @ApiResponse({ status: 200, description: 'Chi tiết bài viết.' })
    @ApiResponse({ status: 404, description: 'Bài viết không tồn tại.' })
    getBlog(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getBlogById(id);
    }

    /** PATCH /admin/blogs/:id/status — Đổi trạng thái bài viết */
    @Patch('blogs/:id/status')
    @ApiOperation({ summary: 'Đổi trạng thái bài viết', description: 'Thay đổi status: Draft → Pushlish, Pushlish → Delete, v.v.' })
    @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
    @ApiBody({
        description: 'Trạng thái mới',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['Draft', 'Pushlish', 'Delete'], example: 'Pushlish' },
            },
            required: ['status'],
        },
    })
    @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật.' })
    updateBlogStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { status: string },
    ) {
        return this.adminService.updateBlogStatus(id, body.status);
    }

    /** DELETE /admin/blogs/:id — Xóa bài viết */
    @Delete('blogs/:id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Xóa bài viết (Admin only)', description: 'Xóa vĩnh viễn bài viết. Chỉ Admin mới có quyền.' })
    @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
    @ApiResponse({ status: 200, description: 'Bài viết đã bị xóa.' })
    @ApiResponse({ status: 403, description: 'Chỉ Admin mới có quyền xóa.' })
    deleteBlog(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.deleteBlog(id);
    }

    /** GET /admin/users — Danh sách người dùng */
    @Get('users')
    @ApiOperation({ summary: 'Quản lý người dùng', description: 'Lấy danh sách users với phân trang, tìm kiếm theo tên/email, và lọc theo role.' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên hoặc email' })
    @ApiQuery({ name: 'role', required: false, description: 'Lọc theo role', enum: ['User', 'Admin', 'Moderator'] })
    @ApiResponse({ status: 200, description: 'Danh sách users (phân trang).' })
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
    @ApiOperation({ summary: 'Đổi role người dùng (Admin only)', description: 'Thay đổi quyền hạn: User ↔ Moderator ↔ Admin.' })
    @ApiParam({ name: 'id', description: 'ID user', example: 1 })
    @ApiBody({
        description: 'Role mới',
        schema: {
            type: 'object',
            properties: {
                role: { type: 'string', enum: ['User', 'Admin', 'Moderator'], example: 'Moderator' },
            },
            required: ['role'],
        },
    })
    @ApiResponse({ status: 200, description: 'Role đã được cập nhật.' })
    updateUserRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { role: UserRole },
    ) {
        return this.adminService.updateUserRole(id, body.role);
    }

    /** PATCH /admin/users/:id/ban — Ban/Unban user */
    @Patch('users/:id/ban')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Ban / Unban user (Toggle)', description: 'Nếu đang active → ban, nếu đang bị ban → unban. Chỉ Admin.' })
    @ApiParam({ name: 'id', description: 'ID user cần ban/unban', example: 2 })
    @ApiResponse({ status: 200, description: 'Toggle ban/unban thành công.' })
    toggleBanUser(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.toggleBanUser(id);
    }
}
