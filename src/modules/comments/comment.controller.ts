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

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  // GET /comments/seed
  @Public()
  @Get('seed')
  seed() {
    return this.commentService.seedData();
  }

  // GET /comments
  @Public()
  @Get()

  findAll() {
    return this.commentService.findAll();
  }

  // POST /comments
  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: CreateCommentDto) {

    return this.commentService.create(userId, dto);
  }
  @Post(':id/like')
  like(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.commentService.toggleLike(userId, id);
  }
  // GET /comments/:id/replies
  @Public()
  @Get(':id/replies')
  findReplies(@Param('id') id: number) {
    return this.commentService.findReplies(id);
  }

  // GET /comments/user/me
  @Get('user/me')
  findByUser(@CurrentUser('sub') userId: number) {
    return this.commentService.findByUser(userId);
  }
  @Public()
  @Get('post')
  findByPost(@Query('postId') postId: number) {

    return this.commentService.findByPost(postId);
  }

  // PATCH /comments/:id
  @Patch(':id')
  update(
    @CurrentUser('sub') userId: number,
    @Param('id') id: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(userId, id, dto);
  }

  // DELETE /comments/:id
  @Delete(':id')
  delete(@CurrentUser('sub') userId: number, @Param('id') id: number) {
    return this.commentService.delete(userId, id);
  }
}
