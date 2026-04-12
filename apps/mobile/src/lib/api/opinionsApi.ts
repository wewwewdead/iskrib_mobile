import {apiRequest} from './apiClient';

export type OpinionItem = {
  id: string;
  opinion?: string;
  user_id?: string;
  created_at?: string;
  reply_count?: number;
  users?: {
    id?: string;
    name?: string;
    username?: string;
    image_url?: string;
    badge?: string;
  };
};

export type OpinionReply = OpinionItem;

export const opinionsApi = {
  async addOpinion(opinion: string): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('opinion', opinion);
    return apiRequest<{message?: string}>('/addOpinion', {
      method: 'POST',
      body: formData,
      retries: 0,
    });
  },

  async getOpinions(cursor: string | null, limit = 20): Promise<{data: OpinionItem[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('before', cursor);
    return apiRequest('/getOpinions?' + params.toString(), {method: 'GET'});
  },

  async getMyOpinions(cursor: string | null, limit = 20): Promise<{data: OpinionItem[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('before', cursor);
    return apiRequest('/getMyOpinions?' + params.toString(), {
      method: 'GET',
    });
  },

  async getUserOpinions(userId: string, cursor: string | null, limit = 20): Promise<{data: OpinionItem[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', String(limit));
    if (cursor) params.set('before', cursor);
    return apiRequest('/getUserOpinions?' + params.toString(), {method: 'GET'});
  },

  async addOpinionReply(
    parentId: string,
    userId: string,
    receiverId: string,
    opinion: string,
  ): Promise<{message?: string}> {
    const formData = new FormData();
    formData.append('opinion', opinion);
    return apiRequest<{message?: string}>(
      `/addOpinionReply/${encodeURIComponent(parentId)}/${encodeURIComponent(userId)}/${encodeURIComponent(receiverId)}`,
      {
        method: 'POST',
        body: formData,
        retries: 0,
      },
    );
  },

  async getOpinionReplies(parentId: string, cursor: string | null, limit = 20): Promise<{data: OpinionReply[]; hasMore?: boolean}> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return apiRequest(`/getOpinionReply/${encodeURIComponent(parentId)}?${params.toString()}`, {
      method: 'GET',
    });
  },
};
