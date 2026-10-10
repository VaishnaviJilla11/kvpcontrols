# KVP Switchgear &amp; Intelligent Panel — Website

A static marketing website for **KVP Trading Company**, showcasing the KVP range of
intelligent submersible control panels, switchgear and motor starters, plus a searchable
dealer directory.

## Structure

```
website/
├── index.html          # Single-page site (Home, About, Features, Products, Dealer Network, Contact)
├── admin.html           # Internal-only dealer management tool (not linked from the public site)
├── css/styles.css       # All styling (brand colors, layout, responsive rules)
├── css/admin.css        # Admin page styling
├── js/main.js            # Mobile nav, scrollspy, product view toggle, dealer rendering
├── js/admin.js           # Admin page logic — saves dealers straight to GitHub
└── assets/
    ├── data/dealers.json                # Dealer directory data (districts + dealers) — live source of truth
    ├── images/pdf-page*.png            # Real product photos extracted from the corporate pamphlet
    ├── KVP_Corporate_Pamphlet.pdf       # Downloadable 6-page product pamphlet
    └── KVP_Motor_Starters_Brochure.pdf  # Downloadable motor starter spec sheet
```

No build step or server is required — open `index.html` directly in a browser, or serve
the folder with any static file server.

Product photos are the actual images from `KVP_Corporate_Pamphlet_6_Pages.pdf`, cropped
out 1:1 per product. The hero panel mockup and logo wordmark are custom CSS/HTML so they
stay crisp at any size. A fixed Call + WhatsApp button (bottom-right) links directly to
+91 99517 73344.

## Brand colors

| Color       | Hex       | Usage                              |
|-------------|-----------|-------------------------------------|
| Navy        | `#0b2545` | Header, footer, headings            |
| Red         | `#e2231a` | CTAs, accents (matches KVP logo)    |
| Orange      | `#f5821f` | Highlights (matches panel housings) |
| Light grey  | `#f5f7fa` | Section backgrounds                 |

## Adding dealers (dynamic — no code editing needed)

The public site reads dealers from [`assets/data/dealers.json`](assets/data/dealers.json)
at runtime. [`admin.html`](admin.html) is a private tool that edits this file directly on
GitHub, so new dealers go live automatically (no manual git commands):

1. Open `admin.html` in a browser (keep the URL private — it isn't linked from the public
   site, but isn't password-protected either).
2. **One-time setup:** create a GitHub Personal Access Token at
   [github.com/settings/tokens](https://github.com/settings/tokens?type=beta) scoped to
   **only** "Contents: Read and write" on the `kvpcontrols` repo. Paste it into the
   "Personal Access Token" field and click **Save Token** — it's stored only in that
   browser's local storage, never in the site's code.
3. Fill in District, Dealer Name, Phone, and Address, then click **Save Dealer to
   Website**. S.No is generated automatically from row position.
4. The change commits straight to `dealers.json` on GitHub. The live site updates
   automatically once GitHub Pages rebuilds (usually 30-60 seconds).

To add a new **district** to the dropdown, edit the `districts` array in
`assets/data/dealers.json` directly (via admin.html's Refresh/GitHub, or a normal commit).

Since the token lives only in your browser's local storage, use **Clear** before sharing
or recycling the device, and set a reasonable token expiration when creating it.

## Updating product info / pricing

Product cards live directly in `index.html` under `<section id="products">`. Each
`<article class="product-card">` is self-contained (image, badges, features list, and
price), so copy an existing card to add a new model.

## Source material

Content and images were sourced from the KVP brand assets provided in the `KVP/` folder
(logo, product flyers, and the `KVP_Motor_Starters_Six_Page_Launch_Brochure` PDF).
