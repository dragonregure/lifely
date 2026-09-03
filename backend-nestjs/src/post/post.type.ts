import type { User } from '../user/user.type.js';

export type Post = {
    id: number;
    title: string;
    content: string | null;
    author: User;
    createdAt: string;
    updatedAt: string;
}