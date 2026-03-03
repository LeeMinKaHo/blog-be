import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepositoryBase } from 'src/common/base/repository.base';
import { Blog } from './entity/blog.entity';

@Injectable()
export class BlogRepository extends RepositoryBase<Blog> {
    constructor(
        @InjectRepository(Blog)
        repository: Repository<Blog>,
    ) {
        super(repository);
    }
}
