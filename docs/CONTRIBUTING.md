# Contributing

The goal is to keep this codebase fast to read and easy to extend. New features should slot into one of the existing module boundaries described in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local setup

```bash
npm install --legacy-peer-deps
cp .env.example .env       # optional during dev — empty .env still works
npm run dev                # Remotion Studio for visual iteration
npm run server             # API with hot reload
```

## Before you push

```bash
npm run check              # typecheck + lint + tests
npm run format             # prettier write
```

CI runs the same. PRs with failing checks won't merge.

## Style conventions

- **TypeScript everywhere.** No `any` (the lint rule is "warn"; fix before merging).
- **Imports relative within a module, alias-free.** This is a small repo.
- **No comments that restate code.** Use a comment only when the *why* is non-obvious (a constraint, a surprising edge case, a workaround).
- **Files stay under ~150 lines** unless there's a clear reason. Long files mean a missing module boundary.
- **Functions over classes** unless state is genuinely required.
- **No premature abstraction.** Three similar lines is fine. Wait for the fourth before extracting.

## Adding code

### A new data source
Walk through `server/collectors/` and copy `github.ts` as a template:
1. New file `server/collectors/<name>.ts` exports `collect<Name>(member, win): Promise<<Name>Signals | null>`.
2. Add `<Name>Signals` to `server/collectors/types.ts`.
3. Wire into `server/aggregator.ts`: extend `collectAll`, then optionally surface fields in `buildWrappedData`.
4. Add a test that the collector returns `null` when the relevant env var is absent.

### A new slide type
Walk through `src/scenes/`. Copy `NumbersScene.tsx` as a template:
1. New file `src/scenes/<Name>Scene.tsx` using `SceneBG` + animation helpers from `src/components/anim.ts`.
2. Pick or add a palette in `src/theme.ts`.
3. Register in `src/Wrapped.tsx`'s `SCENES` array with a duration in frames (multiple of 15 keeps the cadence musical).
4. Iterate visually with `npm run dev`; render a still with `npx remotion still Wrapped out/preview.png --frame=<n>`.
5. See `.claude/skills/design-reel-scene/SKILL.md` for the design playbook.

### A new music track
Use the workflow in `.claude/skills/find-cc0-music/SKILL.md`. The short version:
1. Pull a CC0 track from a verified source (the SoundSafari archive is the default).
2. Drop it at `public/music/<NN>-<slug>.mp3`.
3. Add the path to `TRACKS` in `src/music.ts`.
4. Add a test in `src/music.test.ts` covering the new track's inclusion.

### A new window keyword
Edit `server/window.ts` and `server/window.test.ts`. Don't forget to update the slash-command "Usage Hint" in Slack.

## Reviewer checklist

When reviewing a PR, ask:

- [ ] Does this slot into an existing module boundary, or does it create a new one with a clear contract?
- [ ] Does the code degrade gracefully when env vars / external services are unavailable?
- [ ] Is there a test for the pure logic (collectors that don't hit the network, aggregator, parsers)?
- [ ] If it touches the renderer, is there a still or short clip attached to the PR?
- [ ] Does it leak any secrets, message content, or PII into logs?
- [ ] Is `npm run check` green?

## Commit messages

Conventional-style is welcome but not enforced. The important thing is the *why* in the body, since the code shows the *what*.

```
feat(collectors): add Linear ticket signals

Why: weekly wraps were missing for non-eng teammates whose work
lives in Linear, not GitHub. The Linear API is free for orgs <250
and uses a single workspace token, so this fits the existing
trust model without adding per-user OAuth.
```
