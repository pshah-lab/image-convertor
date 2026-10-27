# Image Convertor feature checklist

Legend: `[x]` implemented and verified · `[~]` implemented with a documented limitation · `[ ]` planned

## Product foundation

- [x] Next.js, TypeScript, Tailwind-free local stylesheet application
- [x] Browser-only image processing; no image upload endpoint
- [x] Restrictive Content Security Policy
- [x] Responsive desktop and mobile layout
- [x] Light and dark appearance toggle
- [x] Privacy and About pages
- [x] Sitemap and robots.txt
- [x] Installable PWA manifest and offline app-shell cache
- [~] Offline processing after the application has first been loaded online
- [ ] Custom production domain, canonical URL, and Open Graph image

## Upload and queue

- [x] Click-to-select files
- [x] Drag-and-drop upload
- [x] Multiple-image queue
- [x] Clipboard image paste
- [x] Remove one item or clear queue
- [x] Cancellation of remaining queued conversions
- [x] JPEG, PNG, WebP, AVIF, and GIF input validation
- [x] File-size limit (25 MB) and pixel-count limit (40 MP)
- [x] Folder picker for Chromium-based browsers
- [~] Preserve selected-folder structure in batch ZIP exports where `webkitRelativePath` is available
- [~] GIF input processes the first frame only
- [x] Per-file output format and quality overrides
- [x] Drag-to-reorder queue
- [x] Processing progress per item and overall

## Conversion and optimization

- [x] JPEG, PNG, WebP, and browser-supported AVIF output
- [x] Quality slider for lossy formats
- [x] Aspect-ratio-preserving width resize
- [x] JPEG background colour for transparent input
- [x] Output-format capability check with an error when unsupported
- [x] Target file-size mode for JPEG, WebP, and AVIF
- [~] Target-size mode tries seven quality values; a target can remain unreachable at the minimum usable quality
- [x] Web presets: Next.js hero, Shopify product, WordPress upload, WhatsApp share, Email attachment
- [x] Responsive `-sm`, `-md`, `-lg` export pack
- [x] Filename suffixes
- [x] Strip metadata/GPS by re-encoding every output with Canvas
- [x] Height resize input with aspect-ratio preservation
- [x] Percentage resize input with aspect-ratio preservation
- [x] Centre crop to fixed aspect-ratio presets within Make it fit
- [x] Freeform percentage-based crop controls
- [x] Drag-handle visual crop editor
- [x] Rotate and flip
- [x] “Make it fit” rule combining format, maximum dimensions, centre-crop ratio, and maximum bytes
- [x] Resize dimensions automatically when a target file size cannot be met
- [~] Image quality recommendations based on filename, format, and dimensions; no image-content model is used

## Preview and download

- [x] Original and output preview
- [x] Original/output file-size comparison and percentage saved
- [x] Enlarged before/after comparison
- [x] Individual result download
- [x] ZIP download for multiple results/variants
- [x] Duplicate-safe meaningful output filenames
- [x] Draggable before/after slider
- [x] Pan and zoom in comparison
- [x] Image dimensions in results
- [x] Export summary report
- [x] Copyable HTML image, `srcset`, and Next.js Image snippets for responsive packs

## Formats and metadata

- [x] Metadata removal on converted outputs
- [x] Local EXIF/GPS metadata inspector before conversion
- [x] Selective JPEG metadata preservation for capture date, author, and copyright; GPS/device fields always removed
- [x] HEIC/HEIF input via a browser-side decoder, then normal conversion/export
- [x] Self-contained SVG input and PNG/WebP export
- [x] BMP input where supported by the browser decoder
- [x] TIFF input via local decoder and PNG normalization
- [ ] Animated GIF/WebP timeline-preserving conversion
- [x] JPEG XL input via local decoder and PNG normalization

## Creator and ecommerce tools

- [x] Social presets: Instagram post/story/reel, LinkedIn, YouTube thumbnail
- [x] Marketplace presets: Amazon, Etsy, eBay, Shopify collections
- [x] Text watermark
- [x] Logo watermark
- [x] Batch watermark settings
- [x] Background colour/canvas padding presets
- [x] Contact-sheet export

## Document toolkit expansion

- [x] Images to PDF
- [x] PDF to images (PNG page ZIP)
- [~] PDF clean rewrite, merge, split, and reorder; clean rewrite may not reduce every PDF's size
- [x] PDF watermark and metadata removal
- [x] PDF metadata removal via clean rewrite

## Platforms and monetization

- [ ] Browser extension for right-click conversion
- [ ] Tauri desktop application for very large local batches
- [x] Local saved workflows (settings only; never user image files)
- [ ] Premium tier and entitlement design
- [ ] Payment integration
- [ ] Optional cloud/API product as a separate, opt-in service

## Testing and release

- [x] Unit tests for filename, file size, savings, and presets
- [x] Playwright test: local upload → WebP conversion → download
- [x] Playwright confirms no remote image request in that critical flow
- [x] Production build passes
- [ ] Unit tests for target-size search and conversion failures
- [ ] E2E test for responsive ZIP contents
- [ ] E2E tests for presets, paste, folder handling, cancellation, and mobile UI
- [ ] Browser compatibility matrix: Chrome, Firefox, Safari, Edge
- [ ] Accessibility audit with keyboard and screen reader checks
- [ ] Performance and memory test for large batches
- [ ] Pre-launch manual Network-panel privacy verification
