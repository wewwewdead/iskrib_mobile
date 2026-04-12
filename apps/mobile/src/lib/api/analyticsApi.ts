import {apiRequest} from './apiClient';

export type AnalyticsSummary = {
  total_posts?: number;
  total_views?: number;
  total_reactions?: number;
  total_comments?: number;
  total_bookmarks?: number;
  avg_engagement_rate?: number;
};

export type TopPost = {
  journal_id: string;
  title?: string;
  views?: number;
  reactions?: number;
  comments?: number;
  bookmarks?: number;
  score?: number;
  created_at?: string;
  preview_text?: string;
  thumbnail_url?: string;
};

export type AnalyticsData = {
  summary?: AnalyticsSummary;
  views_series?: Array<{date: string; count: number}>;
  reactions_series?: Array<{date: string; count: number}>;
  reaction_breakdown?: Array<{type: string; count: number}>;
  top_posts?: TopPost[];
  publishing_frequency?: Array<{week_start: string; count: number}>;
  streak?: {current_streak?: number; longest_streak?: number};
};

export type WeeklyRecapBestPost = {
  journal_id: string;
  title: string | null;
  reaction_count: number;
  view_count: number;
};

export type WeeklyRecapPersonal = {
  posts_written: number;
  total_words: number;
  reactions_received: number;
  views_received: number;
  best_post: WeeklyRecapBestPost | null;
};

export type WeeklyRecapGroup = {
  total_posts: number;
  most_active_writer: {
    user_id: string;
    name: string;
    username: string;
    avatar: string | null;
    post_count: number;
  } | null;
  most_reacted_post: {
    journal_id: string;
    title: string;
    reaction_count: number;
    author_name: string;
    author_avatar: string | null;
  } | null;
};

export type WeeklyRecapData = {
  personal: WeeklyRecapPersonal;
  group: WeeklyRecapGroup;
  week_start: string;
  week_end: string;
};

export const analyticsApi = {
  async getWriterAnalytics(range = '30d'): Promise<{analytics: AnalyticsData}> {
    const params = new URLSearchParams();
    params.set('range', range);
    return apiRequest('/analytics?' + params.toString(), {
      method: 'GET',
    });
  },

  async getWeeklyRecap(): Promise<{recap: WeeklyRecapData}> {
    return apiRequest('/recap/weekly', {
      method: 'GET',
    });
  },
};
