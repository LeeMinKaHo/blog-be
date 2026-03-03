import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class UserContextService {
    constructor(private readonly cls: ClsService) { }

    setUserId(userId: number): void {
        this.cls.set('userId', userId);
    }

    getUserId(): number | undefined {
        return this.cls.get('userId');
    }
}
