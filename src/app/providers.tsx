import { RouterProvider } from 'react-router-dom'
import { Provider } from '@/shared/ui/provider'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { router } from './router'

export function Providers() {
  return (
    <Provider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </Provider>
  )
}
