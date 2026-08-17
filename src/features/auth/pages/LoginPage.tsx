import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { PasswordInput } from '@/shared/components/PasswordInput'
import { useAuth } from '../context/AuthContext'
import { useSignIn } from '../api/useSignIn'
import { getSignInErrorMessage } from '../lib/signInErrors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LocationState {
  from?: Location
}

function getRedirectTarget(state: LocationState | null): string {
  if (!state?.from) return '/'
  return `${state.from.pathname}${state.from.search}`
}

export function LoginPage() {
  const { status, deactivatedNotice, dismissDeactivatedNotice } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const signIn = useSignIn()

  const state = (location.state as LocationState | null) ?? null
  const redirectTarget = getRedirectTarget(state)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Consume-once: capture the deactivation reason for this render, then
  // clear it from context so an unrelated future redirect to /login never
  // shows a stale "deactivated" message.
  useEffect(() => {
    if (deactivatedNotice) {
      // dismissDeactivatedNotice() updates AuthProvider's state from here, a
      // different component -- that has to happen post-commit in an effect,
      // not during render, so this setState is intentionally paired with it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormError('This account has been deactivated. Contact an admin if you think this is a mistake.')
      dismissDeactivatedNotice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'authenticated') {
    return <Navigate to={redirectTarget} replace />
  }

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (!password) {
      errors.password = 'Password is required.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!validate()) return

    try {
      await signIn.mutateAsync({ email: email.trim(), password })
      void navigate(redirectTarget, { replace: true })
    } catch (error) {
      setFormError(getSignInErrorMessage(error))
    }
  }

  return (
    <Stack gap={6}>
      <Stack gap={1}>
        <Heading as="h1" fontSize="xl" fontWeight="600">
          Sign in to DevHub
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          Access is invite-only. Contact an admin if you need an account.
        </Text>
      </Stack>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Stack gap={4}>
          <Field.Root invalid={!!fieldErrors.email} required>
            <Field.Label>Email</Field.Label>
            <Input
              type="email"
              name="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={signIn.isPending}
              borderColor="border.default"
              borderRadius="l1"
            />
            <Field.ErrorText>{fieldErrors.email}</Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={!!fieldErrors.password} required>
            <Field.Label>Password</Field.Label>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={signIn.isPending}
              borderColor="border.default"
              borderRadius="l1"
            />
            <Field.ErrorText>{fieldErrors.password}</Field.ErrorText>
          </Field.Root>

          {formError ? (
            <Text fontSize="sm" color="error" role="alert">
              {formError}
            </Text>
          ) : null}

          <Button
            type="submit"
            loading={signIn.isPending}
            disabled={signIn.isPending}
            bg="accent.solid"
            color="accent.contrast"
            _hover={{ bg: 'accent.hover' }}
          >
            Sign in
          </Button>
        </Stack>
      </form>
    </Stack>
  )
}
