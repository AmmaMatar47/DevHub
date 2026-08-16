import { Button, Code, Stack, Text } from '@chakra-ui/react'
import { Component, type ErrorInfo, type PropsWithChildren } from 'react'
import { PageHeader } from './PageHeader'

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught error in app tree:', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    return (
      <Stack gap={6} p={{ base: 6, lg: 10 }}>
        <PageHeader
          title="Something went wrong"
          description="An unexpected error stopped this page from rendering."
        />
        <Stack gap={4} maxW="xl">
          <Text color="fg.muted" fontSize="sm">
            The error has been logged to the console. You can try reloading this section.
          </Text>
          <Code p={3} borderRadius="l1" fontSize="xs" color="error" bg="bg.subtle" overflowX="auto">
            {error.message}
          </Code>
          <Button
            alignSelf="start"
            onClick={this.handleReset}
            bg="accent.solid"
            color="accent.contrast"
            _hover={{ bg: 'accent.hover' }}
          >
            Try again
          </Button>
        </Stack>
      </Stack>
    )
  }
}
