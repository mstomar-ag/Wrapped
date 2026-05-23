---
name: find-cc0-music
description: Source verified CC0 / public-domain music for the Wrapped reel and add it to the rotation. Use when the user asks to "add a new track", "swap the music", or "find a better backing track". Returns a downloaded MP3 in `public/music/` and updates `src/music.ts`.
---

# find-cc0-music

A reliable workflow for adding a new royalty-free track to the Wrapped reel's music rotation. This skill exists because finding *truly* CC0 audio is a minefield — most "free music" sites are CC-BY (requires attribution) or "free for personal use" (not commercial). Use only the verified sources below.

## When to invoke

- User says: "add a new song", "swap the music", "find a more upbeat track", "the current music doesn't fit"
- A new scene or theme needs a different mood (e.g., a cinematic slide deserves orchestral, not house)

## Verified CC0 sources (in order of preference)

| Source | License | How to access |
|---|---|---|
| **freepd.com** (via SoundSafari GitHub mirror) | CC0 1.0 (truly public domain) | Direct `https://raw.githubusercontent.com/SoundSafari/CC0-1.0-Music/main/freepd.com/<file>.mp3` |
| **Wikimedia Commons** (CC0 audio category) | CC0 / public domain | Via `https://upload.wikimedia.org/...` after locating asset on commons.wikimedia.org |
| **Free Stock Music** (filter: CC0 Universal) | CC0 1.0 | `https://free-stock-music.com/?license=99` — download requires browser visit |

**Avoid these even though they're popular:**
- Pixabay Music — license is "free to use" but not CC0; some tracks have attribution requirements that change over time
- Mixkit — "free for commercial use" but with attribution; not CC0
- Incompetech (Kevin MacLeod) — CC-BY, requires attribution in credits
- Free Music Archive — mixed licenses; you must check per-track

## Recipe

### 1. Browse the freepd.com mirror

```bash
curl -sL -A "Mozilla/5.0" "https://api.github.com/repos/SoundSafari/CC0-1.0-Music/contents/freepd.com" \
  | grep -oE '"download_url":"[^"]+\.mp3"' \
  | sed 's/"download_url":"//; s/"$//' \
  > /tmp/cc0-tracks.txt
```

### 2. Filter by mood keywords

```bash
grep -iE "happy|upbeat|funk|disco|energ|run|bright|electric" /tmp/cc0-tracks.txt | head -20
```

Or for chill / contemplative:
```bash
grep -iE "ambient|gentle|piano|dream|calm|float|soft" /tmp/cc0-tracks.txt | head -20
```

### 3. Preview before committing

Download to a temp file and check duration + tone:
```bash
curl -sL -A "Mozilla/5.0" "<url>" -o /tmp/preview.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/preview.mp3
afplay /tmp/preview.mp3   # macOS preview
```

### 4. Add it to the project

```bash
NN=$(printf "%02d" $(($(ls public/music | wc -l) + 1)))
mv /tmp/preview.mp3 "public/music/${NN}-<slug>.mp3"
```

### 5. Register in the rotation

Edit `src/music.ts`:
```ts
export const TRACKS = [
  "music/01-funky-energy.mp3",
  "music/02-energizing.mp3",
  "music/03-city-run.mp3",
  "music/04-<new>.mp3",   // <-- add
] as const;
```

### 6. Add a test

In `src/music.test.ts`, the existing "returns a known track" test will pass automatically. If the new track is meant to be the default for a particular member, add a deterministic test like:
```ts
expect(pickTrack("alice")).toBe("music/04-<new>.mp3"); // only if hash works out
```

### 7. Re-render and verify

```bash
npm run wrap -- mayank last-week --render
open out/cache/*.mp4
```

## Tone guide (which track for which mood)

- **Funky / hip-hop / R&B** — default for engineering wraps; matches the "shipping" energy
- **Energetic electronic** — for high-velocity weeks (lots of commits, lots of messages)
- **Cinematic / dramatic** — sparingly; good for "biggest commit of the year" specials
- **Chill / lo-fi** — anti-default; only use if a member explicitly opts in

## License confirmation

For every track you add, leave a comment in `src/music.ts` next to the entry with:
- Track name
- Source URL
- License (must be CC0 1.0 or Public Domain)

Example:
```ts
// "Funky Energy Loop" — freepd.com via SoundSafari, CC0 1.0
"music/01-funky-energy.mp3",
```

This is your audit trail if a license is ever challenged.

## Done when

- [ ] MP3 sits at `public/music/<NN>-<slug>.mp3`
- [ ] `TRACKS` in `src/music.ts` updated
- [ ] Tests pass (`npm run test`)
- [ ] A test render plays the new track (verify with `open out/cache/*.mp4`)
- [ ] License + source documented as a comment
