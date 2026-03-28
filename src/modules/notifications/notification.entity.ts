import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/entity/user.entity';

export enum NotificationType {
  LIKE_POST = 'LIKE_POST',
  LIKE_COMMENT = 'LIKE_COMMENT',
  COMMENT_POST = 'COMMENT_POST',
  FOLLOW = 'FOLLOW',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  recipientId: number; // Người nhận thông báo

  @Column()
  senderId: number; // Người thực hiện hành động (người like)

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  targetId: number; // ID của post hoặc comment

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;
}
