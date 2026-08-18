import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { Box, chakra, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { CodeBlock } from './markdown/CodeBlock'
import { DocImage } from './markdown/DocImage'
import { DocImagesProvider } from './markdown/DocImagesProvider'

/**
 * The default hast-util-sanitize schema, extended only enough to survive
 * syntax highlighting and internal images: fenced code blocks carry a
 * `language-*` class, Shiki's dual-theme output puts its per-token colors in
 * an inline `style` attribute (CSS variables, so light/dark both ship in one
 * highlight pass), and doc images use a custom `image:{storage_path}` URL
 * scheme (see useUploadDocImage) that the default schema's `src` protocol
 * allowlist (http/https only) would otherwise silently strip. Nothing else
 * is added -- no raw HTML, no event handlers, no extra tags.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'image'],
  },
}

/**
 * react-markdown runs its own URL allowlist independently of rehype-sanitize
 * -- a hardcoded `/^(https?|ircs?|mailto|xmpp)$/i` check on every `href`/
 * `src` (see defaultUrlTransform), applied *after* sanitize and right before
 * handing the value to components as a prop. The schema change above only
 * satisfies rehype-sanitize; without this, react-markdown's own transform
 * still blanks `image:...` to `''` before DocImage ever sees it. Only `src`
 * gets the exception -- `href` (real links) keeps the unmodified default.
 */
function urlTransform(value: string, key: string): string {
  if (key === 'src' && value.startsWith('image:')) return value
  return defaultUrlTransform(value)
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children)
  return ''
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/**
 * A named top-level function (not an inline arrow in `components`) so `p`
 * below can compare a child's `.type` against this exact reference --
 * react-markdown creates elements typed as *this* component, not whatever
 * it happens to return internally (DocImage or chakra.img).
 */
function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  if (typeof src === 'string' && src.startsWith('image:')) {
    return <DocImage path={src.slice('image:'.length)} fallbackAlt={alt} />
  }
  return (
    <chakra.img src={typeof src === 'string' ? src : undefined} alt={alt} loading="lazy" maxW="full" borderRadius="l2" my={4} />
  )
}

const components: Components = {
  // Rendered as a real <h2>, not <h1> -- DocPageHeader already renders the
  // page's one semantic h1 from doc_nodes.title, and authors commonly open
  // content_md with its own `# Heading` that restates the same title.
  h1: ({ children }) => {
    const id = slugify(extractText(children))
    return (
      <Text as="h2" id={id} fontSize="2xl" fontWeight="700" mt={2} mb={4} css={{ scrollMarginTop: '5rem' }}>
        {children}
      </Text>
    )
  },
  h2: ({ children }) => {
    const id = slugify(extractText(children))
    return (
      <Text as="h2" id={id} fontSize="xl" fontWeight="700" mt={8} mb={3} css={{ scrollMarginTop: '5rem' }}>
        {children}
      </Text>
    )
  },
  h3: ({ children }) => {
    const id = slugify(extractText(children))
    return (
      <Text as="h3" id={id} fontSize="lg" fontWeight="600" mt={6} mb={2} css={{ scrollMarginTop: '5rem' }}>
        {children}
      </Text>
    )
  },
  // Markdown always puts inline `![]()` images inside a <p> -- fine for a
  // plain <img>, but DocImage renders a <figure> (block-level, plus a
  // caption), which browsers can't legally nest inside <p>. They silently
  // close the <p> early to recover, which desyncs React's reconciliation
  // from the real DOM (visible as bogus empty-src warnings on the orphaned
  // img nodes). A paragraph containing only image(s) renders as a <div>
  // instead; anything with real text still gets a real <p>.
  p: ({ children }) => {
    const childArray = Children.toArray(children)
    const isImageOnly =
      childArray.length > 0 && childArray.every((child) => isValidElement(child) && child.type === MarkdownImage)

    if (isImageOnly) {
      return <Box mb={4}>{children}</Box>
    }

    return (
      <Text as="p" mb={4}>
        {children}
      </Text>
    )
  },
  ul: ({ children }) => (
    <Box as="ul" pl={6} mb={4} css={{ listStyleType: 'disc' }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box as="ol" pl={6} mb={4} css={{ listStyleType: 'decimal' }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box as="li" mb={1}>
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box as="blockquote" borderLeftWidth="3px" borderColor="border.strong" pl={4} py={1} my={4} color="fg.muted">
      {children}
    </Box>
  ),
  hr: () => <Box as="hr" borderColor="border.default" my={8} />,
  a: ({ href = '', children }) => {
    const isExternal = /^https?:\/\//.test(href)
    if (isExternal) {
      return (
        <chakra.a href={href} target="_blank" rel="noopener noreferrer" color="accent.fg" textDecoration="underline">
          {children}
        </chakra.a>
      )
    }
    return (
      <RouterLink to={href}>
        <Text as="span" color="accent.fg" textDecoration="underline">
          {children}
        </Text>
      </RouterLink>
    )
  },
  img: MarkdownImage,
  table: ({ children }) => (
    <Box overflowX="auto" my={4}>
      <Box as="table" w="full" fontSize="sm">
        {children}
      </Box>
    </Box>
  ),
  th: ({ children }) => (
    <Box as="th" textAlign="left" borderBottomWidth="1px" borderColor="border.default" px={3} py={2} fontWeight="600">
      {children}
    </Box>
  ),
  td: ({ children }) => (
    <Box as="td" borderBottomWidth="1px" borderColor="border.default" px={3} py={2}>
      {children}
    </Box>
  ),
  // `pre` just unwraps -- `code` (below) decides the presentation, since
  // react-markdown substitutes `code`'s hast node with *our* component
  // before `pre` ever sees its children, so `pre` can't reliably detect a
  // raw `<code>` child once both are overridden.
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className }) => {
    const match = /language-(\w+)/.exec(className ?? '')
    if (match) {
      const code = extractText(children).replace(/\n$/, '')
      return <CodeBlock code={code} language={match[1]} />
    }
    return (
      <Box as="code" px="1" py="0.5" borderRadius="l1" bg="bg.subtle" fontFamily="mono" fontSize="0.875em">
        {children}
      </Box>
    )
  },
}

interface MarkdownContentProps {
  content: string
}

/**
 * The single markdown-rendering path every consumer uses. No raw HTML is
 * ever passed through (react-markdown only accepts markdown text, and
 * rehype-sanitize strips anything the schema above doesn't allow), so
 * content_md can safely come from any editor/admin without an XSS review
 * per document.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <DocImagesProvider content={content}>
      <Box maxW="70ch" lineHeight="prose" fontSize="md" color="fg.default">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, schema]]}
          urlTransform={urlTransform}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </Box>
    </DocImagesProvider>
  )
}
