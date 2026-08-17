import { Center, Spinner } from '@chakra-ui/react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Wraps the AppLayout routes. Redirects to /login, preserving the attempted path. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <Center minH="100dvh" bg="bg.canvas">
        <Spinner size="lg" color="accent.solid" />
      </Center>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
