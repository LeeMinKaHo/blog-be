import { User } from "src/modules/users/entity/user.entity";
import { Column, CreateDateColumn, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from "typeorm";

export class BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdBy' })
    createdBy: User;

    @RelationId((entity: BaseEntity) => entity.createdBy)
    createdById: number;


    @ManyToOne(() => User)
    @JoinColumn({ name: 'updatedBy' })
    updatedBy: User;

    @RelationId((entity: BaseEntity) => entity.updatedBy)
    updatedById: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'tinyint', default: 1 })
    active: boolean;
}