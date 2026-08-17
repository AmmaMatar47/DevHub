# DevHub

DevHub is the team's internal learning and knowledge platform — a home for articles, quizzes with
spaced repetition, reusable code snippets, and search, built for a six-person development team.
The app shell, Supabase data layer, and authentication have landed; the documentation tree UI,
content rendering, and editor are still ahead.

## Getting started

```bash
pnpm install
pnpm dev
```

Other scripts:

```bash
pnpm build      # typecheck + production build
pnpm preview    # preview the production build locally
pnpm lint        # eslint
pnpm format      # prettier --write
pnpm typecheck   # tsc, no emit
```

## Folder structure

```
src/
├── app/                  # router, providers, layouts (AppLayout, AuthLayout)
├── features/             # one folder per feature area (dashboard, topics, articles, ...)
│   └── <feature>/
│       ├── components/   # feature-local components
│       └── pages/        # routed page components
├── shared/
│   ├── ui/                # Chakra CLI snippet output (provider, color-mode)
│   ├── components/        # cross-feature components (PageHeader, EmptyState, ...)
│   └── hooks/              # cross-feature hooks
├── lib/                  # theme.ts — the Chakra system config
└── types/                # shared TypeScript types
```

**Import rule:** a feature may import from `shared/` and `lib/`, but never reach into another
feature's internals (e.g. `features/articles` must not import from `features/topics/components`).
If two features need the same thing, promote it to `shared/`.

The `@/` path alias points at `src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).

## Theme

All colours are defined as semantic tokens in [`src/lib/theme.ts`](src/lib/theme.ts) and consumed
by name everywhere else — there should be zero hard-coded hex values outside that file. To change
a colour, edit the token there and it updates in both light and dark mode automatically.

| Token                                                                               | Purpose                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `bg.canvas` / `bg.surface` / `bg.subtle`                                            | Page background, card background, recessed background                              |
| `border.default` / `border.strong`                                                  | The only two border colours in the app                                             |
| `fg.default` / `fg.muted` / `fg.subtle`                                             | Text hierarchy                                                                     |
| `accent.solid` / `accent.hover` / `accent.subtle` / `accent.fg` / `accent.contrast` | Ochre accent — primary actions, active nav, focus rings. Used sparingly by design. |
| `success` / `error` / `warning` / `info`                                            | Status colours                                                                     |

Typography: **IBM Plex Sans** for UI/body text, **IBM Plex Mono** for code, labels, metadata, and
numbers (loaded via Google Fonts in `index.html`). Border radii are kept small (4–6px) and surfaces
are separated with borders rather than shadows, in line with the "quiet developer tool" design
direction.

Colour mode (light / dark / system) is handled by `next-themes`, wired up in
`src/shared/ui/provider.tsx` and `src/shared/ui/color-mode.tsx`, and exposed to users via
`src/shared/components/ColorModeToggle.tsx` in the header and the Appearance section of Settings.

## Supabase

The data layer landed in M1: a Supabase client (`src/lib/supabase.ts`), the `profiles`/`doc_nodes`/
`doc_versions`/`tags` schema, and Row Level Security on every table. Copy `.env.example` to
`.env.local` and fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from your project's
Settings > API page. `pnpm supabase login` once, then `pnpm supabase link` to work with migrations
locally (`db:reset`, `db:diff`, `db:push`, `db:types`).

**Signup is invite-only.** New team members are created from the Supabase dashboard
(Authentication > Users > Invite), never through public signup — `auth.enable_signup` is `false` in
`supabase/config.toml`. Every new `auth.users` row gets a matching `profiles` row automatically
(role `member`, `display_name` falling back to the email's local-part when no name is set on the
account) via the `handle_new_user` trigger.

**Password resets are dashboard-only, for now.** The free plan's built-in email sending is
rate-limited to a handful of sends per hour, so there's no in-app "forgot password" flow — an admin
resets a user's password from the Supabase dashboard (Authentication > Users > select user > Reset
password) when asked. This is worth revisiting once the project has its own SMTP configured.

## Authentication

Sign-in (`/login`, email + password only — no sign-up, no OAuth) lives in `src/features/auth/`.
`AuthProvider` (mounted in `app/providers.tsx`) is the single source of truth for session, profile,
and role; `RequireAuth` guards every route under `AppLayout` and redirects to `/login` (preserving
the originally requested path) while `RequireRole` gates by minimum role for later milestones.

A role change made directly in the database won't reach a signed-in session until its JWT
refreshes — `AuthProvider` detects the mismatch between `profiles.role` and the JWT's `user_role`
claim, attempts one `refreshSession()`, and shows a non-blocking "sign in again" notice if that
doesn't resolve it.

**`is_active` is enforced by the database, not the client.** A deactivated user's JWT is still
cryptographically valid and still carries `user_role` — stamping `is_active` into the JWT hook
would have the same staleness problem as the role claim, just relocated, since a JWT can't be
revoked early. Instead, `private.is_enabled()` (a `STABLE SECURITY DEFINER` function, one indexed
lookup per statement) is `AND`ed into every RLS policy that grants read or write access, checking
`profiles.is_active` live on every query. A trigger on `profiles` additionally deletes the user's
`auth.sessions` rows the moment `is_active` flips to `false`, which invalidates their refresh token
so `supabase-js` can no longer silently renew access — belt and braces on top of `is_enabled()`,
not a replacement for it. The client also checks `is_active` (on session bootstrap and on every
profile refetch) and signs the user out immediately with a clear message, but that's UX only: if it
were ever bypassed or stale, every query the deactivated user made would still come back empty.

### Bootstrapping the first admin

Every role after the first has to be granted by an existing admin through the app — but the very
first admin has no admin to ask. Promote them directly against the database instead:

```sql
update public.profiles
set role = 'admin'
where id = '<their auth.users id, from the dashboard>';
```

Run this from the Supabase SQL editor or a direct `psql` connection — **never** through the API
(the `anon`/`authenticated` REST endpoints, or a client-side call). This isn't optional: the
`prevent_profile_privilege_escalation` trigger deliberately blocks any role or `is_active` change
that arrives through a real PostgREST request unless the caller is already an admin, precisely to
stop a member from granting themselves admin. Direct SQL access has no such request context, which
is what makes it the only way to create the first admin at all.

## Troubleshooting

**Creating a test user directly via SQL fails sign-in with a cryptic `500 "Database error
querying schema"`.** GoTrue's driver can't scan `NULL` out of `auth.users`' token columns
(`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change_token_current`,
`email_change`, `phone_change`, `phone_change_token`, `reauthentication_token`) — they need empty
strings, not `NULL`, which a plain `INSERT` leaves them as by default. Prefer creating users
through the dashboard (Authentication > Users > Invite), which sets these correctly; if you do need
to insert one directly (e.g. for a disposable test account), set all eight columns to `''`
explicitly.

**The email auth provider won't toggle on via `config.toml`.** `[auth.email] enable_signup` and
similar behavioural flags exist in `config.toml`, but the provider's own on/off switch is
dashboard-only in this CLI version (Authentication > Providers > Email) — there's no config.toml
key for it, so `supabase config push` can't touch it. If password sign-in fails with
`422 email_provider_disabled`, this is why.

## Contributing

There's no deployed environment — all testing happens on localhost — so the branch model is
deliberately flat:

```
main      → the only long-lived branch. Protected.
             PRs merge here, but ONLY on explicit instruction from the user
             after they have tested locally. Never push directly. Never
             self-merge.
feat/*    → cut from main, PR back into main.
fix/*     → same.
chore/*   → same.
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
`fix:`, `chore:`, `docs:`, ...), branch names are kebab-case, and commits are grouped into logical
units rather than one giant diff per PR.
