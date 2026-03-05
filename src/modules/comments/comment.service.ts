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
  ) { }

  /** =====================================
   *  Helpers
   ======================================*/

  async seedData() {
    try {
      const manager = this.commentRepo.manager;
      // Lấy active blogs
      const blogs = await manager.query(`SELECT id FROM blogs WHERE status = 'Pushlish' LIMIT 20`);
      if (!blogs.length) return { message: 'No blogs available' };

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('123456', 10);
      const uuidv4 = require('uuid').v4;

      const emailPrefix = Date.now();
      let numComments = 0;

      for (let i = 1; i <= 5; i++) {
        const email = `testuser_${emailPrefix}_${i}@example.com`;
        const uuid = uuidv4();

        const userRes = await manager.query(
          `INSERT INTO users (email, password, name, role, isVerified, isActive, createdAt, uuid) 
           VALUES (?, ?, ?, 'User', 1, 1, NOW(), ?)`,
          [email, hash, `Lyt ${i}`, uuid]
        );

        const userId = userRes.insertId;

        await manager.query(
          `INSERT INTO users_advance (user_id, avatar) VALUES (?, ?)`,
          [userId, `https://ui-avatars.com/api/?background=random&color=fff&name=Lyt+${i}`]
        );

        // Create 10 comments per user
        for (let j = 0; j < 10; j++) {
          const blog = blogs[Math.floor(Math.random() * blogs.length)];
          const content = `Comment giả định số ${j + 1} từ ${email} - Bài viết rất hay và bổ ích, cảm ơn tác giả đã chia sẻ!`;
          const randomDays = Math.floor(Math.random() * 30) + 1;

          await manager.query(
            `INSERT INTO comments (content, userId, postId, isActive, createdAt, updatedAt) 
             VALUES (?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
            [content, userId, blog.id, randomDays, randomDays]
          );
          numComments++;
        }
      }

      return { message: `Đã tạo xong 5 users với mật khẩu 123456 và ${numComments} comments!` };
    } catch (e: any) {
      console.error('Lỗi khi seedData:', e);
      return { err: e.message, stack: e.stack };
    }
  }


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

    // Trả về kèm user relation để FE hiển avatar/name ngay không cần refetch
    return this.commentRepo.findOne({
      where: { id: result.identifiers[0].id },
      relations: { user: true },
    });
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
  /** Lấy tất cả root comment của 1 bài viết (kèm user và số lượng reply) */
  async findByPost(postId: number) {
    const comments = await this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .loadRelationCountAndMap('comment.replyCount', 'comment.children', 'child', (qb) =>
        qb.where('child.isActive = :a', { a: true }),
      )
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.parentId IS NULL')
      .andWhere('comment.isActive = :active', { active: true })
      .orderBy('comment.createdAt', 'DESC')
      .getMany();

    return comments;
  }

  /** Lấy replies của 1 comment cha */
  async findReplies(commentId: number) {
    return this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.parentId = :commentId', { commentId })
      .andWhere('comment.isActive = :active', { active: true })
      .orderBy('comment.createdAt', 'ASC')
      .getMany();
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
