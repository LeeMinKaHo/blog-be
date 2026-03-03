import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentLike } from './comment-like.entity';
@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly likeRepo: Repository<CommentLike>,
  ) {}

  /** =====================================
   *  Helpers
   ======================================*/

  private async mustFindComment(id: number) {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private checkPermission(comment: Comment, userId: number) {
    if (comment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this comment',
      );
    }
  }

  private async validateParent(parentId?: number) {
    if (!parentId) return null;

    const parent = await this.commentRepo.findOneBy({ id: parentId });

    if (!parent) {
      throw new NotFoundException('Parent comment not found');
    }

    if (parent.parentId) {
      throw new BadRequestException('Cannot reply to a reply comment');
    }

    return parentId;
  }

  /** =====================================
   *  CRUD
   ======================================*/

  findAll() {
    return this.commentRepo.find();
  }

  findOne(id: number) {
    return this.commentRepo.findOneBy({ id });
  }

  /** CREATE */
  async create(userId: number, dto: CreateCommentDto) {
    const parentId = await this.validateParent(dto.parentId);

    const result = await this.commentRepo.insert({
      content: dto.content,
      postId: dto.postId,
      userId,
      parentId,
    });

    return this.findOne(result.identifiers[0].id);
  }

  /** UPDATE */
  async update(userId: number, id: number, dto: UpdateCommentDto) {
    const comment = await this.mustFindComment(id);

    this.checkPermission(comment, userId);

    if ('parentId' in dto) {
      throw new BadRequestException('Cannot change parentId of a comment');
    }

    await this.commentRepo.update(id, {
      content: dto.content,
      isActive: dto.isActive ?? comment.isActive,
    });

    return this.findOne(id);
  }

  /** DELETE (soft delete) */
  async delete(userId: number, id: number) {
    const comment = await this.mustFindComment(id);

    this.checkPermission(comment, userId);

    await this.commentRepo.update(id, { isActive: false });

    return { message: 'Comment deleted successfully' };
  }
  async findByPost(postId: number) {
    return this.commentRepo.find({
      where: { postId },
      relations: {
        user: true,
      },
    });
  }
  async findReplies(commentId: number) {
    return this.commentRepo.find({
      where: { parentId: commentId },
      relations: { user: true },
    });
  }
  async findByUser(userId: number) {
    return this.commentRepo.find({
      where: { userId },
    });
  }
  async toggleLike(userId: number, commentId: number) {
    const comment = await this.mustFindComment(commentId);

    const existed = await this.likeRepo.findOne({
      where: { userId, commentId },
    });

    if (existed) {
      await this.likeRepo.remove(existed);

      const newTotal = Math.max(0, comment.totalLike - 1);

      await this.commentRepo.update({ id: commentId }, { totalLike: newTotal });

      return {
        liked: false,
        totalLike: newTotal,
      };
    }

    await this.likeRepo.save(this.likeRepo.create({ userId, commentId }));

    const newTotal = comment.totalLike + 1;

    await this.commentRepo.update({ id: commentId }, { totalLike: newTotal });

    return {
      liked: true,
      totalLike: newTotal,
    };
  }

  async unlikeComment(userId: number, commentId: number) {
    const existing = await this.likeRepo.findOne({
      where: { userId, commentId },
    });

    if (!existing) {
      throw new BadRequestException('You have not liked this comment');
    }

    await this.likeRepo.delete({ id: existing.id });
    await this.commentRepo.decrement({ id: commentId }, 'likesCount', 1);

    return { message: 'Unliked' };
  }
}
