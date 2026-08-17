import { getSingletonHighlighterCore } from 'shiki/core'
import { createOnigurumaEngine } from 'shiki/engine/oniguruma'

/**
 * Fine-grained Shiki bundle: only these ten languages and two themes are
 * ever loaded, as a lazy chunk pulled in on first code block render. The
 * top-level `shiki`/`codeToHtml` convenience import pulls in every
 * language Shiki knows (100+ grammars, several MB) regardless of what's
 * actually used -- this is the documented fine-grained-bundle escape hatch
 * (https://shiki.style/guide/bundles#fine-grained-bundle).
 */
const LANG_LOADERS = {
  ts: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  js: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  md: () => import('shiki/langs/markdown.mjs'),
} as const

export type SupportedLang = keyof typeof LANG_LOADERS

export function isSupportedLang(lang: string | undefined): lang is SupportedLang {
  return lang !== undefined && lang in LANG_LOADERS
}

function getHighlighter() {
  return getSingletonHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: Object.values(LANG_LOADERS).map((load) => load()),
    engine: createOnigurumaEngine(import('shiki/wasm')),
  })
}

export async function highlightCode(code: string, lang: SupportedLang): Promise<string> {
  const highlighter = await getHighlighter()
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
}
