import dataSource from './data-source';

export  const transactionDb = async (cb) => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await cb(queryRunner);   // 🔥 phải await

    await queryRunner.commitTransaction();
    return result; // optional nhưng tốt
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

