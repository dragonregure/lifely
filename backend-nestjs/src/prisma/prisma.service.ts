import { Injectable } from '@nestjs/common';
import { db } from './db.js';

export const User = db.orm.public.User;
export const Post = db.orm.public.Post;

@Injectable()
export class PrismaService {
    User() {
        return User;
    }

    Post() {
        return Post;
    }
}