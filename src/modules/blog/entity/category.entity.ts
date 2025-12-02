import {
  Column,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Blog } from './blog.entity';


@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 125 })
  name: string;

  // 1 category -> nhiều blogs
  @OneToMany(() => Blog, (blog) => blog.category)
  blogs: Blog[];
}
