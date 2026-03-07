# Demo question paper files (QPS)

For **tomorrow's demo**, populate `uploads/QPS/` so the app has the typing reference (REF.txt).

## Quick setup (recommended)

From **apcid_private** project root:

```bash
npm run demo:setup
```

This copies `REF.txt` (and any other files here) into `uploads/QPS/` and does **not** overwrite existing files.

## Manual

1. Create folder: `uploads/QPS/` (e.g. `mkdir uploads\QPS` on Windows).
2. Copy `REF.txt` from this folder to `uploads/QPS/REF.txt`.

Typing submission uses `uploads/QPS/REF.txt` as the reference passage. Existing content is never overwritten.
