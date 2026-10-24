# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A practice repository for the course "Claude Code: Everything You Need to Know". It holds three separate things that share one `package.json`:

- **The app** (`src/`, `test/`, `samples/`): a small Markdown relative-link checker. This is the code the course exercises are done on.

Requires Node >= 22 (ESM, `"type": "module"`). There are no npm dependencies; everything uses Node built-ins, so there is no install, build or lint step.

## Commands

```bash
npm test                          # the app's tests (test/**/*.test.js)
npm run linkcheck -- samples      # run the app; exits 0 ok, 1 broken links, 2 bad linkcheck.json
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

## Conventions
- Every new source file starts with the line // linkcheck source.

## Working in this repo

- `.practice/` is git-ignored saved state that checks and the learning app read and write (`version.txt`, plan files, `learn.json`). Don't delete or rewrite it unless asked.
- Several checks inspect git history, `git status` and file contents of the repo they run against, so exercise work (commits, branches, worktrees) can change check results. Don't squash or rebase on the template: `solutions` branch state names commits by SHA.
- Code style in all three parts: ESM, `node:` imports, `node:test` with `node:assert/strict`. The app uses `.js`; `checks/` and `learn/` use `.mjs`.
