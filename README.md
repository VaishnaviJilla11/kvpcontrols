# KVP Switchgear &amp; Intelligent Panel — Website

A static marketing website for **KVP Trading Company**, showcasing the KVP range of
intelligent submersible control panels, switchgear and motor starters, plus a searchable
dealer directory.

## Structure

```
website/
├── index.html          # Single-page site (Home, About, Features, Products, Dealer Network, Contact)
├── css/styles.css       # All styling (brand colors, layout, responsive rules)
├── js/main.js            # Mobile nav, scrollspy, product view toggle, dealer district rendering
├── js/dealers.js         # Dealer directory data — edit this to add/remove dealers
└── assets/
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

## Adding dealers

Open [`js/dealers.js`](js/dealers.js). There are two things to edit:

1. **`KVP_DISTRICTS`** — the list of districts shown in the dropdown. Add new district
   names here as the network grows.
2. **`KVP_DEALERS`** — one object per dealer:

```js
{
  district: "Kadapa",   // must match a name in KVP_DISTRICTS exactly
  name: "Dealer / Firm Name",
  phone: "9000933113",
  address: "Street, area, pincode",
}
```

Save the file and reload the page — the **Dealer Network** tab groups dealers by the
selected district automatically in a table (S.No, Dealer Name, Phone, Address). Until
dealers are added for a district, the table shows a "no dealers listed yet" row with a
call-to-action phone number.

## Updating product info / pricing

Product cards live directly in `index.html` under `<section id="products">`. Each
`<article class="product-card">` is self-contained (image, badges, features list, and
price), so copy an existing card to add a new model.

## Source material

Content and images were sourced from the KVP brand assets provided in the `KVP/` folder
(logo, product flyers, and the `KVP_Motor_Starters_Six_Page_Launch_Brochure` PDF).
