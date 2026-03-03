import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTimestamps1770986268101 implements MigrationInterface {
    name = 'UpdateTimestamps1770986268101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blogs\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`blogs\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`blogs\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`blogs\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blogs\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`blogs\` ADD \`updatedAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`blogs\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`blogs\` ADD \`createdAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    }

}
