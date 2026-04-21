import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorators';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { UserRole } from '../users/entity/user.entity';
import { BlogsService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationQueryDto } from 'src/common/helper/pagination/pagination.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { BlogInteractionService } from './blog-interaction.service';
import { RequireVerified } from 'src/common/decorators/require-verified.decorator';


@SkipThrottle() // Bỏ qua giới hạn tốc độ cho tất cả các route trong controller này
@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly blogInteractionService: BlogInteractionService,
  ) { }

  // ─── Interaction Endpoints ────────────────────────────────────────────────

  @ApiTags('Blog Interactions')
  @Get('seen-blogs')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Lấy danh sách bài viết đã xem' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết đã xem (phân trang).' })
  getSeenPosts(
    @CurrentUser('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogInteractionService.getSeenBlog(userId, +page, +limit);
  }

  @ApiTags('Blog Interactions')
  @Post('seen-blog')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Đánh dấu đã xem bài viết' })
  @ApiResponse({ status: 201, description: 'Đã ghi nhận lượt xem.' })
  addSeenPost(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.addSeenBlog(userId, postId);
  }

  @ApiTags('Blog Interactions')
  @Post('saved-blog')
  @ApiOperation({ summary: 'Lưu / Bỏ lưu bài viết (Toggle)', description: 'Nếu chưa lưu → lưu, nếu đã lưu → bỏ lưu.' })
  @ApiResponse({ status: 201, description: 'Toggle thành công, trả về trạng thái saved.' })
  saveBlog(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.addSavedBlog(userId, postId);
  }

  @ApiTags('Blog Interactions')
  @Post('like-blog')
  @ApiOperation({ summary: 'Like / Unlike bài viết (Toggle)', description: 'Nếu chưa like → like, nếu đã like → unlike. Trả về trạng thái liked và tổng lượt like.' })
  @ApiResponse({ status: 201, description: 'Toggle thành công.' })
  likeBlog(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.toggleLikeBlog(userId, postId);
  }

  @ApiTags('Blog Interactions')
  @Get('saved-blogs')
  @ApiOperation({ summary: 'Lấy danh sách bài viết đã lưu' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết đã lưu (phân trang).' })
  getSavedBlogs(
    @CurrentUser('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogInteractionService.getSavedBlog(userId, +page, +limit);
  }

  @ApiTags('Blog Interactions')
  @Delete('saved-blog/:postId')
  @ApiOperation({ summary: 'Xóa bài viết khỏi danh sách đã lưu' })
  @ApiParam({ name: 'postId', description: 'ID bài viết cần bỏ lưu', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã bỏ lưu bài viết.' })
  unsaveBlog(
    @CurrentUser('sub') userId: number,
    @Param('postId') postId: number,
  ) {
    return this.blogInteractionService.removeSavedBlog(userId, +postId);
  }

  // ─── Blog CRUD Endpoints ─────────────────────────────────────────────────

  @ApiTags('Blogs')
  @Post('')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Tạo bài viết mới', description: 'Yêu cầu quyền Admin hoặc Moderator.' })
  @ApiResponse({ status: 201, description: 'Bài viết đã được tạo thành công.' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn.' })
  create(@CurrentUser('sub') authorId: string, @Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.create(+authorId, createBlogDto);
  }

  @ApiTags('Blogs')
  @ApiQuery({ name: 'search', required: false, description: 'Từ khóa tìm kiếm trong tiêu đề' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Lọc theo ID danh mục' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết', description: 'Hỗ trợ phân trang, tìm kiếm theo tiêu đề, lọc theo category.' })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết (phân trang).' })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.blogsService.findAll(search, categoryId ? +categoryId : undefined, pagination);
  }

  @ApiTags('Blogs')
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách categories', description: 'Trả về tất cả danh mục bài viết để dùng cho filter và tạo bài.' })
  @ApiResponse({ status: 200, description: 'Danh sách categories.' })
  getCategories() {
    return this.blogsService.getCategories();
  }

  @ApiTags('Blogs')
  @Get('my-blogs')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Lấy bài viết của tôi', description: 'Trả về bài viết ở mọi trạng thái (Draft, Published) của user đang đăng nhập.' })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết của tôi.' })
  findMyBlogs(
    @CurrentUser('sub') userId: number,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.blogsService.findMyBlogs(+userId, pagination);
  }

  @ApiTags('Blogs')
  @Public()
  @Post(':id/view')
  @ApiOperation({ summary: 'Tăng lượt xem bài viết', description: 'Gọi khi user cuộn qua 50% nội dung bài viết.' })
  @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
  @ApiResponse({ status: 201, description: 'Lượt xem đã được cập nhật.' })
  incrementViews(@Param('id') id: string) {
    return this.blogsService.incrementViews(+id);
  }

  @ApiTags('Blogs')
  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Lấy bài viết trending', description: 'Trả về bài viết có lượt xem cao nhất, cache bằng Redis.' })
  @ApiQuery({ name: 'limit', required: false, example: 5, description: 'Số bài viết cần lấy' })
  @ApiResponse({ status: 200, description: 'Danh sách bài viết trending.' })
  getTrending(@Query('limit') limit: number = 5) {
    return this.blogsService.getTrending(+limit);
  }

  @ApiTags('Blogs')
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Lấy chi tiết bài viết', description: 'Trả về toàn bộ thông tin bài viết bao gồm content HTML, author, category.' })
  @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
  @ApiResponse({ status: 200, description: 'Chi tiết bài viết.' })
  @ApiResponse({ status: 404, description: 'Bài viết không tồn tại.' })
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(+id);
  }

  @ApiTags('Blogs')
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bài viết', description: 'Chỉ author hoặc admin mới có thể cập nhật.' })
  @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
  @ApiResponse({ status: 200, description: 'Bài viết đã được cập nhật.' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa.' })
  update(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.blogsService.update(+id, updateBlogDto, +userId);
  }

  @ApiTags('Blogs')
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa bài viết', description: 'Soft delete bài viết. Yêu cầu quyền Admin.' })
  @ApiParam({ name: 'id', description: 'ID bài viết', example: 1 })
  @ApiResponse({ status: 200, description: 'Bài viết đã bị xóa.' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn.' })
  remove(@Param('id') id: string) {
    return this.blogsService.delete(+id);
  }

  @ApiTags('Blogs')
  @Public()
  @Post('seed-data')
  @ApiOperation({ summary: 'Seed dữ liệu mẫu', description: '⚠️ Chỉ dùng cho development. Tạo bài viết mẫu.' })
  @ApiResponse({ status: 201, description: 'Seed data thành công.' })
  async seed() {
    return this.blogsService.seedData();
  }
}
