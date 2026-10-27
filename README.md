# Image Convertor

A privacy-first image conversion web app. Images are decoded, transformed, and encoded entirely in the user’s browser—there is no image-upload endpoint or database.

## Included in this MVP

- Multiple-file drag/drop or picker upload
- JPEG, PNG, WebP, AVIF, and GIF input validation (GIFs use their first frame)
- Browser-capability-aware WebP, JPEG, PNG, and AVIF conversion
- Quality control, aspect-ratio-preserving width resize, and JPEG background colour
- Individual downloads and ZIP download for a batch
- Real original/output sizes and percentage savings
- Cleanup of preview URLs when files are removed or the app unmounts
- A restrictive CSP that disallows outgoing connections

## Run locally

Requires Node.js 20+ and pnpm.

```bash
pnpm install --ignore-workspace
pnpm dev
```

Open `http://localhost:3000`.

```bash
pnpm test
pnpm build
```

## Browser support and limitations

The app uses `createImageBitmap`, Canvas, and `canvas.toBlob`. JPEG, PNG, and WebP output work in current Chromium, Firefox, and Safari releases. AVIF encode support is browser-dependent: the app detects it at conversion time and clearly reports when it is unavailable. Animated GIFs are accepted but only their first frame is processed. Very large files (>25 MB) and images (>40 megapixels) are rejected to protect browser memory.

## Deployment

Import this folder into Vercel and use the default Next.js build command (`pnpm build`). The application is static-compatible and contains no API routes or server image processing. Before publishing, add your real production URL as the metadata base/canonical URL.

## Privacy verification

There are no `fetch`, XHR, analytics, storage, server actions, or API route calls in the conversion flow. The page’s Content Security Policy permits `connect-src 'self'`, and image previews use local `blob:` URLs. A browser network-panel check during upload should show no request carrying image content; that check remains a recommended pre-launch release test.
