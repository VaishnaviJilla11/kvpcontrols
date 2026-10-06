# KVP Switchgear &amp; Intelligent Panel — Website

A static marketing website for **KVP Trading Company**, showcasing the KVP range of
intelligent submersible control panels, switchgear and motor starters, plus a searchable
dealer directory.

## Structure

```
website/
├── index.html          # Single-page site (Home, About, Features, Products, Dealers, Contact)
├── css/styles.css       # All styling (brand colors, layout, responsive rules)
├── js/main.js            # Mobile nav, scrollspy, dealer search/filter rendering
├── js/dealers.js         # Dealer directory data — edit this to add/remove dealers
└── assets/
    └── KVP_Motor_Starters_Brochure.pdf   # Downloadable spec sheet linked from Products
```

No build step or server is required — open `index.html` directly in a browser, or serve
the folder with any static file server.

Visuals (panel mockup, icon tiles, wordmark logo) are built with CSS/HTML/emoji rather
than the brochure photos, so the design stays crisp and on-brand at any size. The copy and
specs come straight from the KVP brochure and product images.

## Brand colors

| Color       | Hex       | Usage                              |
|-------------|-----------|-------------------------------------|
| Navy        | `#0b2545` | Header, footer, headings            |
| Red         | `#e2231a` | CTAs, accents (matches KVP logo)    |
| Orange      | `#f5821f` | Highlights (matches panel housings) |
| Light grey  | `#f5f7fa` | Section backgrounds                 |

## Adding dealers

Open [`js/dealers.js`](js/dealers.js) and add one object per dealer to the `KVP_DEALERS`
array:

```js
{
  name: "Dealer / Firm Name",
  city: "City",
  state: "Telangana",
  address: "Street, area, pincode",
  phone: "9000933113",
}
```

Save the file and reload the page — the **Dealers** tab (search box, state filter, and
cards) updates automatically. No other code changes are needed. Until dealers are added,
the section shows a friendly "coming soon" placeholder with a call-to-action phone number.

## Updating product info / pricing

Product cards live directly in `index.html` under `<section id="products">`. Each
`<article class="product-card">` is self-contained (image, badges, features list, and
price), so copy an existing card to add a new model.

## Source material

Content and images were sourced from the KVP brand assets provided in the `KVP/` folder
(logo, product flyers, and the `KVP_Motor_Starters_Six_Page_Launch_Brochure` PDF).
