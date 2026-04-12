import {apiRequest} from './apiClient';

export type StoryStatus = 'ongoing' | 'completed' | 'hiatus' | string;
export type StoryPrivacy = 'public' | 'private' | string;

export type StoryItem = {
  id: string;
  title: string;
  description?: string | null;
  status?: StoryStatus;
  privacy?: StoryPrivacy;
  tags?: string[];
  cover_url?: string | null;
  vote_count?: number;
  read_count?: number;
  has_voted?: boolean;
  in_library?: boolean;
  created_at?: string;
  updated_at?: string;
  users?: {
    id?: string;
    name?: string;
    username?: string;
    image_url?: string;
  } | null;
  chapters?: StoryChapterSummary[];
  reading_progress?: {
    chapter_id?: string;
    scroll_position?: number;
  } | null;
};

export type StoryChapterSummary = {
  id: string;
  title: string;
  chapter_number?: number;
  status?: 'draft' | 'published' | string;
  word_count?: number;
};

export type StoryChapter = StoryChapterSummary & {
  content?: string | object | null;
  prev_chapter?: StoryChapterSummary | null;
  next_chapter?: StoryChapterSummary | null;
};

export type StoryListResponse = {
  data: StoryItem[];
  hasMore?: boolean;
};

export type ChapterComment = {
  id: string;
  chapter_id?: string;
  user_id?: string;
  comment?: string;
  paragraph_index?: number;
  paragraph_fingerprint?: string | null;
  parent_id?: string | null;
  created_at?: string;
  users?: {
    id?: string;
    name?: string;
    image_url?: string;
    username?: string;
    badge?: string;
  } | null;
  replies?: ChapterComment[];
  reply_count?: number;
};

export type AddChapterCommentPayload = {
  comment: string;
  paragraph_index: number | null;
  paragraph_fingerprint?: string | null;
  parent_id?: string | null;
};

const appendBeforeLimit = (
  params: URLSearchParams,
  limit: number,
  before?: string | null,
) => {
  params.set('limit', String(limit));
  if (before) {
    params.set('before', before);
  }
};

export const storyApi = {
  async getStories(
    options: {
      limit?: number;
      before?: string | null;
      status?: StoryStatus | null;
      tag?: string | null;
    } = {},
  ): Promise<StoryListResponse> {
    const params = new URLSearchParams();
    appendBeforeLimit(params, options.limit ?? 10, options.before);
    if (options.status) {
      params.set('status', options.status);
    }
    if (options.tag) {
      params.set('tag', options.tag);
    }

    return apiRequest<StoryListResponse>(`/stories?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getStoryById(storyId: string): Promise<StoryItem> {
    return apiRequest<StoryItem>(`/stories/${encodeURIComponent(storyId)}`, {
      method: 'GET',
    });
  },

  async getMyStories(
    options: {limit?: number; before?: string | null} = {},
  ): Promise<StoryListResponse> {
    const params = new URLSearchParams();
    appendBeforeLimit(params, options.limit ?? 10, options.before);
    return apiRequest<StoryListResponse>(`/stories/my?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getMyLibrary(
    options: {limit?: number; before?: string | null} = {},
  ): Promise<StoryListResponse> {
    const params = new URLSearchParams();
    appendBeforeLimit(params, options.limit ?? 10, options.before);
    return apiRequest<StoryListResponse>(`/stories/library?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getUserStories(
    userId: string,
    options: {limit?: number; before?: string | null} = {},
  ): Promise<StoryListResponse> {
    const params = new URLSearchParams();
    appendBeforeLimit(params, options.limit ?? 10, options.before);
    return apiRequest<StoryListResponse>(
      `/stories/user/${encodeURIComponent(userId)}?${params.toString()}`,
      {
        method: 'GET',
      },
    );
  },

  async createStory(
    payload: {
      title: string;
      description?: string;
      status?: StoryStatus;
      privacy?: StoryPrivacy;
      tags?: string[];
      coverImageUri?: string | null;
      coverMimeType?: string;
      coverFileName?: string;
    },
  ): Promise<StoryItem> {
    const formData = new FormData();
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description?.trim() ?? '');
    formData.append('status', payload.status ?? 'ongoing');
    formData.append('privacy', payload.privacy ?? 'public');
    formData.append('tags', JSON.stringify(payload.tags ?? []));

    if (payload.coverImageUri) {
      formData.append('image', {
        uri: payload.coverImageUri,
        type: payload.coverMimeType ?? 'image/jpeg',
        name: payload.coverFileName ?? 'story-cover.jpg',
      } as never);
    }

    return apiRequest<StoryItem>('/stories', {
      method: 'POST',
      body: formData,
    });
  },

  async updateStory(
    storyId: string,
    payload: {
      title: string;
      description?: string;
      status?: StoryStatus;
      privacy?: StoryPrivacy;
      tags?: string[];
      coverImageUri?: string | null;
      coverMimeType?: string;
      coverFileName?: string;
    },
  ): Promise<StoryItem> {
    const formData = new FormData();
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description?.trim() ?? '');
    formData.append('status', payload.status ?? 'ongoing');
    formData.append('privacy', payload.privacy ?? 'public');
    formData.append('tags', JSON.stringify(payload.tags ?? []));

    if (payload.coverImageUri) {
      formData.append('image', {
        uri: payload.coverImageUri,
        type: payload.coverMimeType ?? 'image/jpeg',
        name: payload.coverFileName ?? 'story-cover.jpg',
      } as never);
    }

    return apiRequest<StoryItem>(`/stories/${encodeURIComponent(storyId)}`, {
      method: 'PATCH',
      body: formData,
    });
  },

  async deleteStory(storyId: string): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(`/stories/${encodeURIComponent(storyId)}`, {
      method: 'DELETE',
    });
  },

  async createChapter(
    storyId: string,
    title: string,
  ): Promise<StoryChapter> {
    return apiRequest<StoryChapter>(`/stories/${encodeURIComponent(storyId)}/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({title}),
    });
  },

  async getChapter(
    storyId: string,
    chapterId: string,
  ): Promise<StoryChapter> {
    return apiRequest<StoryChapter>(
      `/stories/${encodeURIComponent(storyId)}/chapters/${encodeURIComponent(chapterId)}`,
      {
        method: 'GET',
      },
    );
  },

  async updateChapter(
    storyId: string,
    chapterId: string,
    payload: {
      title?: string;
      content?: string;
      status?: 'draft' | 'published' | string;
    },
  ): Promise<StoryChapter> {
    return apiRequest<StoryChapter>(
      `/stories/${encodeURIComponent(storyId)}/chapters/${encodeURIComponent(chapterId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteChapter(
    storyId: string,
    chapterId: string,
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(
      `/stories/${encodeURIComponent(storyId)}/chapters/${encodeURIComponent(chapterId)}`,
      {
        method: 'DELETE',
      },
    );
  },

  async reorderChapters(
    storyId: string,
    chapterOrder: string[],
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(
      `/stories/${encodeURIComponent(storyId)}/chapters/reorder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({chapterOrder}),
      },
    );
  },

  async toggleVote(storyId: string): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(`/stories/${encodeURIComponent(storyId)}/vote`, {
      method: 'POST',
    });
  },

  async toggleLibrary(storyId: string): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(
      `/stories/${encodeURIComponent(storyId)}/library`,
      {
        method: 'POST',
      },
    );
  },

  async getChapterComments(
    chapterId: string,
    paragraphIndex?: number | null,
  ): Promise<ChapterComment[]> {
    const params = new URLSearchParams();
    if (paragraphIndex !== null && paragraphIndex !== undefined) {
      params.set('paragraph_index', String(paragraphIndex));
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<ChapterComment[]>(
      `/chapters/${encodeURIComponent(chapterId)}/comments${suffix}`,
      {
        method: 'GET',
      },
    );
  },

  async getChapterCommentCounts(
    chapterId: string,
  ): Promise<Record<number, number>> {
    return apiRequest<Record<number, number>>(
      `/chapters/${encodeURIComponent(chapterId)}/comment-counts`,
      {
        method: 'GET',
      },
    );
  },

  async addChapterComment(
    chapterId: string,
    payload: AddChapterCommentPayload,
  ): Promise<ChapterComment> {
    return apiRequest<ChapterComment>(
      `/chapters/${encodeURIComponent(chapterId)}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
  },

  async saveReadingProgress(
    storyId: string,
    chapterId: string,
    scrollPosition: number,
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(
      `/stories/${encodeURIComponent(storyId)}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          scroll_position: scrollPosition,
        }),
      },
    );
  },

  async getReadingProgress(
    storyId: string,
  ): Promise<{chapter_id?: string; scroll_position?: number}> {
    return apiRequest<{chapter_id?: string; scroll_position?: number}>(
      `/stories/${encodeURIComponent(storyId)}/progress`,
      {
        method: 'GET',
      },
    );
  },
};
