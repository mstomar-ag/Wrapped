# Scripts

Ad-hoc diagnostics and data probes. Not part of the production server.

| Script | Command | Purpose |
|--------|---------|---------|
| `github-history.ts` | `npm run github:history` | Commits + PRs per member (`data/members.json`) |
| `github-diag.ts` | `npx tsx scripts/github-diag.ts` | Compare commit search queries for one user |
| `github-diag2.ts` | `npx tsx scripts/github-diag2.ts` | GraphQL contribution collection vs `listCommits` |
| `github-diag3.ts` | `npx tsx scripts/github-diag3.ts` | Scan all accessible repos for commits |
| `github-diag4.ts` | `npx tsx scripts/github-diag4.ts` | Token org access + SSO header check |

Optional env:

- `GITHUB_ORG` — limits PR search to that org (e.g. `Agrim-Intelligence`)
