# Staging content (not served by the live app until copied to `public/`)

Wikipedia / description collection writes here via:

```bash
npm run wiki:collect
```

When ready to ship blurbs to production, copy into `public/genre-descriptions.json` and deploy.
