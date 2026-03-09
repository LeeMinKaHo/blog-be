import {
    Entity,
    Unique,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('blog_likes')
@Unique(['userId', 'blogId'])
export class BlogLike {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    blogId: number;

    @CreateDateColumn()
    createdAt: Date;
}
