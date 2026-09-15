import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { type TokenAbility } from './token.service.js';

export type TokenRecordWithUser = {
  id: number;
  expiresAt: string | null;
  tokenable: unknown;
};

type CreateTokenInput = {
  tokenableId: string;
  name: string;
  token: string;
  ability: TokenAbility;
  expiresAt: string;
};

type DeleteTokenCriteria = {
  id?: number;
  token?: string;
  tokenableId?: string;
  ability?: TokenAbility;
};

@Injectable()
export class TokenRepository {
  async create(input: CreateTokenInput): Promise<{ id: number }> {
    return db.orm.public.PersonalAccessToken.create({
      tokenableId: input.tokenableId,
      name: input.name,
      token: input.token,
      ability: input.ability,
      lastUsedAt: null,
      expiresAt: input.expiresAt,
    });
  }

  async findWithUser(criteria: {
    id: number;
    token: string;
    ability: TokenAbility;
  }): Promise<TokenRecordWithUser | null> {
    return await db.orm.public.PersonalAccessToken.where(criteria)
      .include('tokenable', (user) => user.include('tenant'))
      .first();
  }

  async touchLastUsed(id: number, lastUsedAt: string): Promise<void> {
    await db.orm.public.PersonalAccessToken.where({ id }).update({
      lastUsedAt,
    });
  }

  async delete(criteria: DeleteTokenCriteria): Promise<void> {
    await db.orm.public.PersonalAccessToken.where(criteria).delete();
  }
}
