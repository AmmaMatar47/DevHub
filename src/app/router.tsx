import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { HomePage } from '@/features/dashboard/pages/HomePage'
import { DocPage } from '@/features/docs/pages/DocPage'
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
          // Topics/Articles are superseded by the docs tree (M3) -- redirect
          // rather than 404, in case anything still links to the old paths.
          { path: '/topics', element: <Navigate to="/docs" replace /> },
          { path: '/topics/*', element: <Navigate to="/docs" replace /> },
          { path: '/articles', element: <Navigate to="/docs" replace /> },
          { path: '/articles/*', element: <Navigate to="/docs" replace /> },
          { path: '/docs/*', element: <DocPage /> },
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
