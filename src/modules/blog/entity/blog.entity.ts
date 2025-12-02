
import { User } from "../../users/entity/user.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable, BeforeInsert } from "typeorm";
import { Category } from "./category.entity";
import { Tag } from "./tag.entity";
import { v4 as uuidv4 } from 'uuid';

export enum BlogStatus {
  DRAFT = 'Draft',
  PUSHLISH = 'Pushlish',
  DELETE = 'Delete',
}

@Entity('blogs')
export class Blog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 36, unique: true })
  uuid: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string; // 🔥 ông bị thiếu @Column

  @Column({ length: 2048 })
  thumbnail: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: BlogStatus,
    default: BlogStatus.PUSHLISH,
  })
  status: BlogStatus;

  @Column({ length: 500 })
  descrtiption: string;

  // 🔥 Quan hệ blog — category
  @ManyToOne(() => Category, (category) => category.blogs)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // Foreign key categoryId chưa khai báo → thêm vào cho chắc
  @Column({ nullable: true })
  categoryId: number;

  // 🔥 Quan hệ blog — tags
  @ManyToMany(() => Tag, (tag) => tag.blogs, { cascade: true })
  @JoinTable({
    name: 'blogTags',
    joinColumn: { name: 'blogId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  // 🔥 Quan hệ blog — user (author)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  // foreign key bắt buộc phải khai báo thêm
  @Column({ nullable: true })
  authorId: number;

  @BeforeInsert()
  generateUuid() {
    this.uuid = uuidv4();
  }
}
