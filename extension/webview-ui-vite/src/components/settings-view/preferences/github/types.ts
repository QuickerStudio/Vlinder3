/**
 * GitHub Types
 */

export interface GitHubAccount {
  login: string;
  email?: string;
  avatarUrl?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  private: boolean;
  updatedAt: string;
  stargazersCount?: number;
  forksCount?: number;
  hasWiki?: boolean;
}

export type SortBy = 'created' | 'updated' | 'pushed' | 'full_name';

