import { apiRequest } from './apiClient';

export type UserPreview = {
  id: string;
  name: string | null;
  username?: string | null;
  image_url?: string | null;
  badge?: string | null;
};

export type JournalItem = {
  id: string;
  title: string | null;
  content: string | null;
  post_type?: string | null;
  user_id?: string | null;
  privacy?: string | null;
  created_at?: string;
  likes_count?: number;
  comments_count?: number;
  has_liked?: boolean;
  has_bookmarked?: boolean;
  user_reaction?: string | null;
  reaction_count?: Array<{count?: number}>;
  like_count?: Array<{count?: number}>;
  comment_count?: Array<{count?: number}>;
  bookmark_count?: Array<{count?: number}>;
  preview_text?: string | null;
  thumbnail_url?: string | null;
  images?: string[];
  reading_time?: number | string | null;
  is_repost?: boolean;
  repost_caption?: string | null;
  repost_source?: JournalItem | null;
  views?: number;
  users?: UserPreview | null;
  hot_score?: number;
  prompt_id?: string | null;
  writing_prompts?: {prompt_text?: string} | null;
  status?: 'draft' | 'published' | string | null;
};

export type CursorPage<T> = {
  data: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type NotificationItem = {
  id: string;
  sender_id?: string;
  receiver_id?: string;
  journal_id?: string;
  repost_journal_id?: string | null;
  opinion_id?: string | null;
  type?: string;
  reaction_type?: string;
  source?: 'journal' | 'opinion' | string;
  users?: UserPreview | null;
  journals?: JournalItem | null;
  opinions?: {
    id?: string;
    opinion?: string;
    user_id?: string;
    created_at?: string;
  } | null;
  message?: string;
  created_at?: string;
  read?: boolean;
};

export type StreakResponse = {
  currentStreak?: number;
  longestStreak?: number;
  lastPostDate?: string | null;
};

export type UserProfile = {
  id: string;
  name?: string;
  username?: string;
  bio?: string;
  image_url?: string;
  badge?: string;
  profile_layout?: Record<string, string> | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  background?: Record<string, string> | null;
  profile_font_color?: string | null;
  dominant_colors?: string | null;
  secondary_colors?: string | null;
  writing_interests?: string[];
  writing_goal?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
};

export type UserDataResponse = {
  userData?: UserProfile[];
  followerCount?: number;
  followingCount?: number;
  postsCount?: number;
};

export type CheckUserResponse = {
  exist: boolean;
  onboardingCompleted: boolean;
};

export type UsernameAvailabilityResponse = {
  available: boolean;
};

export const mobileApi = {
  async getJournals(cursor: string | null, limit = 10, userId?: string): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) {
      params.set('before', cursor);
    }
    if (userId) {
      params.set('userId', userId);
    }

    return apiRequest<CursorPage<JournalItem>>(`/journals?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getJournalById(journalId: string, userId?: string): Promise<{ journal: JournalItem }> {
    const params = new URLSearchParams();
    if (userId) {
      params.set('userId', userId);
    }

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ journal: JournalItem }>(`/journal/${encodeURIComponent(journalId)}${suffix}`, {
      method: 'GET',
    });
  },

  async searchUsers(query: string, limit = 20): Promise<{ data: UserPreview[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    params.set('query', query.trim());
    params.set('limit', String(limit));

    return apiRequest<{ data: UserPreview[]; hasMore: boolean }>(`/users/search?${params.toString()}`, {
      method: 'GET',
    });
  },

  async searchJournals(query: string, limit = 20, userId?: string): Promise<{ data: JournalItem[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    params.set('query', query.trim());
    params.set('limit', String(limit));
    if (userId) {
      params.set('userId', userId);
    }

    return apiRequest<{ data: JournalItem[]; hasMore: boolean }>(`/journals/search?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getNotifications(cursor: string | null, limit = 20): Promise<CursorPage<NotificationItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) {
      params.set('before', cursor);
    }

    return apiRequest<CursorPage<NotificationItem>>(`/getNotifications?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getStreak(userId: string): Promise<StreakResponse> {
    return apiRequest<StreakResponse>(`/streak/${encodeURIComponent(userId)}`, {
      method: 'GET',
    });
  },

  async checkUser(userId: string): Promise<CheckUserResponse> {
    const params = new URLSearchParams();
    params.set('userId', userId);

    return apiRequest<CheckUserResponse>(`/check-user?${params.toString()}`, {
      method: 'GET',
      timeoutMs: 5_000,
      retries: 1,
    });
  },

  async getUserData(userId: string): Promise<UserDataResponse> {
    const params = new URLSearchParams();
    params.set('userId', userId);

    return apiRequest<UserDataResponse>(`/getUserData?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getUserByUsername(username: string): Promise<UserDataResponse> {
    return apiRequest<UserDataResponse>(
      `/user/${encodeURIComponent(username)}`,
      {method: 'GET'},
    );
  },

  async checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResponse> {
    return apiRequest<UsernameAvailabilityResponse>(
      `/check-username/${encodeURIComponent(username)}`,
      {method: 'GET'},
    );
  },

  async getHottestMonthly(limit = 5, userId?: string): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (userId) {
      params.set('userId', userId);
    }

    return apiRequest<CursorPage<JournalItem>>(`/journals/hottest-monthly?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getRelatedPosts(journalId: string): Promise<{data: JournalItem[]}> {
    return apiRequest<{data: JournalItem[]}>(
      `/journal/${encodeURIComponent(journalId)}/related`,
      {method: 'GET'},
    );
  },

  async getUserJournals(userId: string, cursor: string | null, limit = 10): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('userId', userId);
    if (cursor) params.set('before', cursor);
    return apiRequest<CursorPage<JournalItem>>(`/userJournals?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getVisitedUserJournals(userId: string, loggedInUserId: string, cursor: string | null, limit = 10): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('userId', userId);
    params.set('loggedInUserId', loggedInUserId);
    if (cursor) params.set('before', cursor);
    return apiRequest<CursorPage<JournalItem>>(`/visitedUserJournals?${params.toString()}`, {
      method: 'GET',
    });
  },

  async deleteJournal(journalId: string): Promise<{message?: string}> {
    return apiRequest<{message?: string}>(`/deleteJournal/${encodeURIComponent(journalId)}`, {
      method: 'DELETE',
    });
  },

  async updatePrivacy(payload: {journalId: string; privacy: string}): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('journalId', payload.journalId);
    formData.append('privacy', payload.privacy);
    return apiRequest<{message?: string}>('/updatePrivacy', {
      method: 'POST',
      body: formData,
      retries: 0,
    });
  },

  async getFollowingFeed(cursor: string | null, limit = 10): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('before', cursor);
    return apiRequest<CursorPage<JournalItem>>(`/journals/following?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getForYouFeed(offset: number, limit = 10): Promise<CursorPage<JournalItem>> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return apiRequest<CursorPage<JournalItem>>(`/journals/for-you?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getBookmarks(
    options: {limit?: number; before?: string | null} = {},
  ): Promise<{bookmarks: any[]; hasMore?: boolean; totalBookmarks?: number}> {
    const params = new URLSearchParams();
    params.set('limit', String(options.limit ?? 10));
    if (options.before) params.set('before', options.before);
    return apiRequest<{bookmarks: any[]; hasMore?: boolean; totalBookmarks?: number}>(
      `/getBookmarks?${params.toString()}`,
      {
        method: 'GET',
      },
    );
  },

  async getJournalContent(journalId: string): Promise<{journal: {id: string; title: string; content: string}}> {
    return apiRequest<{journal: {id: string; title: string; content: string}}>(
      `/journal/${encodeURIComponent(journalId)}/content`,
      {
        method: 'GET',
      },
    );
  },

  async saveDraft(payload: {title: string; content: string; draftId?: string}): Promise<{id?: string; message?: string}> {
    return apiRequest<{id?: string; message?: string}>('/journal/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      retries: 0,
    });
  },

  async publishDraft(journalId: string): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/journal/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({journalId}),
      retries: 0,
    });
  },

  async getDrafts(): Promise<{data: JournalItem[]}> {
    return apiRequest<{data: JournalItem[]}>('/journal/drafts', {
      method: 'GET',
    });
  },

  async getTodaysPrompt(): Promise<{id?: string; prompt_text?: string; created_at?: string}> {
    return apiRequest<{id?: string; prompt_text?: string; created_at?: string}>('/prompt/today', {
      method: 'GET',
    });
  },

  async getPromptResponses(promptId: string, cursor: string | null, limit = 10): Promise<{responses: JournalItem[]; before?: string}> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('before', cursor);
    return apiRequest<{responses: JournalItem[]; before?: string}>(`/prompt/${encodeURIComponent(promptId)}/responses?${params.toString()}`, {
      method: 'GET',
    });
  },

  async getInterestSections(): Promise<{sections?: Array<{name: string; journals: JournalItem[]}>}> {
    return apiRequest<{sections?: Array<{name: string; journals: JournalItem[]}>}>('/explore/interests', {
      method: 'GET',
    });
  },

  async getProfileMedia(cursor: string | null, limit = 20): Promise<{data: Array<{id: string; url: string; bucket?: string; path?: string; thumbnailUrl?: string; detailUrl?: string}>; nextCursor?: string}> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return apiRequest('/profileMedia?' + params.toString(), {
      method: 'GET',
    });
  },

  async getVisitedProfileMedia(userId: string, cursor: string | null, limit = 20): Promise<{data: Array<{id: string; url: string; thumbnailUrl?: string; detailUrl?: string}>; nextCursor?: string}> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return apiRequest('/visitedProfileMedia?' + params.toString(), {
      method: 'GET',
    });
  },

  async completeOnboarding(payload: {writingInterests: string[]; writingGoal: string}): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/complete-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      retries: 0,
    });
  },

  async uploadUserData(formData: FormData): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/upload-user-data', {
      method: 'POST',
      body: formData,
      retries: 0,
      timeoutMs: 30000,
    });
  },

  async updateInterests(payload: {writingInterests: string[]; writingGoal: string}): Promise<{message?: string}> {
    return apiRequest<{message?: string}>('/update-interests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      retries: 0,
    });
  },

  async updateUserData(
    payload: {name: string; bio: string; profileBg?: object; image?: {uri: string; type: string; name: string}},
  ): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('bio', payload.bio);
    if (payload.profileBg) {
      formData.append('profileBg', JSON.stringify(payload.profileBg));
    }
    if (payload.image) {
      formData.append('image', payload.image as any);
    }
    return apiRequest<{message?: string}>('/update-user-data', {
      method: 'POST',
      body: formData,
      retries: 0,
      timeoutMs: 30000,
    });
  },

  async updateFontColor(fontColor: string): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('fontColor', fontColor);
    return apiRequest<{message?: string}>('/updateFontColor', {
      method: 'POST',
      body: formData,
      retries: 0,
    });
  },

  async deleteProfileMediaImage(payload: {bucket: string; path: string; url: string}): Promise<{deleted?: boolean; clearedAvatar?: boolean; clearedBackground?: boolean}> {
    return apiRequest<{deleted?: boolean; clearedAvatar?: boolean; clearedBackground?: boolean}>('/media/image', {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      retries: 0,
    });
  },

  async uploadBackground(formData: FormData): Promise<{data?: string}> {
    return apiRequest<{data?: string}>('/uploadBackground', {
      method: 'POST',
      body: formData,
      retries: 0,
      timeoutMs: 30000,
    });
  },

  async saveJournal(payload: { title: string; lexicalContent: string; privacy?: string; promptId?: string }): Promise<{ message?: string }> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('content', payload.lexicalContent);
    formData.append('post_type', 'text');
    if (payload.privacy) {
      formData.append('privacy', payload.privacy);
    }
    if (payload.promptId) {
      formData.append('prompt_id', payload.promptId);
    }

    return apiRequest<{ message?: string }>('/save-journal', {
      method: 'POST',
      body: formData,
      timeoutMs: 30000,
      retries: 0,
    });
  },

  async updateJournal(payload: {journalId: string; title: string; lexicalContent: string}): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('journalId', payload.journalId);
    formData.append('title', payload.title);
    formData.append('content', payload.lexicalContent);

    return apiRequest<{message?: string}>('/update-journal', {
      method: 'POST',
      body: formData,
      timeoutMs: 30000,
      retries: 0,
    });
  },

  async saveJournalImage(image: { uri: string; type: string; name: string }): Promise<{ img_url: string }> {
    const formData = new FormData();
    formData.append('image', image as any);
    return apiRequest<{ img_url: string }>('/save-journal-image', {
      method: 'POST',
      body: formData,
      timeoutMs: 30000,
      retries: 0,
    });
  },

  async addViews(journalId: string): Promise<{ message: string; counted: boolean }> {
    return apiRequest<{ message: string; counted: boolean }>('/addViews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ journalId }),
      retries: 1,
    });
  },

  // ─── Pinned Posts ───

  async getPinnedJournals(): Promise<{data: JournalItem[]}> {
    return apiRequest<{data: JournalItem[]}>('/pinnedJournals');
  },

  async getVisitedPinnedJournals(userId: string, loggedInUserId?: string): Promise<{data: JournalItem[]}> {
    const params = new URLSearchParams({userId});
    if (loggedInUserId) params.set('loggedInUserId', loggedInUserId);
    return apiRequest<{data: JournalItem[]}>(`/visitedPinnedJournals?${params}`, {skipAuth: true});
  },

  async getUserPinnedIds(): Promise<{pinnedIds: string[]}> {
    return apiRequest<{pinnedIds: string[]}>('/userPinnedIds');
  },
};
