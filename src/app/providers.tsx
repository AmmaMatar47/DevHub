import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Provider } from '@/shared/ui/provider'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { router } from './router'

const queryClient = new QueryClient()

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </Provider>
    </QueryClientProvider>
  )
}
