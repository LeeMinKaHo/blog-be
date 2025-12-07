import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export async function paginate<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  page: number = 1,
  limit: number = 10,
) {
  const take = Number(limit);
  const skip = (Number(page) - 1) * take;

  const [data, total] = await query.take(take).skip(skip).getManyAndCount();

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
