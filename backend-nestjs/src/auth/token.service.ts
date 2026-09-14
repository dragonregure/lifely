import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '../prisma/db.js';

export type TokenAbility = 'access' | 'refresh';

export type PlainToken = {
  plainTextToken: string;
  expiresAt: string;
};

type RevokeTokenOptions = {
  userId?: string;
  ability?: TokenAbility;
};

@Injectable()
export class TokenService {
  private readonly accessTokenMinutes = Number(
    process.env['LIFELY_ACCESS_TOKEN_MINUTES'] ?? 60,
  );
  private readonly refreshTokenDays = Number(
    process.env['LIFELY_REFRESH_TOKEN_DAYS'] ?? 14,
  );

  async createToken(
    userId: string,
    deviceName: string,
    ability: TokenAbility,
  ): Promise<PlainToken> {
    const plainToken = randomBytes(40).toString('hex');
    const expiresAt = this.expiryFor(ability).toISOString();
    const token = await db.orm.public.PersonalAccessToken.create({
      tokenableId: userId,
      name: `${deviceName}:${ability}`,
      token: this.hashToken(plainToken),
      ability,
      lastUsedAt: null,
      expiresAt,
    });

    return {
      plainTextToken: `${token.id}|${plainToken}`,
      expiresAt,
    };
  }

  async findValidToken(plainTextToken: string, ability: TokenAbility) {
    const parsed = this.parsePlainToken(plainTextToken);

    if (!parsed) {
      return null;
    }

    const accessToken = await db.orm.public.PersonalAccessToken.where({
      id: parsed.id,
      token: parsed.hashedToken,
      ability,
    })
      .include('tokenable', (user) => user.include('tenant'))
      .first();

    if (!accessToken || this.isExpired(accessToken.expiresAt)) {
      return null;
    }

    await db.orm.public.PersonalAccessToken.where({
      id: accessToken.id,
    }).update({
      lastUsedAt: new Date().toISOString(),
    });

    return accessToken;
  }

  async revokeToken(
    plainTextToken: string,
    options: RevokeTokenOptions = {},
  ): Promise<void> {
    const parsed = this.parsePlainToken(plainTextToken);

    if (!parsed) {
      return;
    }

    const criteria: {
      id: number;
      token: string;
      tokenableId?: string;
      ability?: TokenAbility;
    } = {
      id: parsed.id,
      token: parsed.hashedToken,
    };

    if (options.userId) {
      criteria.tokenableId = options.userId;
    }

    if (options.ability) {
      criteria.ability = options.ability;
    }

    await db.orm.public.PersonalAccessToken.where(criteria).delete();
  }

  async revokeTokenById(
    tokenId: number,
    userId: string,
    ability?: TokenAbility,
  ): Promise<void> {
    const criteria: {
      id: number;
      tokenableId: string;
      ability?: TokenAbility;
    } = {
      id: tokenId,
      tokenableId: userId,
    };

    if (ability) {
      criteria.ability = ability;
    }

    await db.orm.public.PersonalAccessToken.where(criteria).delete();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db.orm.public.PersonalAccessToken.where({
      tokenableId: userId,
    }).delete();
  }

  private parsePlainToken(
    plainTextToken: string,
  ): { id: number; hashedToken: string } | null {
    const [id, token] = plainTextToken.split('|');
    const tokenId = Number(id);

    if (!Number.isInteger(tokenId) || !token) {
      return null;
    }

    return {
      id: tokenId,
      hashedToken: this.hashToken(token),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiryFor(ability: TokenAbility): Date {
    const expiresAt = new Date();

    if (ability === 'access') {
      expiresAt.setMinutes(expiresAt.getMinutes() + this.accessTokenMinutes);
      return expiresAt;
    }

    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenDays);
    return expiresAt;
  }

  private isExpired(expiresAt: string | null): boolean {
    return expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
  }
}
