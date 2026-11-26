# anzato.com

Source for [anzato.com](https://anzato.com), the site of Anzato, a small engineering studio in Delhi that builds websites, Shopify stores and custom tools, and does technical SEO and AI search work.

It is a static site: plain HTML, CSS and JavaScript, with no framework and no build step.

## What's on the page

- **Free site check.** Visitors enter a web address and get Google PageSpeed scores (performance, SEO, accessibility, best practices) and three core metrics, right on the page.
- **Before and after slider** for case studies.
- **Prices in two currencies.** Each price carries `data-usd` and `data-inr` values, and a toggle switches between them.
- **Structured content for search and AI assistants:** question-style headings, JSON-LD, `sitemap.xml`, `robots.txt` and `llms.txt`.

## Run it locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works, but the self-hosted fonts and the site check need `http://`.

## The site check

`script.js` can run the check in two ways:

| Setting | What happens |
|---|---|
| `BACKEND_URL` empty (default) | The browser calls the PageSpeed Insights API directly. Put a key in `PSI_API_KEY` and restrict it to your domain (HTTP referrer) in Google Cloud. With no key, it uses Google's small anonymous quota. |
| `BACKEND_URL` set | The browser calls a small API that runs PageSpeed on the server, so no key reaches the browser. |

The key is not in this repository.

## Deploy

The site is served as static assets by a Cloudflare Worker (`wrangler.jsonc`). There is no server code.

```bash
npx wrangler deploy
```

- `_headers` sets security headers and cache times. Fonts are cached for a year; images and brand files for a day, so a replaced image should get a new filename.
- `.assetsignore` keeps config and Markdown files from being uploaded.
- Unknown paths get `404.html` with a real 404 status.

## Files

```
index.html, styles.css, script.js
404.html
_headers, wrangler.jsonc, .assetsignore
robots.txt, sitemap.xml, llms.txt, favicon.ico
assets/brand/   the Anzato mark
assets/fonts/   Bricolage Grotesque and Instrument Sans (self-hosted)
assets/img/     case study and team images
assets/og.png   social share card (1200x630)
```

## Design tokens

Colours live once in `styles.css` under `:root`:

| Token | Hex | Use |
|---|---|---|
| `--indigo` | #4B529E | Links, icons, checked states |
| `--navy` | #35437F | Numbers, step markers, hovers |
| `--ink` | #161A3A | Headings, dark bands, footer |
| `--ink-2` | #3A3F5E | Body text |
| `--paper` | #F5F6FA | Page background |
| `--signal` | #F2B33D | Booking buttons only, always with ink text |

Headings use Bricolage Grotesque (600 and 700) and body text uses Instrument Sans (400 to 600).

## Licence

The code is shared so people can see how the site is built. The Anzato name, logo, copy and images are not licensed for reuse. The fonts are under the SIL Open Font License (see `assets/fonts/`).
