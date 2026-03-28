import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('follows')
@Unique(['followerId', 'followingId'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  followerId: number; // Người đi follow

  @Column()
  followingId: number; // Người được follow

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'followerId' })
  follower: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'followingId' })
  following: User;
}
