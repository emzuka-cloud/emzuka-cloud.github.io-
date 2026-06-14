# Emmanuel Zúñiga — Portfolio Site

A single-page portfolio that **demonstrates** the skills on my resume rather than
just listing them. The centerpiece is a **live API Integration Console** that makes
real REST calls (GitHub API + a live exchange-rate API) from the browser, showing
the request, HTTP status, latency, parsed results, and raw JSON.

Built with plain HTML, CSS, and JavaScript — no frameworks, no build step, no API keys.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire site (HTML + CSS + JS in one file) |
| `CV_Emmanuel_Zuniga.docx` | CV served by the "Download CV" button |

## Run locally

Just open `index.html` in a browser. Or serve it:

```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```

## Deploy to GitHub Pages (free, ~3 minutes)

1. Create a new repository on GitHub. To get a clean URL of the form
   `https://<your-username>.github.io`, name the repo exactly
   **`<your-username>.github.io`**. Any other name works too — it just gives a
   `…github.io/<repo-name>/` path.
2. Upload `index.html` and `CV_Emmanuel_Zuniga.docx` to the repository
   (drag-and-drop into the repo's web page → **Commit changes**).
3. Go to the repo's **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Set branch to **`main`** and folder to **`/ (root)`**, then **Save**.
6. Wait ~1 minute. GitHub shows the live URL at the top of the Pages settings.

That's it — the site is live and public.

## Customize

- **GitHub username in the demo:** the console defaults to `emzuka-cloud`. Edit the
  `defaultUser` value in the `<script>` (near the top, in the `endpoints` object),
  or just type a different username into the URL field on the live page.
- **Colors:** all defined as CSS variables in `:root` at the top of `index.html`.
  `--ink` is the resume teal.
- **Content:** experience, skills, and contact details are plain HTML in the body.

## A note on the live demo

The two endpoints are public, key-free, and CORS-enabled:

- `https://api.github.com/users/<user>/repos` — public, rate-limited to 60 requests
  per hour per IP when unauthenticated.
- `https://open.er-api.com/v6/latest/USD` — open exchange-rate feed.

If a call fails (rate limit, network, or the endpoint is down), the console shows a
clean error state instead of breaking — which is itself part of the demonstration.
