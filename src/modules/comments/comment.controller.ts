import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  // GET /comments/seed
  @Public()
  @Get('seed')
  @ApiOperation({ summary: 'Seed dữ liệu comment mẫu', description: '⚠️ Chỉ dùng cho development.' })
  @ApiResponse({ status: 200, description: 'Seed thành công.' })
  seed() {
    return this.commentService.seedData();
  }

  // GET /comments
  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả comments' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả comments.' })
  findAll() {
    return this.commentService.findAll();
  }

  // POST /comments
  @Post()
  @ApiOperation({ summary: 'Tạo comment mới', description: 'Tạo bình luận cho bài viết. Hỗ trợ reply bằng cách truyền parentId.' })
  @ApiResponse({ status: 201, description: 'Comment đã được tạo, thông báo sẽ được gửi cho tác giả bài viết.' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập.' })
  create(@CurrentUser('sub') userId: number, @Body() dto: CreateCommentDto) {
    return this.commentService.create(userId, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like / Unlike comment (Toggle)' })
  @ApiParam({ name: 'id', description: 'ID comment', example: 1 })
  @ApiResponse({ status: 201, description: 'Toggle like comment thành công.' })
  like(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.commentService.toggleLike(userId, id);
  }

  // GET /comments/:id/replies
  @Public()
  @Get(':id/replies')
  @ApiOperation({ summary: 'Lấy danh sách replies', description: 'Lấy các comment con (reply) của một comment cha.' })
  @ApiParam({ name: 'id', description: 'ID comment cha', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách replies.' })
  findReplies(@Param('id') id: number) {
    return this.commentService.findReplies(id);
  }

  // GET /comments/user/me
  @Get('user/me')
  @ApiOperation({ summary: 'Lấy comments của tôi', description: 'Danh sách comments mà user hiện tại đã viết.' })
  @ApiResponse({ status: 200, description: 'Danh sách comments của tôi.' })
  findByUser(@CurrentUser('sub') userId: number) {
    return this.commentService.findByUser(userId);
  }

  @Public()
  @Get('post')
  @ApiOperation({ summary: 'Lấy comments theo bài viết', description: 'Lấy tất cả comments cấp 1 (top-level) của một bài viết.' })
  @ApiQuery({ name: 'postId', required: true, description: 'ID bài viết', example: 1 })
  @ApiResponse({ status: 200, description: 'Danh sách comments của bài viết.' })
  findByPost(@Query('postId') postId: number) {
    return this.commentService.findByPost(postId);
  }

  // PATCH /comments/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh sửa comment', description: 'Chỉ cho phép chỉnh sửa comment của chính mình.' })
  @ApiParam({ name: 'id', description: 'ID comment cần sửa', example: 1 })
  @ApiResponse({ status: 200, description: 'Comment đã được cập nhật.' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa comment này.' })
  update(
    @CurrentUser('sub') userId: number,
    @Param('id') id: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(userId, id, dto);
  }

  // DELETE /comments/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa comment', description: 'Xóa comment. Chỉ owner hoặc admin mới có quyền.' })
  @ApiParam({ name: 'id', description: 'ID comment cần xóa', example: 1 })
  @ApiResponse({ status: 200, description: 'Comment đã bị xóa.' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa comment này.' })
  delete(@CurrentUser('sub') userId: number, @Param('id') id: number) {
    return this.commentService.delete(userId, id);
  }
}
