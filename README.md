# KiPro Playlist Creator

A browser-based editor for AJA KiPro `.playlist` files. Drag video files
into the window to add them to the clip list, reorder by dragging,
and save back to a `.playlist` file. No backend — everything runs
client-side.

Github URL: [julesdue.github.io/kipro-playlist-creator](https://julesdue.github.io/kipro-playlist-creator/)

## File format

A `.playlist` file is JSON:

```json
{"name":"do-international","cliplist":["clip1.mov","clip2.mov"]}
```

`cliplist` holds filenames only (no paths), in playback order. See
[sample_data/do-international.playlist](sample_data/do-international.playlist).

## Development

```bash
npm install
npm run dev
```

## Saving

- **Chrome / Edge**: uses the File System Access API. "Save" writes
  back to the opened file in place; "Save As" prompts for a new
  location.
- **Firefox / Safari**: no File System Access API support, so "Save"
  and "Save As" both trigger a browser download instead of an in-place
  write.

## Deploying to GitHub Pages

This repo includes a workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
that builds and deploys to GitHub Pages on every push to `main`.

1. Push this repo to GitHub as `kipro-playlist-creator`.
2. In the repo settings, under **Pages**, set the source to
   **GitHub Actions**.
3. Push to `main` — the app will be published at
   `https://<username>.github.io/kipro-playlist-creator/`.

If you rename the repository, update the `base` path in
[vite.config.ts](vite.config.ts) to match.
