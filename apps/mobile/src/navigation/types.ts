export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Stories: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: {userExists: boolean};
  PostDetail: {journalId: string; slug?: string};
  JournalEditor: {mode: 'create' | 'draft' | 'edit'; journalId?: string; promptId?: string; promptText?: string; parentJournalId?: string};
  EchoBloom: {journalId: string};
  Thread: {journalId: string};
  StoryDetail: {storyId: string};
  StoryEditor: {storyId?: string};
  StoryDashboard: undefined;
  StoryLibrary: undefined;
  StoryChapterManager: {storyId: string};
  StoryChapterEditor: {storyId: string; chapterId: string};
  StoryChapterReader: {storyId: string; chapterId: string; scrollPosition?: number};
  VisitProfile: {userId: string; username?: string};
  EditProfile: undefined;
  Settings: undefined;
  FollowList: {userId: string; tab: 'followers' | 'following'};
  Bookmarks: undefined;
  Drafts: undefined;
  PromptResponses: {promptId: string};
  OpinionsFeed: undefined;
  OpinionDetail: {opinionId: string; parentOpinion?: {id: string; opinion?: string; user_id?: string; created_at?: string; reply_count?: number; users?: {id?: string; name?: string; username?: string; image_url?: string; badge?: string} | null}};
  OpinionEditor: undefined;
  MyOpinions: undefined;
  Analytics: undefined;
  ProfileCustomize: undefined;
  WritingPreferences: undefined;
};
