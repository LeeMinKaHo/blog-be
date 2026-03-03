import { NotFoundException } from "@nestjs/common";
import { ObjectLiteral, Repository, DeepPartial, FindManyOptions, FindOptionsWhere, FindOptionsRelations } from "typeorm";

export abstract class RepositoryBase<T extends ObjectLiteral> {
    constructor(
        protected readonly repository: Repository<T>,
    ) { }

    get repo(): Repository<T> {
        return this.repository;
    }


    async create(dto: DeepPartial<T>): Promise<T> {
        const entity = this.repository.create(dto);
        return await this.repository.save(entity);
    }

    async findAll(options?: FindManyOptions<T>): Promise<T[]> {
        return this.repository.find({
            ...options,
            where: {
                active: 1,
                ...(options?.where as any),
            } as FindOptionsWhere<T>,
        });
    }


    async findOne(
        id: number,
        relations: FindOptionsRelations<T> = {} as FindOptionsRelations<T>,
    ): Promise<T> {
        const entity = await this.repository.findOne({
            where: {
                id,
                active: 1,
            } as any,
            relations: {
                createdBy: true,
                updatedBy: true,
                ...relations
            } as any,
        });

        if (!entity) {
            throw new NotFoundException(`Entity with id ${id} not found`);
        }

        return entity;
    }


    async findOneBy(options: FindOptionsWhere<T>): Promise<T | null> {
        return await this.repository.findOne({ where: options });
    }

    async update(id: number, dto: DeepPartial<T>): Promise<T> {
        const entity = await this.findOne(id);
        Object.assign(entity, dto);
        return await this.repository.save(entity);
    }

    async remove(id: number): Promise<void> {
        const entity = await this.findOne(id);
        await this.repository.remove(entity);
    }
} 