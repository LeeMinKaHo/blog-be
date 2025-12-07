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
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from '../users/entity/user.entity';
import { BlogsService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationQueryDto } from 'src/common/helper/pagination/pagination.dto';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}
  @Get('seen-blogs')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  getSeenPosts(
    @User('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogsService.getSeenBlogs(userId, page, limit);
  }
  @Post('seen-blog')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR)
  addSeenPost(@User('sub') userId: number, @Body('postId') postId: number) {
    return this.blogsService.addSeenBlog(userId, postId);
  }
  // Lưu bài blog
  @Post('saved-blog')
  saveBlog(@User('sub') userId: number, @Body('postId') postId: number) {
    return this.blogsService.saveBlog(userId, postId);
  }

  // Lấy danh sách blog đã lưu (có phân trang)
  @Get('saved-blogs')
  getSavedBlogs(
    @User('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.blogsService.getSavedBlogs(userId, page, limit);
  }
  @Post('')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  create(@User('sub') authorId: string, @Body() createBlogDto: CreateBlogDto) {
    return this.blogsService.create(+authorId, createBlogDto);
  }
  @Public()
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.blogsService.findAll(search, pagination);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.blogsService.findOne(+id);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogsService.update(+id, updateBlogDto);
  }
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.blogsService.delete(+id);
  }
}
