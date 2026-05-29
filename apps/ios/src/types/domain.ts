export type FeedFact = {
  accent: string;
  category: string;
  categorySlug: string;
  detail: string;
  longContent: string | null;
  hook: string | null;
  id: string;
  slug: string;
  source: string | null;
  sourceUrl: string | null;
  title: string;
  tone: string;
};

export type FactActions = {
  liked: boolean;
  saved: boolean;
};

export type CategorySummary = {
  accent: string;
  count?: number;
  id: string;
  name: string;
  slug: string;
  tone: string;
};

export type DailyProgressResult = {
  completedDailyGoals: number;
  completedToday: boolean;
  dailyGoal: number;
  goalCompleted: boolean;
  message: string;
  ok: boolean;
  uniqueViewCreated: boolean;
  viewedTodayCount: number;
};

export type RelatedFactRow = {
  fact_id: string;
  facts:
    | {
        accent_color: string | null;
        categories:
          | {
              accent_color: string;
              name: string;
              slug: string;
              tone: string;
            }
          | {
              accent_color: string;
              name: string;
              slug: string;
              tone: string;
            }[]
          | null;
        content: string;
        long_content?: string | null;
        hook: string | null;
        id: string;
        slug?: string | null;
        source: string | null;
        source_url?: string | null;
        title: string;
        tone: string | null;
      }
    | null;
};

export type SessionProfile = {
  createdAt: string | null;
  dailyGoal: number;
  email: string | null;
  id: string;
  role: string;
  username: string | null;
};

export type ProfileSummary = SessionProfile & {
  completedDailyGoals: number;
  gradeBadge: string | null;
  gradeTitle: string;
  likedCount: number;
  likedFacts: FeedFact[];
  savedCount: number;
  savedFacts: FeedFact[];
  streakCount: number;
  topThemes: ThemeViewStat[];
  todayReadCount: number;
  uniqueViewsCount: number;
};

export type ExplorerData = {
  categories: CategorySummary[];
  facts: FeedFact[];
  recentFacts: FeedFact[];
};

export type ThemeViewStat = {
  accent: string;
  count: number;
  name: string;
  percent: number;
  slug: string;
};
