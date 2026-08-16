// Hard-coded placeholder data for the M0 shell. Replace with real API/query
// results once the Supabase data layer lands — shapes here are a rough guide,
// not a contract.

export interface StatItem {
  id: string
  label: string
  value: number
}

export const stats: StatItem[] = [
  { id: 'due-review', label: 'Due for review', value: 7 },
  { id: 'articles', label: 'Articles', value: 24 },
  { id: 'quizzes-taken', label: 'Quizzes taken', value: 11 },
  { id: 'day-streak', label: 'Day streak', value: 4 },
]

export interface ContinueLearning {
  trackName: string
  progressPercent: number
  moduleLabel: string
}

export const continueLearning: ContinueLearning = {
  trackName: 'Node.js Track',
  progressPercent: 35,
  moduleLabel: 'Module 6 of 17 — Sessions & Cookies',
}

export interface DueReviewItem {
  id: string
  prompt: string
  topic: string
}

export const dueReviews: DueReviewItem[] = [
  {
    id: 'rev-1',
    prompt: 'What does the useEffect cleanup function protect against?',
    topic: 'React',
  },
  {
    id: 'rev-2',
    prompt: "How does TypeScript's Partial<T> utility type work?",
    topic: 'TypeScript',
  },
  {
    id: 'rev-3',
    prompt: "What's the default position value in CSS, and how does it affect stacking?",
    topic: 'CSS',
  },
  {
    id: 'rev-4',
    prompt: 'When does Next.js re-run generateStaticParams during a build?',
    topic: 'Next.js',
  },
]

export interface RecentArticle {
  id: string
  title: string
  topic: string
  authorInitials: string
  addedAt: string
}

export const recentArticles: RecentArticle[] = [
  {
    id: 'art-1',
    title: 'Understanding the Event Loop',
    topic: 'Node.js',
    authorInitials: 'SM',
    addedAt: '2h ago',
  },
  {
    id: 'art-2',
    title: 'React Server Components, Explained',
    topic: 'React',
    authorInitials: 'OA',
    addedAt: 'Yesterday',
  },
  {
    id: 'art-3',
    title: 'CSS Container Queries in Practice',
    topic: 'CSS',
    authorInitials: 'RK',
    addedAt: '2d ago',
  },
  {
    id: 'art-4',
    title: 'TypeScript Generics Cheat Sheet',
    topic: 'TypeScript',
    authorInitials: 'OA',
    addedAt: '4d ago',
  },
  {
    id: 'art-5',
    title: 'Next.js Middleware Patterns',
    topic: 'Next.js',
    authorInitials: 'SM',
    addedAt: '6d ago',
  },
]

export interface ActivityItem {
  id: string
  text: string
  timestamp: string
}

export const teamActivity: ActivityItem[] = [
  {
    id: 'act-1',
    text: 'Sara published “Understanding the Event Loop”',
    timestamp: '2h ago',
  },
  {
    id: 'act-2',
    text: 'Omar added 8 questions to “TypeScript Generics”',
    timestamp: '5h ago',
  },
  {
    id: 'act-3',
    text: 'Raj reviewed 12 flashcards in CSS',
    timestamp: 'Yesterday',
  },
  {
    id: 'act-4',
    text: 'Sara started the Node.js Track',
    timestamp: '2d ago',
  },
]
