# Aloud — read any PDF out loud

A free, private web app that reads PDF documents aloud in your browser. Text
extraction and speech happen entirely on your device — **your files are never
uploaded**. No accounts, no tracking cookies, no paywall (tips welcome).

## How it works
- **pdf.js** (self-hosted in `vendor/`) pulls the text out of the PDF.
- The browser's built-in **Web Speech API** reads it aloud, highlighting each
  sentence as it goes.

## Project structure
| File | Purpose |
|------|---------|
| `index.html` | Landing page (SEO/GEO + hero) |
| `app.html` / `app.js` | The reader |
| `privacy.html` / `terms.html` | Legal pages |
| `site.js` | Landing page script (year, analytics hooks) |
| `vendor/` | Self-hosted pdf.js (committed on purpose) |
| `assets/` | Images (e.g. the hero background) |
| `_headers` | Security headers for Cloudflare Pages / Netlify |
| `robots.txt`, `sitemap.xml` | SEO |

## Run it locally
It's a static site — no build step. Either open `index.html` in a browser, or
serve the folder:
```
python -m http.server 4322
```
then visit http://localhost:4322

> Note: the `_headers` security file only takes effect once hosted on
> Cloudflare Pages or Netlify, not when opened locally.

## Hero background (time-of-day)
The hero photo changes with the visitor's local time of day — dawn, morning,
afternoon, golden-hour, dusk, twilight, night, misty-morning. The logic lives in
`site.js` (`initHeroScene`) and the images live in `assets/` (see
`assets/README.md` for the filenames and schedule). To change a scene, just
replace the matching file and push. A painted CSS scene is the no-JS fallback.

## Deploy
Designed for **Cloudflare Pages** (free): connect this GitHub repo, set the
build output to the repo root, and it deploys on every push.

## Credits / licence
Uses [pdf.js](https://github.com/mozilla/pdf.js) (Apache License 2.0).
