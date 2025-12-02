import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';


@Entity('users_advance')
export class UserAdvance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true, type: 'date' })
  birthday: Date;

  @OneToOne(() => User, (user) => user.userAdvance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) // foreign key
  user: User;
}

