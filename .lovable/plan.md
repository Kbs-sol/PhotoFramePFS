# ChitraFrame — GitHub-Native AI Growth Agent (with Session Memory)

Same GitHub-native architecture as before, now with **explicit run-to-run memory** so the agent picks up exactly where it left off — no matter how many days pass between sessions.

You are the operator. You trigger the agent from any chat tool (Genspark, Claude, ChatGPT). You add your own suggestions at the end. The agent writes tomorrow's brief for itself.

---

## The full flow, plain English

1. **You open your AI chat** (Genspark) and say *"Run today's ChitraFrame session."*
2. The AI's **first action** is always: read `.agent/next-run.md` from GitHub. This file is the agent's memory of *"what I was going to do next + what the human told me to focus on."*
3. The AI dispatches `agent-fetch-data.yml` with scopes derived from `next-run.md` (e.g. *"focus GSC on devotional category, skip competitor scan this time"*).
4. GitHub Actions pulls fresh data → uploads artifact.
5. AI analyzes → drafts PRs via `agent-apply-changes.yml`.
6. AI shows you the summary in chat: *"Opened 4 PRs. Here's what each does. Approve on GitHub."*
7. **You give feedback in chat**: *"Good. Tomorrow focus on cricket stadium products and stop pushing Ganesha SEO — competition is too heavy."*
8. The AI's **last action** is always: dispatch `agent-write-next-brief.yml` with a fresh `next-run.md` containing:
   - Unfinished items from today
   - Your explicit instructions
   - Hypotheses to test tomorrow
   - Data ranges/scopes to pull next time
9. Next day (or next week — doesn't matter), you say *"Run today's session"* → step 2 → cycle continues, fully aware.

**You are always in the loop, but never doing manual work.** The agent's memory lives in the repo, versioned in git, editable by you.

---

## The memory files (all in `.agent/`)

| File | Written by | Read at | Purpose |
|---|---|---|---|
| `instructions.md` | You (rarely) | Every run, first step | Permanent rules: brand voice, forbidden topics, price floor, review cadence |
| `focus.md` | You + agent | Every run, first step | Current strategic priorities — reviewed weekly |
| `next-run.md` | **Agent, last step of every run** | **Every run, first step** | Tomorrow's brief. Living document. |
| `history.md` | Agent, last step | On demand | Append-only log: date, actions, PRs, outcomes |
| `feedback-inbox.md` | Agent, first step (auto-populated) | First step | Aggregated `@agent` comments from merged/closed PRs in last 30 days |
| `decisions.jsonl` | Agent, last step | Weekly reflection | Machine-readable log: `{date, hypothesis, action, expected_lift, actual_lift, verdict}` |

### `next-run.md` template

Every session, the agent overwrites this file with something like:

```markdown
# Next Run — 2026-07-02

## Human directives (from last session)
- Focus on cricket stadium products this week — new IPL season starts July 15
- Stop pushing Ganesha SEO for now, competition too heavy
- Try a bundle offer for "any 2 devotional prints"

## Carried over (I ran out of budget/time)
- Rewrite meta for /product/porsche-911-heritage (still pos #18)
- Draft blog: "Cricket wall art for boys' bedrooms" (outline ready in drafts/)

## Hypotheses to test
- H1: Adding "IPL 2026" to cricket product titles will lift CTR in GSC (measure after 7 days)
- H2: Bundle price ₹1,299 for 2 A4 devotional will lift AOV (measure after 14 days)

## Data to pull next run
- GSC: last 14 days, filter to /product/cricket-* and /product/porsche-*
- Razorpay: last 7 days orders + AOV
- GA4: cart abandonment funnel, last 7 days
- Skip: competitor scan (did it 2 days ago, ran again would waste budget)

## Session budget
- Max 5 PRs
- Max 1 blog post
- Estimated LLM cost: ₹40
```

You can open this file on GitHub mobile any time between sessions and hand-edit it. The agent respects whatever it finds.

---

## Two GitHub repos, two secret buckets (unchanged)

| Bucket | Where | What lives here |
|---|---|---|
| **Website runtime secrets** | Cloudflare Pages → Environment Variables | Razorpay, Supabase service key, Cloudinary, Resend — used by the live site |
| **Agent workflow secrets** | GitHub → Repo Settings → Secrets and variables → Actions | Same keys duplicated here + GSC service account JSON + GA4 service account JSON + Semrush key (optional) |

---

## Repo structure to add

```text
PhotoFramePFS/
├── .github/
│   └── workflows/
│       ├── agent-fetch-data.yml         # dispatch: pull analytics JSON
│       ├── agent-apply-changes.yml      # dispatch: takes AI-authored diff, opens PR
│       ├── agent-publish-blog.yml       # dispatch: MDX blog post → PR
│       ├── agent-write-next-brief.yml   # dispatch: writes/updates .agent/next-run.md
│       └── agent-full-report.yml        # dispatch: weekly bundle
├── .agent/
│   ├── instructions.md                  # your permanent rules
│   ├── focus.md                         # current strategic priorities
│   ├── next-run.md                      # AGENT MEMORY — read first, written last
│   ├── history.md                       # append-only log
│   ├── feedback-inbox.md                # PR comments harvested
│   ├── decisions.jsonl                  # machine-readable decision log
│   ├── prompts/
│   │   ├── session-open.md              # exact prompt: "read next-run.md, plan today"
│   │   ├── session-close.md             # exact prompt: "write next-run.md for tomorrow"
│   │   ├── seo-audit.md
│   │   ├── blog-post.md
│   │   ├── competitor-scan.md
│   │   └── weekly-brief.md
│   └── scripts/
│       ├── fetch-gsc.ts
│       ├── fetch-ga4.ts
│       ├── fetch-razorpay.ts
│       ├── fetch-supabase.ts
│       ├── fetch-cloudinary.ts
│       ├── scrape-competitors.ts
│       ├── harvest-pr-feedback.ts       # scans PR comments → feedback-inbox.md
│       └── package-report.ts
└── docs/
    ├── AGENT_SETUP.md                   # click-by-click 45-min setup
    ├── AGENT_TOOLS.md                   # tool schemas for Genspark/Claude/ChatGPT
    └── AGENT_PROMPTS_LIBRARY.md         # 20 ready-to-paste session starters
```

---

## The 5 workflows

### 1. `agent-fetch-data.yml`
Input: `sources`, `days`, `raw`, `focus_filter` (from next-run.md).
Output: `report.json` + raw JSONs as workflow artifact. First step of every run.

### 2. `agent-apply-changes.yml`
Input: `changes_json` (base64), `branch_name`, `pr_title`, `pr_body`, `auto_merge`.
Output: pushes branch + opens PR. Called 1–N times per session.

### 3. `agent-publish-blog.yml`
Input: `slug`, `title`, `mdx_content`, `hero_image_url`.
Fast path for blog PRs.

### 4. `agent-write-next-brief.yml` ← NEW
Input: `next_run_md` (the new brief), `history_append` (one-line log entry), `decisions_append` (JSONL rows).
Behavior: overwrites `.agent/next-run.md`, appends to `history.md` and `decisions.jsonl` on `main` directly (this is trusted meta-content, not code — no PR needed).
**This is the last step of every session, always.**

### 5. `agent-full-report.yml`
Weekly bundle. Optional. Emails brief via Resend.

---

## How the chat tool drives it

You give your AI chat tool 4 tools + a system prompt:

| Tool | GitHub API | Purpose |
|---|---|---|
| `read_repo_file` | `GET /repos/.../contents/{path}` | Read `next-run.md`, `instructions.md`, `focus.md`, `feedback-inbox.md`, source files |
| `trigger_workflow` | `POST /repos/.../actions/workflows/{file}/dispatches` | Kick off any of the 5 workflows |
| `get_latest_run_artifact` | `GET /repos/.../actions/runs/{id}/artifacts` | Fetch the JSON |
| `list_recent_prs` | `GET /repos/.../pulls?state=all&per_page=20` | See what merged/rejected since last run |

### Session-open prompt (you paste this into Genspark once, save as a preset)

```text
You are the ChitraFrame Growth Operator, a senior D2C business development manager + SEO expert.
Your job: run one growth session against the PhotoFramePFS repo.

Session protocol — follow in order, never skip:

1. Read .agent/next-run.md — this is your memory of what to do today.
2. Read .agent/instructions.md and .agent/focus.md for permanent rules and priorities.
3. Read .agent/feedback-inbox.md for human comments on past PRs.
4. Dispatch agent-fetch-data.yml with scopes from next-run.md. Wait for artifact.
5. Analyze the artifact. Cross-reference with instructions/focus/feedback.
6. Draft PRs via agent-apply-changes.yml (max = session budget from next-run.md).
7. Report to the human in chat: what you did, what you saw, what surprised you.
8. Ask the human: "Any directives for tomorrow?"
9. Wait for human input.
10. Dispatch agent-write-next-brief.yml with:
    - Carried-over items you couldn't finish
    - Human directives from step 9
    - Hypotheses to test
    - Data scopes for next run
    - Session budget for next run

Never skip step 1 or step 10. Those are your memory.
Never merge PRs yourself — humans approve on GitHub.
Never touch files under .agent/ except via agent-write-next-brief.yml.
```

### Session-close prompt (Genspark uses this internally, but you can also say it explicitly)

```text
Wrap this session:
1. Summarize in 5 bullets what happened.
2. Ask me for tomorrow's directives.
3. When I answer, write .agent/next-run.md with:
   - # Next Run — {tomorrow's date}
   - ## Human directives (my answer, verbatim)
   - ## Carried over (unfinished items from today)
   - ## Hypotheses to test (with measurement window)
   - ## Data to pull next run (scopes, filters)
   - ## Session budget (max PRs, max blog posts, est. LLM cost)
4. Dispatch agent-write-next-brief.yml.
5. Confirm to me the brief is saved.
```

---

## Human suggestion loop — 3 ways to steer the agent

You can inject direction at any of these points:

1. **In chat, end of session** (most common): *"Tomorrow focus on cricket, drop Ganesha, try bundles."* → agent writes to `next-run.md`.
2. **Between sessions, on GitHub mobile**: edit `.agent/next-run.md` directly. Add a `## Human override` section. Agent reads it next run.
3. **On any PR, via comment**: `@agent stop suggesting XL frames for products under ₹800`. Harvested into `feedback-inbox.md` on the next run.

All three converge on the same behavior: the next session's first read includes your directive.

---

## PAT scopes (unchanged)

Fine-grained PAT scoped to `PhotoFramePFS`:
- Actions: Read + Write
- Contents: Read + Write
- Pull requests: Read + Write
- Metadata: Read
- Expiration: 90 days

---

## GitHub repo secrets (unchanged)

| Secret | Source |
|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | Google Cloud → IAM → SA → JSON key (grant Owner on GSC property) |
| `GA4_SERVICE_ACCOUNT_JSON` + `GA4_PROPERTY_ID` | Same SA + property ID |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Razorpay dashboard |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |
| `CLOUDINARY_URL` | Cloudinary dashboard |
| `RESEND_API_KEY` | Optional |
| `SEMRUSH_API_KEY` | Optional |

---

## PR decision block (unchanged, still key)

Every PR the agent opens carries a decision block linking back to which `next-run.md` line spawned it:

```markdown
## Agent decision
**Source directive:** next-run.md 2026-07-01 → "focus cricket stadium products"
**Hypothesis:** "cricket-stadium-lights-mumbai" ranks #16 for 'cricket wall art'. Retitle to include 'IPL 2026' should lift CTR 30% within 14 days.

## What changed
- src/content/products/cricket-stadium-lights-mumbai.md

## Rejection reasons to consider
- Do NOT merge if you dislike IPL branding on evergreen products

## Feedback for next run
Reply with @agent notes. I read them tomorrow.
```

---

## Realistic timeline (unchanged)

- **Day 1 (60 min you):** GSC/GA4 SA setup, add secrets, create PAT. I ship all workflows + scripts + docs.
- **Day 2:** First session. First PRs. First `next-run.md` written.
- **Week 1:** 5–10 PRs merged.
- **Month 1:** Rhythm locked. ~20 min/week your time.
- **Month 2–3:** Organic movement. Agent has ~60 PRs + 30 next-run.md revisions of history to reason from.

---

## What I ship as the first PR

1. `.github/workflows/agent-*.yml` × 5
2. `.agent/scripts/*.ts` (bun runtime)
3. `.agent/prompts/*.md` (session-open, session-close, seo-audit, blog-post, competitor-scan, weekly-brief)
4. `.agent/instructions.md` seed (brand voice: warm gallery-quality, Made-in-India, no kitsch, ₹449 floor)
5. `.agent/focus.md` seed (Diwali runway, devotional + automotive differentiators)
6. `.agent/next-run.md` seed (day-1 kickoff brief: baseline audit)
7. `.agent/history.md` empty
8. `.agent/decisions.jsonl` empty
9. `docs/AGENT_SETUP.md`
10. `docs/AGENT_TOOLS.md` (OpenAI functions + MCP manifest + Genspark tool spec — all 3 formats)
11. `docs/AGENT_PROMPTS_LIBRARY.md` (20 session starters)

Nothing on your live site changes. All future agent output is PRs you approve.

---

## Technical notes (skip if non-technical)

- `agent-write-next-brief.yml` writes to `main` directly using GitHub Actions bot commit — this is intentional. `.agent/` is meta-content, not production code, and gating it behind PRs would break the memory loop.
- `next-run.md` is git-versioned, so every past brief is recoverable via `git log .agent/next-run.md`.
- `decisions.jsonl` is JSONL for cheap append + easy analysis with `jq` / DuckDB later.
- Session-open and session-close prompts are versioned in the repo — the agent literally re-reads its own instructions each session, so improvements compound.
- PR feedback harvester uses `gh api` to grep comments matching `@agent .*` since last run's timestamp (stored in `history.md`).
- Budget enforcement: agent tracks `session_budget.prs_used` in a temp variable and stops calling `agent-apply-changes.yml` once hit — prevents runaway credit burn.
- All workflow runs are tagged with the `next-run.md` commit SHA that triggered them, so you can trace any PR back to the exact brief that spawned it.

---

## Two things I still need from you

1. **Confirm repo target:** ship this PR to `Kbs-sol/PhotoFramePFS` main. Yes/no?
2. **Confirm chat tool:** Genspark, Claude Desktop, ChatGPT custom GPT, or all three? Determines tool-schema format(s) I include.

Reply confirming, and I'll build the scaffold + docs in this Lovable project (you sync to your GitHub repo via the existing integration).
