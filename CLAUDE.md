# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A practice repository for the course "Claude Code: Everything You Need to Know". It holds three separate things that share one `package.json`:

- **The app** (`src/`, `test/`, `samples/`): a small Markdown relative-link checker. This is the code the course exercises are done on.
- **The checks** (`checks/`): one module per lesson that inspects a repository and reports PASS/FAIL.
- **The learning app** (`learn/`): a terminal UI that walks through lessons and uses the checks to turn steps green.

Requires Node >= 22 (ESM, `"type": "module"`). There are no npm dependencies; everything uses Node built-ins, so there is no install, build or lint step.

## Commands

```bash
npm test                          # the app's tests (test/**/*.test.js)
npm run test:checks               # tests of the checks and learn app (checks/test/*.test.mjs); about a minute
npm run linkcheck -- samples      # run the app; exits 0 ok, 1 broken links, 2 bad linkcheck.json
npm run check -- b-1              # run one lesson's check (ids: b-1..b-5, b-capstone, i-*, a-*)
npm run check -- all              # every lesson's check
npm run check -- b-1 --dir ../x   # check a different repository
npm run learn                     # the interactive learning app (needs a TTY)

node --test test/links.test.js                                  # one test file
node --test --test-name-pattern="title" test/links.test.js      # tests matching a name
node --test checks/test/learn-content.test.mjs                  # one checks-side test file
```

`npm test` deliberately excludes `checks/test/`; CI runs both.

## The app (`src/`)

- `links.js` `findLinks(markdown)` extracts link targets: inline links (with optional titles), reference-style links resolved through `[label]: target` definitions, skipping fenced code, inline code and images. Unresolved references are plain text, not links.
- `check-links.js` `brokenLinks(root, config)` walks `.md` files (skipping dot-folders and `node_modules`) and returns relative links whose file is missing. External (`scheme:`) links and `#fragment`-only links are ignored.
- `config.js` parses an optional `linkcheck.json` (`files`, `ignore`) at the scanned root; `cli.js` wires it together and owns the exit codes.
- `samples/` is a test fixture with intentionally broken links (`npm run linkcheck -- samples` is expected to report two). `test/links.test.js` depends on it, so don't "fix" those links.

## The checks (`checks/`)

- `checks/lessons/index.mjs` is the registry (course order). Each lesson module exports `title` and `items`; an item is `{ text, local?, check(repo) }` where `check` returns `true` or a string hint explaining what to fix. `local: true` marks items that read git-ignored state under `.practice/`, which CI can never see.
- Checks are read-only: they inspect files and git state through `repo.mjs` (`openRepo(dir)`), and never run Claude Code. When a check needs to see how a committed script calls `claude`, `stub-claude.mjs` runs it against a stand-in binary in a scratch repo with credentials stripped.
- `run.mjs` is the CLI. `--summary` (Progress workflow) and `--assert pass|fail` (Assert checks workflow) exist for CI. The invariant the template maintains: every check fails on the template's `main` and passes on its `solutions` branch. Assert checks only runs when the repository is a GitHub template, so it is skipped in copies.
- Shared helpers: `paths.mjs` (git status path parsing, plan files, test-file detection), `frontmatter.mjs`, `hooks.mjs`, `ignore.mjs`, `actions.mjs`, `workflow-script.mjs`, `marketplace.mjs`, `claude-args.mjs`, `worktrees.mjs`.
- Tests in `checks/test/` build throwaway git repos (`helpers.mjs`: `repo()`, `commit()`, `withRepo()`) and run the real checks against them.

## The learning app (`learn/`)

- `lib/flow.mjs` is a pure reducer, `reduce(state, event) -> { state, effects }`. It reads no files, clocks or terminal. `lib/main.mjs` is the only wiring: it feeds key presses, timers, file-watch events and check results in as events and carries effects (run a check, read git status, save, quit) out. Put behavior changes in `flow.mjs`, not `main.mjs`.
- `lib/render.mjs` draws a state to a screen; `copy.mjs` holds the UI strings; `theme.mjs`, `caps.mjs` and `plain.mjs` handle color and plain-text fallbacks (`LEARN_PLAIN`, `NO_COLOR`); non-TTY runs print a plain progress report instead of the UI.
- Checks run in a child process (`run-check.mjs`, via `verify.mjs`) so a slow item never freezes the screen. Slow items (those that start a test run) are listed in `SLOW` in `verify.mjs` by lesson and item index, and only run when the learner presses `r`. If you reorder items in a check that has an entry in `SLOW`, update it.
- Lesson content is `learn/lessons/<id>.md` in a custom format parsed by `lib/content.mjs` (front matter, `## intro`, `## steps`, `### W1 | ...` step headings, `- key: value` beats). A double-quoted value must be an exact quote of the course page; an unquoted value is the app's own words. Parse errors name the file and line and fail `learn-content.test.mjs`. Only the Beginner lessons have app content so far; the others are reachable through their check only.
- For every lesson that has a content file, `checks/test/learn-ladders.test.mjs` requires one scenario in `checks/test/ladders/<id>.mjs` per way an item can fail (it counts `return` statements that aren't `return true`), and each failure hint must match exactly one narrow question in the lesson file's `## ladder` section. Adding a new failure path to a check therefore means adding a scenario and a ladder question.
- Progress is saved to `.practice/learn.json`.

## Working in this repo

- `.practice/` is git-ignored saved state that checks and the learning app read and write (`version.txt`, plan files, `learn.json`). Don't delete or rewrite it unless asked.
- Several checks inspect git history, `git status` and file contents of the repo they run against, so exercise work (commits, branches, worktrees) can change check results. Don't squash or rebase on the template: `solutions` branch state names commits by SHA.
- Code style in all three parts: ESM, `node:` imports, `node:test` with `node:assert/strict`. The app uses `.js`; `checks/` and `learn/` use `.mjs`.
