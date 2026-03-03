import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddColTotalLike1765100148041 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "comments",
            new TableColumn({
                name: "totalLike",
                type: "int",
                isNullable: false,
                default: 0,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("comments", "totalLike");
    }

}

