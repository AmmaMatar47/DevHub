import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/dashboard/pages/HomePage'
import { TopicsPage } from '@/features/topics/pages/TopicsPage'
import { ArticlesPage } from '@/features/articles/pages/ArticlesPage'
import { QuizzesPage } from '@/features/quizzes/pages/QuizzesPage'
import { ReviewPage } from '@/features/review/pages/ReviewPage'
import { SnippetsPage } from '@/features/snippets/pages/SnippetsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/topics', element: <TopicsPage /> },
          { path: '/topics/:slug', element: <TopicsPage /> },
          { path: '/articles', element: <ArticlesPage /> },
          { path: '/articles/:slug', element: <ArticlesPage /> },
          { path: '/quizzes', element: <QuizzesPage /> },
          { path: '/review', element: <ReviewPage /> },
          { path: '/snippets', element: <SnippetsPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
