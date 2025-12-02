import { Column, Entity, Generated, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Blog } from "./blog.entity";


@Entity('tags')
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ length: 125 })
    name : string;
    @ManyToMany(() => Blog, blog => blog.tags)
  blogs: Blog[];
}