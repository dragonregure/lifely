import type { Post } from '../post/post.type.js';

export type User = {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    posts?: Post[];
    createdAt: string;
    updatedAt: string;
}