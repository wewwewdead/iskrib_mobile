import {apiRequest} from './apiClient';
import type {CursorPage, JournalItem} from './mobileApi';

export type JournalComment = {
  id: string;
  comment?: string;
  created_at?: string;
  parent_id?: string | null;
  post_id?: string;
  user_id?: string;
  users?: {
    id?: string;
    name?: string;
    image_url?: string;
    badge?: string;
  } | null;
  reply_count?: number;
};

type NotificationSource = 'journal' | 'opinion' | string;

export type FollowsData = {
  followers?: Array<{
    id: string;
    follower_id: string;
    users?: {id: string; name?: string; username?: string; image_url?: string; badge?: string};
  }>;
  following?: Array<{
    id: string;
    following_id: string;
    users?: {id: string; name?: string; username?: string; image_url?: string; badge?: string};
  }>;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
};

export const socialApi = {
  async toggleFollow(
    payload: {followingId: string},
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/addFollows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  async getFollowsData(
    userId: string,
  ): Promise<FollowsData> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    return apiRequest<FollowsData>(`/getFollowsData?${params.toString()}`, {
      method: 'GET',
    });
  },

  async likeJournal(
    payload: {
      journalId: string;
      receiverId?: string;
      senderImageUrl?: string;
      sendername?: string;
      senderEmail?: string;
    },
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  async addComment(
    payload: {comments: string; postId: string; receiverId?: string; parentId?: string},
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/addComment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  async getComments(
    postId: string,
    cursor: string | null = null,
    limit = 20,
  ): Promise<{comments: JournalComment[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('postId', postId);
    params.set('limit', String(limit));
    if (cursor) {
      params.set('before', cursor);
    }

    return apiRequest<{comments: JournalComment[]; hasMore?: boolean}>(
      `/getComments?${params.toString()}`,
      {method: 'GET'},
    );
  },

  async getReplies(
    postId: string,
    parentId: string,
    limit = 20,
  ): Promise<{comments: JournalComment[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('postId', postId);
    params.set('parentId', parentId);
    params.set('limit', String(limit));

    return apiRequest<{comments: JournalComment[]; hasMore?: boolean}>(
      `/getComments?${params.toString()}`,
      {method: 'GET'},
    );
  },

  async toggleBookmark(
    payload: {journalId: string},
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/addBookmark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  async getBookmarks(
    userId: string,
    cursor: string | null = null,
    limit = 10,
  ): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', String(limit));
    if (cursor) {
      params.set('before', cursor);
    }

    return apiRequest<CursorPage<JournalItem>>(`/getBookmarks?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getNotificationsCount(
    userId: string,
  ): Promise<{count?: number}> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    return apiRequest<{count?: number}>(`/getCountNotifications?${params.toString()}`, {
      method: 'GET',
    });
  },

  async markNotificationRead(
    notifId: string,
    source?: NotificationSource,
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/readNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({notifId, source}),
    });
  },

  async deleteNotification(
    notifId: string,
    source?: NotificationSource,
  ): Promise<{message?: string}> {
    const suffix = source
      ? `/deleteNotification/${encodeURIComponent(notifId)}?source=${encodeURIComponent(source)}`
      : `/deleteNotification/${encodeURIComponent(notifId)}`;

    return apiRequest<{message?: string}>(suffix, {
      method: 'DELETE',
    });
  },

  async getUnreadNotifications(
    cursor: string | null = null,
    limit = 10,
  ): Promise<CursorPage<unknown>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) {
      params.set('before', cursor);
    }

    return apiRequest<CursorPage<unknown>>(`/getUnreadNotification?${params.toString()}`, {
      method: 'GET',
    });
  },

  async toggleReaction(
    payload: {
      journalId: string;
      receiverId: string;
      reactionType: string;
    },
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/reaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  async createRepost(
    payload: {sourceJournalId: string; caption?: string},
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/repost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  // ─── Pinned Posts ───

  async togglePin(
    payload: {journalId: string},
  ): Promise<{message?: string; error?: string}> {
    return apiRequest<{message?: string; error?: string}>('/togglePin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
  },

  async reorderPin(
    payload: {journalId: string; direction: 'up' | 'down'},
  ): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/reorderPin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
  },
};
