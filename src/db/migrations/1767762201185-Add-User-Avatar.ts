import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddUserAvatar1767762201185 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.addColumn("user", new TableColumn({ 
            name: "avatar",
            type: "varchar",
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.dropColumn("user", "avatar");
    }

}
