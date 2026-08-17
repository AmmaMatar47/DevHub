import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Provider } from '@/shared/ui/provider'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { EditModeProvider } from '@/features/docs/context/EditModeContext'
import { router } from './router'

const queryClient = new QueryClient()

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <ErrorBoundary>
          <AuthProvider>
            <EditModeProvider>
              <RouterProvider router={router} />
            </EditModeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </Provider>
    </QueryClientProvider>
  )
}
