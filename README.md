# Bloom & Glow Beauty Storefront (v1)

Static multi-page storefront prototype with:
- Home landing page
- Shop catalog with search/filter/sort
- Product detail pages
- Cart management (localStorage)
- Order request flow (no payment integration)
- Internal orders desk with JSON/CSV export (`orders.html`)

## Run locally

Open `index.html` in a browser, or serve with any static server.

## Notes

- Cart key: `bloom_cart`
- Order request key: `bloom_order_requests`
- Internal review/export page: `orders.html`
- Product seed data lives in `products.js`

## Testing checklist (quick)

1. Open `index.html` and verify navigation links work.
2. In `shop.html`, test:
   - search by ingredient (e.g., `niacinamide`)
   - category filtering
   - sorting by price and rating
3. Open any product, add to cart, verify cart badge increments.
4. In `cart.html`, update qty, remove one item, then submit an order request.
5. Open `orders.html` and verify new request appears.
6. Test exports:
   - `Export JSON` downloads a valid file
   - `Export CSV` opens correctly in spreadsheet apps
7. Optional analytics smoke test in browser console:
   - `window.dataLayer` should include `add_to_cart` and `order_request_submitted` events.

## Next upgrades

- Replace static product data with API/CMS
- Add real inventory + admin management
- Add order backend endpoint
- Restrict `orders.html` behind authentication
- Add payment gateway when approved
