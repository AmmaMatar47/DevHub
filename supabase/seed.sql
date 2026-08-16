-- Minimal test seed: just enough to exercise every part of the doc_nodes
-- model (all 4 depths, all 3 statuses, all 3 origins) plus tags. Not real
-- content -- that's a separate, later task. Safe to run repeatedly:
-- deterministic UUIDs + ON CONFLICT DO NOTHING.
--
-- No author_id/last_edited_by is set -- there's no real profiles row to
-- point at yet (team members are invited from the dashboard, not seeded).

-- ---------------------------------------------------------------------------
-- React -> Hooks -> useState -> Common mistakes (full depth 0..3 chain,
-- everything published)
-- ---------------------------------------------------------------------------

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position")
values ('c0ffee00-0000-0000-0000-000000000001', null, 'react', 'React', 'section', 'published', 0)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position")
values ('c0ffee00-0000-0000-0000-000000000002', 'c0ffee00-0000-0000-0000-000000000001', 'hooks', 'Hooks', 'section', 'published', 0)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position", content_md)
values (
  'c0ffee00-0000-0000-0000-000000000003',
  'c0ffee00-0000-0000-0000-000000000002',
  'use-state',
  'useState',
  'page',
  'published',
  0,
  $md$# useState

`useState` is the hook that gives a function component its own local, mutable
state between renders.

```js
const [count, setCount] = useState(0)
```

Key points:

- Calling the setter schedules a re-render with the new value
- State updates are not merged the way `this.setState` was in class components
- Pass a function to the setter when the next value depends on the previous one
$md$
)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position", content_md)
values (
  'c0ffee00-0000-0000-0000-000000000004',
  'c0ffee00-0000-0000-0000-000000000003',
  'common-mistakes',
  'Common mistakes',
  'page',
  'published',
  0,
  $md$# Common useState mistakes

A few patterns that look reasonable but cause bugs.

- Mutating state directly instead of calling the setter
- Reading a state variable right after calling its setter and expecting it to
  have already updated
- Passing a freshly-built object or array as the *initial* value on every
  render instead of using the lazy initializer

```js
// wrong: recreates the array on every render
const [items, setItems] = useState(buildInitialItems())

// right: buildInitialItems() only runs once
const [items, setItems] = useState(() => buildInitialItems())
```
$md$
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Node.js -> three depth-1 siblings covering the remaining statuses/origins
-- ---------------------------------------------------------------------------

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position")
values ('c0ffee00-0000-0000-0000-000000000011', null, 'nodejs', 'Node.js', 'section', 'published', 1)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position", content_md)
values (
  'c0ffee00-0000-0000-0000-000000000012',
  'c0ffee00-0000-0000-0000-000000000011',
  'node-fundamentals',
  'Node fundamentals',
  'page',
  'published',
  0,
  $md$# Node.js fundamentals

Node runs JavaScript outside the browser using the V8 engine plus a set of
built-in modules for I/O.

```js
import { readFile } from 'node:fs/promises'

const data = await readFile('./config.json', 'utf8')
```

Core ideas:

- Everything I/O-related is non-blocking by default
- The event loop is what lets a single thread handle many concurrent operations
- CommonJS (`require`) and ES modules (`import`) can both be used, but not
  mixed in the same file
$md$
)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, "position", content_md)
values (
  'c0ffee00-0000-0000-0000-000000000013',
  'c0ffee00-0000-0000-0000-000000000011',
  'express-fundamentals',
  'Express fundamentals',
  'page',
  'draft',
  1,
  $md$# Express fundamentals (draft)

Express is a minimal HTTP framework built on top of Node's `http` module.

```js
import express from 'express'

const app = express()
app.get('/health', (req, res) => res.json({ ok: true }))
app.listen(3000)
```

Still to cover:

- Middleware ordering
- Error-handling middleware signature
- Router-level vs app-level middleware
$md$
)
on conflict do nothing;

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, origin, "position")
values (
  'c0ffee00-0000-0000-0000-000000000014',
  'c0ffee00-0000-0000-0000-000000000011',
  'error-handling',
  'Error handling',
  'page',
  'needs_review',
  'generated',
  2
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

insert into public.tags (id, slug, name) values
  ('7a600000-0000-0000-0000-000000000001', 'react', 'React'),
  ('7a600000-0000-0000-0000-000000000002', 'nodejs', 'Node.js'),
  ('7a600000-0000-0000-0000-000000000003', 'hooks', 'Hooks'),
  ('7a600000-0000-0000-0000-000000000004', 'fundamentals', 'Fundamentals')
on conflict do nothing;

insert into public.doc_tags (node_id, tag_id) values
  ('c0ffee00-0000-0000-0000-000000000003', '7a600000-0000-0000-0000-000000000001'), -- useState -> react
  ('c0ffee00-0000-0000-0000-000000000003', '7a600000-0000-0000-0000-000000000003'), -- useState -> hooks
  ('c0ffee00-0000-0000-0000-000000000004', '7a600000-0000-0000-0000-000000000003'), -- Common mistakes -> hooks
  ('c0ffee00-0000-0000-0000-000000000012', '7a600000-0000-0000-0000-000000000002'), -- Node fundamentals -> nodejs
  ('c0ffee00-0000-0000-0000-000000000012', '7a600000-0000-0000-0000-000000000004')  -- Node fundamentals -> fundamentals
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Constraint proofs (verified against the linked project, then commented
-- out -- both must stay rejected; uncomment locally to re-check after
-- touching the depth or cycle triggers).
-- ---------------------------------------------------------------------------

-- Depth 4 under "Common mistakes" (already at depth 3) must be rejected:
--
-- insert into public.doc_nodes (parent_id, slug, title, kind, status)
-- values ('c0ffee00-0000-0000-0000-000000000004', 'too-deep', 'Too deep', 'page', 'draft');
--
-- ERROR:  23514: new row for relation "doc_nodes" violates check
-- constraint "doc_nodes_depth_check"

-- Moving "React" under its own descendant "useState" must be rejected:
--
-- update public.doc_nodes set parent_id = 'c0ffee00-0000-0000-0000-000000000003'
-- where id = 'c0ffee00-0000-0000-0000-000000000001';
--
-- ERROR:  P0001: Cannot move node c0ffee00-0000-0000-0000-000000000001
-- under its own descendant
