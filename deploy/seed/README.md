# Deploy seed data

Copied into the image at `/app/seed-data/`. On first boot (empty Railway volume), the API copies these files into `/app/data/` before serving traffic.

Update after changing local `data/members.json` (or archive/schedule):

```bash
cp data/members.json deploy/seed/members.json
cp data/archive.json deploy/seed/archive.json   # optional
cp data/schedule.json deploy/seed/schedule.json # optional
```

Then redeploy. Existing non-empty volume data is never overwritten.
