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
import { ApiQuery } from '@nestjs/swagger';
import { BlogInteractionService } from './blog-interaction.service';
import { RequireVerified } from 'src/common/decorators/require-verified.decorator';


@SkipThrottle() // Bỏ qua giới hạn tốc độ cho tất cả các route trong controller này
@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly blogInteractionService: BlogInteractionService,
  ) { }
  @Get('seen-blogs')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  getSeenPosts(
    @CurrentUser('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogInteractionService.getSeenBlog(userId, +page, +limit);
  }
  @Post('seen-blog')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  addSeenPost(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.addSeenBlog(userId, postId);
  }
  // Lưu bài blog
  @Post('saved-blog')
  saveBlog(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.addSavedBlog(userId, postId);
  }

  // Like bài blog
  @Post('like-blog')
  likeBlog(@CurrentUser('sub') userId: number, @Body('postId') postId: number) {
    return this.blogInteractionService.toggleLikeBlog(userId, postId);
  }


  // Lấy danh sách blog đã lưu (có phân trang)
  @Get('saved-blogs')
  getSavedBlogs(
    @CurrentUser('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogInteractionService.getSavedBlog(userId, +page, +limit);
  }

  // Xóa bài viết khỏi danh sách đã lưu
  @Delete('saved-blog/:postId')
  unsaveBlog(
    @CurrentUser('sub') userId: number,
    @Param('postId') postId: number,
  ) {
    return this.blogInteractionService.removeSavedBlog(userId, +postId);
  }
  @Post('')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@CurrentUser('sub') authorId: string, @Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.create(+authorId, createBlogDto);
  }

  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @Public()
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.blogsService.findAll(search, categoryId ? +categoryId : undefined, pagination);
  }

  @Public()
  @Get('categories')
  getCategories() {
    return this.blogsService.getCategories();
  }

  /** Lấy bài viết của chính tôi (các trạng thái: DRAFT, PUSHLISH) */
  @Get('my-blogs')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  findMyBlogs(
    @CurrentUser('sub') userId: number,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.blogsService.findMyBlogs(+userId, pagination);
  }

  @Public()
  @Post(':id/view')
  incrementViews(@Param('id') id: string) {
    return this.blogsService.incrementViews(+id);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @CurrentUser('sub') userId?: string) {
    return this.blogsService.findOne(+id, userId ? +userId : undefined);
  }
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.blogsService.update(+id, updateBlogDto, +userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.blogsService.delete(+id);
  }

  @Public()
  @Post('seed-data')
  async seed() {
    return this.blogsService.seedData();
  }
}
