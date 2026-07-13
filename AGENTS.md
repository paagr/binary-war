# ms-dos

Vite + vanilla JS project. Webcam → ASCII art canvas filter.

## Commands

| `npm run dev`   | Start Vite dev server  |
| `npm run build` | Production build        |

No test, lint, typecheck, or format commands exist.

## Project structure

- `index.html` — app shell with `<video>` + `<canvas>`, loads `/src/main.js`
- `src/main.js` — all app logic (webcam capture, brightness analysis, ASCII rendering, DPR-aware canvas)
- `src/style.css` — fullscreen body, `video { display: none }`
- `public/favicon.svg` — static asset

## Notes

- Webcam via `navigator.mediaDevices.getUserMedia({ video: true })`. Falls back to procedural noise if denied.
- Canvas is DPR-aware (`window.devicePixelRatio`).
- `.gitignore` excludes `*.mp3` — audio source files should not be committed.
- No CI, no tests, no linting/formatting tooling.

## Response Calibration

Match output length to task complexity — no preamble, no trailing summary.

- **Simple questions** (1-2 sentences): direct answer
- **Lookups**: one short paragraph + file:line reference
- **Single-file changes**: brief description + show the diff
- **Multi-file/complex work**: brief plan → execute → 1-2 sentence summary
- **Never**: add trailing summaries that restate the diff, explain what you're about to do before every tool call, pad with caveats

## Laziness Ladder (Before Writing Code)

The best code is the code you don't write. Stop at the **first rung that holds**:

1. **Does the standard library / runtime already do this?** — use it
2. **Does a browser built-in cover it?** — use it
3. **Does an already-installed dependency solve it?** — use it
4. **Can it be one line?** — make it one line
5. **Only then** — write the minimum that works

Default to deletion over addition, boring over clever, fewest files possible.

**Lazy, not negligent.** Never applies to input validation, error handling that prevents data loss, or anything explicitly requested.

## Guardrails

### Read Before Edit
Never change code you haven't read. Open the file, trace the callers, understand the context before editing.

### 2-Iteration Limit
If an approach fails after **2 attempts**, stop, summarize what you tried, present 2-3 alternatives with trade-offs, and ask which direction to take.

### Bug Fix Scope
Stay confined to files directly related to the bug. Don't refactor adjacent code, don't upgrade dependencies, don't touch outside the blast radius.

### Verify After Every Fix
Run `npm run build` and verify it passes before moving on. Never stack untested fixes.

### Name the Cause
Before committing a fix, be able to name the specific cause in one sentence. If the sentence requires "I think" or "maybe", gather more signal first. Especially true for CSS/canvas/rendering bugs.

### Completeness Is Cheap
When the complete version costs minutes more than the shortcut, do the complete thing — every edge case, error path. Bounded by scope: finish the unit you're deliberately touching, don't expand it.

### Surface Conflicts, Don't Average
When two existing patterns contradict, pick one and flag the other for cleanup. Don't write code that satisfies both.

### Fail Loud
State it explicitly when a test was skipped, a feature wasn't exercised end-to-end, or anything was left unverified. Never claim "done" when something was skipped or mocked.

### Plan Before Multi-File Changes
Before any change touching **3+ files**, outline the plan first — list every file, what changes, what could break — and get approval.

### No AI Fingerprints in Git
No `Co-Authored-By` lines mentioning AI, no robot emoji, no "AI-assisted" language, no badges in commit messages or PR descriptions. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
