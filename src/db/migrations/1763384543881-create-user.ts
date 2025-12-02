import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUser1763384543881 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
            // 🆕 UUID column
          {
            name: "uuid",
            type: "char",
            length: "36",
            isUnique: true,
          },
          {
            name: "email",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "password",
            type: "varchar",
            length: "255",
          },
          {
            name: "name",
            type: "varchar",
            length: "100",
          },
          {
            name: "role",
            type: "enum",
            enum: ["User", "Admin", "Moderator"],
            default: "'User'",
          },
          {
            name: "verificationCode",
            type: "varchar",
            length: "4",
            isNullable: true,
          },
          {
            name: "isVerified",
            type: "boolean",
            default: false,
          },

          // 🆕 Thêm createdAt
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },

          // 🆕 Thêm isActive
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users", true);
  }
}
