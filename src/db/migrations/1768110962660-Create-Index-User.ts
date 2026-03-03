import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CreateIndexUser1768110962660 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createIndex(
            "users",
            new TableIndex({
                name: "IDX_USER_EMAIL",
                columnNames: ["email"],
            }),
        );

        await queryRunner.createIndex(
            "users",
            new TableIndex({
                name: "IDX_USER_UUID",
                columnNames: ["uuid"],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("users", "IDX_USER_EMAIL");
        await queryRunner.dropIndex("users", "IDX_USER_UUID");
    }
}

