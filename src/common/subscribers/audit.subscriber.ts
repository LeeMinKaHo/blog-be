import {
    EntitySubscriberInterface,
    EventSubscriber,
    InsertEvent,
    UpdateEvent,
    DataSource,
} from 'typeorm';
import { BaseEntity } from '../base/entity.base';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
    constructor(private readonly dataSource?: DataSource) {
        // No need to manually push - TypeORM handles this via @EventSubscriber decorator
    }

    listenTo() {
        return BaseEntity;
    }

    private getUserId(): number | undefined {
        try {
            // Get ClsService from global context
            const { ClsServiceManager } = require('nestjs-cls');
            const cls = ClsServiceManager.getClsService();
            return cls?.get('userId');
        } catch (error: any) {
            console.warn('⚠️ Could not get userId from context:', error.message);
            return undefined;
        }
    }

    beforeInsert(event: InsertEvent<BaseEntity>): void {
        try {
            const userId = this.getUserId();
            console.log('🔍 AuditSubscriber.beforeInsert - userId:', userId);
            if (userId && event.entity) {
                event.entity.createdBy = { id: userId } as any;
                event.entity.updatedBy = { id: userId } as any;
                console.log('✅ Set createdBy/updatedBy for insert to:', userId);
            }
        } catch (error) {
            console.error('❌ AuditSubscriber.beforeInsert error:', error);
            // Don't throw - let the insert continue
        }
    }

    beforeUpdate(event: UpdateEvent<BaseEntity>): void {
        try {
            const userId = this.getUserId();
            console.log('🔍 AuditSubscriber.beforeUpdate - userId:', userId);
            if (userId && event.entity) {
                (event.entity as BaseEntity).updatedBy = { id: userId } as any;
                console.log('✅ Set updatedBy for update to:', userId);
            }
        } catch (error) {

            console.error('❌ AuditSubscriber.beforeUpdate error:', error);
            // Don't throw - let the update continue
        }
    }
}
