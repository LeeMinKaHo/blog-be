import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "./comment.entity";
import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { CommentLike } from "./comment-like.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Comment , CommentLike])],
    providers: [CommentService],
    controllers: [CommentController],
})
export class CommentModule {}