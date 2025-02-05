export interface Topic {
  id: string;
  name: string;
  posts: Posts;
}

export type Topics = Topic[];

export interface Post {
  id: string;
  name: string;
  description: string;
}

export type Posts = Post[];

export type UserRole = 'owner' | 'editor' | 'reader';
