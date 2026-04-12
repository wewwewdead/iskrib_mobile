import type {CursorPage, JournalItem} from '../api/mobileApi';

type ParsedContentSummary = {
  plainText: string;
  firstImage: string | null;
};

type JournalCardFields = Pick<
  JournalItem,
  | 'preview_text'
  | 'content'
  | 'thumbnail_url'
  | 'images'
  | 'reaction_count'
  | 'like_count'
  | 'likes_count'
  | 'comment_count'
  | 'comments_count'
  | 'bookmark_count'
  | 'reading_time'
>;

export type JournalCardData = {
  previewText: string;
  bannerImage: string | null;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  readingTime?: string;
};

const CONTENT_SUMMARY_CACHE_LIMIT = 60;
const IMAGE_SOURCE_CACHE_LIMIT = 60;

const EMPTY_CONTENT_SUMMARY: ParsedContentSummary = {
  plainText: '',
  firstImage: null,
};

const contentSummaryCache = new Map<string, ParsedContentSummary>();
const imageSourceCache = new Map<string, string | null>();

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const readFromCache = <T>(cache: Map<string, T>, key: string): T | undefined => {
  const value = cache.get(key);
  if (value === undefined) return undefined;
  cache.delete(key);
  cache.set(key, value);
  return value;
};

const writeToCache = <T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  limit: number,
): T => {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);

  if (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  return value;
};

const summarizeLexicalContent = (
  rawContent: string | null | undefined,
): ParsedContentSummary => {
  if (!rawContent) return EMPTY_CONTENT_SUMMARY;

  const cached = readFromCache(contentSummaryCache, rawContent);
  if (cached) return cached;

  let summary: ParsedContentSummary = EMPTY_CONTENT_SUMMARY;

  try {
    const parsed = JSON.parse(rawContent);
    const parts: string[] = [];
    let firstImage: string | null = null;

    const visit = (node: any) => {
      if (!node) return;

      if (typeof node.text === 'string') {
        parts.push(node.text);
      }

      if (!firstImage && node.type === 'image' && typeof node.src === 'string') {
        firstImage = node.src;
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    };

    visit(parsed.root ?? parsed);

    summary = {
      plainText: normalizeWhitespace(parts.join(' ')),
      firstImage,
    };
  } catch {
    summary = {
      plainText: normalizeWhitespace(rawContent),
      firstImage: null,
    };
  }

  return writeToCache(
    contentSummaryCache,
    rawContent,
    summary,
    CONTENT_SUMMARY_CACHE_LIMIT,
  );
};

const getImageFromImagesField = (
  images?: string | string[] | null,
): string | null => {
  if (!images) return null;

  if (Array.isArray(images)) {
    return images.length > 0 ? images[0] : null;
  }

  const cached = readFromCache(imageSourceCache, images);
  if (cached !== undefined) return cached;

  let firstImage: string | null = null;

  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      firstImage = parsed[0];
    }
  } catch {
    if (images.startsWith('http')) {
      firstImage = images;
    }
  }

  return writeToCache(
    imageSourceCache,
    images,
    firstImage,
    IMAGE_SOURCE_CACHE_LIMIT,
  );
};

export const getPreviewText = (item: {preview_text?: string | null; content?: string | null}): string => {
  if (item.preview_text) return item.preview_text;
  return extractPlainText(item.content);
};

export const extractPlainText = (rawContent: string | null | undefined): string => {
  return summarizeLexicalContent(rawContent).plainText;
};

export const extractBannerImage = (
  rawContent: string | null | undefined,
  images?: string | string[] | null,
): string | null => {
  return getImageFromImagesField(images) ?? summarizeLexicalContent(rawContent).firstImage;
};

export const normalizeCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const resolveCount = (
  aggregate: Array<{count?: number}> | undefined,
  fallback?: number,
): number => {
  if (Array.isArray(aggregate) && aggregate.length > 0)
    return normalizeCount(aggregate[0]?.count);
  return normalizeCount(fallback);
};

export const resolveLikeCount = (item: {
  reaction_count?: Array<{count?: number}>;
  like_count?: Array<{count?: number}>;
  likes_count?: number;
}): number => {
  const reactionVal = resolveCount(item.reaction_count);
  if (reactionVal > 0) return reactionVal;
  return resolveCount(item.like_count, item.likes_count);
};

export const formatReadingMinutes = (minutes: number): string =>
  minutes > 1 ? `${minutes} mins read` : `${minutes} min read`;

export const calculateReadingTime = (text: string): string => {
  const wordPerMin = 150;
  const normalized = normalizeWhitespace(text);
  const words = normalized ? normalized.split(/\s+/).length : 0;
  return formatReadingMinutes(Math.max(1, Math.ceil(words / wordPerMin)));
};

const resolveReadingTime = (
  raw: number | string | null | undefined,
  previewText: string,
): string | undefined => {
  if (typeof raw === 'number' && raw > 0) return formatReadingMinutes(raw);
  if (typeof raw === 'string' && raw.trim() !== '') return raw;
  return previewText ? calculateReadingTime(previewText) : undefined;
};

export const getJournalCardData = (item: JournalCardFields): JournalCardData => {
  const previewText = getPreviewText(item);

  return {
    previewText,
    bannerImage: item.thumbnail_url || extractBannerImage(item.content, item.images),
    likeCount: resolveLikeCount(item),
    commentCount: resolveCount(item.comment_count, item.comments_count),
    bookmarkCount: resolveCount(item.bookmark_count),
    readingTime: resolveReadingTime(item.reading_time, previewText),
  };
};

export const getNextCursor = (
  page: CursorPage<JournalItem>,
  pageSize: number,
): string | undefined => {
  if (page.nextCursor) return page.nextCursor;
  if (page.hasMore && page.data.length > 0)
    return page.data[page.data.length - 1]?.created_at ?? undefined;
  if (page.data.length >= pageSize)
    return page.data[page.data.length - 1]?.created_at ?? undefined;
  return undefined;
};

export const getNextOffset = (
  page: {data?: Array<unknown> | null},
  lastOffset: number,
  pageSize: number,
): number | undefined => {
  const itemCount = page.data?.length ?? 0;
  if (itemCount < pageSize) return undefined;
  return lastOffset + itemCount;
};
