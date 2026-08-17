import { useEffect, useState } from 'react'
import { Box, IconButton } from '@chakra-ui/react'
import { Check, Copy } from 'lucide-react'
import { highlightCode, isSupportedLang } from './highlighter'

interface CodeBlockProps {
  code: string
  language?: string
}

/**
 * Shiki is lazy-loaded (it's a large dependency) and only knows the
 * languages isSupportedLang recognizes -- anything else falls back to
 * plain, unhighlighted text rather than pulling in an arbitrary grammar.
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const supported = isSupportedLang(language)
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!supported) return

    let cancelled = false
    void highlightCode(code, language).then((highlighted) => {
      if (!cancelled) setHtml(highlighted)
    })

    return () => {
      cancelled = true
    }
  }, [code, language, supported])

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box position="relative" role="group" my={4}>
      <IconButton
        aria-label={copied ? 'Copied' : 'Copy code'}
        size="xs"
        variant="ghost"
        position="absolute"
        top={2}
        right={2}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        _focusVisible={{ opacity: 1 }}
        onClick={() => void handleCopy()}
        zIndex={1}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
      {html && supported ? (
        <Box
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="l2"
          overflowX="auto"
          fontSize="sm"
          css={{ '& pre': { padding: '1rem', margin: 0, background: 'transparent !important' } }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <Box
          as="pre"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="l2"
          p={4}
          overflowX="auto"
          fontSize="sm"
          fontFamily="mono"
          bg="bg.subtle"
        >
          <code>{code}</code>
        </Box>
      )}
    </Box>
  )
}
