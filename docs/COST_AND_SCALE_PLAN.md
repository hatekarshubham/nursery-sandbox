# Cost and scale action plan

Goal: keep the Firestore bill close to zero at today's size, keep it small as products, categories and sales grow, and do not give up speed, data quality or consistency.

Status: plan only. Nothing here is implemented yet.

## 1. Target numbers

Today's size (used for every estimate below):

- 5,000 products, about 10,000 inventory records (2 warehouses)
- 1,000 sales a day, about 3 items per sale
- 3 users at a time (1 admin, 2 sales reps)
- Sales kept for 3 years, then deleted by TTL
- Firestore in `us-central1`, Blaze plan, default database (free daily quota applies)

Free daily quota (default database): 1 GiB stored, 50,000 reads, 20,000 writes, 20,000 deletes.

Paid rates (Iowa): reads $0.03, writes $0.09, deletes $0.01 per 100,000. Storage $0.15 per GiB-month.

Rupee figures use about 88 INR per USD and include 18% GST.

| Scale | Users | Monthly cost after this plan | Monthly cost today's code |
|---|---|---|---|
| Now: 5k products, 1k sales/day | 3 | 0 INR, rising to about 30 to 50 INR at 3 years | about 330 INR |
| 5x: 25k products, 5k sales/day | 10 | about 250 to 300 INR | several thousand INR |
| 10x: 50k products, 10k sales/day | 20 | about 600 to 700 INR, only if section 5 is followed (no full-collection listeners) | not practical |

"At 3 years" means the point when the database holds a full 3 years of sales. Storage is free for roughly the first 9 months, then grows to about 3.6 GiB and stays there once TTL starts deleting the oldest sales.

Design rule: a screen reads about the same number of documents whether there are 5k or 50k products.

## 2. What must not change

These protect data quality and consistency. Every phase keeps them.

- Stock-changing actions (sale, purchase, transfer, adjustment) keep using Firestore transactions that re-read stock from the server. A cached screen can be briefly stale, but it cannot oversell.
- Barcode uniqueness keeps using the `barcodes/{barcode}` transaction.
- Sales keep copying product name, price, GST, category and supplier at the time of sale, so history never changes.
- No negative stock, ever.

## 3. Decisions

1. TTL: no TTL policy exists today (development uses the emulator, which does not delete expired documents). The code writes `expiresAt` from now on. The TTL policy is turned on in production only after existing sales are backfilled (tasks 3.1 to 3.3). Decided.
2. Screens: staff mostly use Products and Sales (Create Sale and Sales History) but may use any screen. So every screen has to stay cheap, not only three. Phase 2 builds one reusable server-search product picker and uses it on all add-screens (Create Sale, Add Purchase, Add Stock Transfer, Add Stock Adjustment, Print Barcodes). Decided.
3. Inventory ID change (task 3.5): left out for now. It does not increase cost; it only saves a few thousand reads a day at 1x. Revisit if duplicate inventory records ever appear. Decided.
4. Consecutive invoice numbers (task 3.6): costs about 1 extra read and 1 extra write per sale, which is inside the free quota at today's size. Still to confirm with the accountant whether GST requires it.

## Implementation status (update as work lands)

Built and compiling (`ng build` passes). Not yet exercised against the emulator or production data.

| Task | Status | Notes |
|---|---|---|
| 0.1 | You | Budget alert is set in Google Cloud, not code |
| 0.2 | Not started | Needs the real role names (or custom claims) before rules can be written safely |
| 0.3 | Done | `localStorage.setItem('debugReads','1')` and reload: the console logs each listener start and snapshot size (`shared-stream.ts`) |
| 1.1, 1.2 | Done | Shared listeners with a 10 minute grace period after the last screen leaves |
| 1.3 | Done | All service subscriptions end with the screen (`takeUntilDestroyed`) |
| 1.4 | Done | Persistent multi-tab cache in `app.config.ts`. Data stays in the browser after logout (IndexedDB) |
| 1.5 | Done | Create Sale listens to the selected warehouse only |
| 1.6 | Done | Sales History loads only the chosen range (today by default; wider ranges fetch just the missing days). Products are loaded only if an old sale lacks stored names |
| 1.7 | Done | Full-array console logs removed |
| 2.1 | Code done, backfill needed | New and edited products get `nameLower` and `searchPrefixes`. Run `scripts/backfill.mjs` for existing products (already applied to the local emulator). Without it, picker search finds nothing for old products |
| 2.2, 2.7 | Partly done | Reusable `app-product-picker` built (word-prefix name search, exact barcode lookup, optional supplier filter, at most about 60 reads per search). Used on Add Purchase, Add Stock Transfer and Add Stock Adjustment, which no longer load the product list. Add Purchase no longer loads all products; Transfer and Adjustment read one inventory record per chosen product. **Not yet moved:** Create Sale and Print Barcodes (they are browse-a-grid screens and need a design decision) |
| 2.3 | Not started | Products paging and server search (same design question as Print Barcodes) |
| 2.4 | Done | Newest 100 per list, with a "Load older" button. Purchases also always include every PENDING purchase |
| 2.5 | Done | Category product count uses `count()` (it is only used by the delete dialog) |
| 2.6 | Not started | `sum()` and `count()` totals for long ranges |
| 3.1 | Done | `expiresAt` is written on every new sale |
| 3.2 | Script ready | `scripts/backfill.mjs` (dry run by default) |
| 3.3 | Not yet | Enable only after the backfill: `gcloud firestore fields ttls update expiresAt --collection-group=sales --enable-ttl --project <id>` |
| 3.4 | Done | `items` on sales is no longer indexed (`firestore.indexes.json`) |
| 3.6 | Waiting | Invoice format needs the accountant's confirmation |
| 3.7 | Not started | No screen reads summaries yet, so it is better built together with 2.6 |

Search boxes added (in the browser, on data already loaded, no extra reads): Suppliers, Categories, Sales History (invoice or product), Purchases, Stock Transfers, Stock Adjustments.

New Firestore indexes in `firestore.indexes.json`: `products` on `supplierId` + `searchPrefixes`, and `inventory` on `warehouseId` + `quantity`. Deploy them with `firebase deploy --only firestore:indexes` before using the product picker in production.

Known gap: the `*.spec.ts` files are unfinished generated stubs (they import files that do not exist), so `ng test` does not build. This was already the case before these changes.

## 4. Phases

Each task lists the files touched and how we know it is done.

### Phase 0: safety net

| # | Task | Files | Done when |
|---|---|---|---|
| 0.1 | Set a Google Cloud budget alert at about 500 INR | Google Cloud Billing (not code) | Alert email arrives at 50% and 100% |
| 0.2 | Role-based security rules. Admin: everything. Sales rep: read products and stock, create sales. | `firestore.rules` | A sales rep account cannot delete products or edit stock directly (tested in the emulator) |
| 0.3 | Add a read counter for development, so each screen's reads can be measured | `src/app/services/*.ts` (temporary) | Reads per screen are printed in the console |

### Phase 1: load once, share, cache (biggest saving)

| # | Task | Files | Done when |
|---|---|---|---|
| 1.1 | One shared live listener each for products and inventory for the whole session | `product.service.ts`, `inventory.service.ts` | Opening Products, Create Sale and Sales History in a row reads the collections once |
| 1.2 | Same shared listener for categories, suppliers and warehouses | `category.service.ts`, `supplier.service.ts`, `warehouse.service.ts` | One listener each, regardless of screens opened |
| 1.3 | Screens no longer leave listeners running after navigation | `sales.component.ts`, `categories.component.ts`, `warehouses.component.ts`, `suppliers.component.ts`, plus a check of the rest | No listener count growth when navigating back and forth 20 times |
| 1.4 | Turn on Firestore persistent local cache (multi-tab) | `app.config.ts` | A page refresh within 30 minutes re-reads only changed documents |
| 1.5 | Create Sale loads inventory for the selected warehouse only | `inventory.service.ts`, `create-sale.component.ts` | Inventory reads on Create Sale are about half |
| 1.6 | Sales History stops starting its own products, categories, suppliers and warehouses listeners; uses the names stored on each sale | `sales.component.ts`, `sales.service.ts` | Opening Sales History reads only the sales in the chosen range |
| 1.7 | Remove the console log of the whole inventory array | `products.component.ts` | No log of full arrays |

Expected result: daily reads drop from about 400,000 to about 60,000 for 3 users.

### Phase 2: read only what is needed

| # | Task | Files | Done when |
|---|---|---|---|
| 2.1 | Add a lowercase `nameLower` field to products, and backfill existing products once | `product.service.ts`, one-time script | Every product has `nameLower` |
| 2.2 | Create Sale: barcode scan runs a query on `barcode` (1 read); name search is a prefix query with `limit(20)` | `create-sale.component.ts`, `product.service.ts` | Create Sale reads under 50 documents on first load |
| 2.3 | Products screen: 50 per page, server-side search by name or barcode, inventory fetched for the visible page only | `products.component.ts`, `product.service.ts`, `inventory.service.ts` | Opening Products reads about 100 documents |
| 2.4 | Purchases, Stock Transfers and Stock Adjustments lists: last 30 to 90 days, with a "load more" button | `purchases.component.ts`, `stock-transfers.component.ts`, `stock-adjustments.component.ts`, matching services | List screens read only the window, not the full history |
| 2.5 | Categories screen: product counts from the shared list or a `count()` query, not one query per category | `category.service.ts`, `categories.component.ts` | No per-category queries |
| 2.6 | Sales History totals use `sum()` and `count()` aggregation queries; the document list is paged | `sales.service.ts`, `sales.component.ts` | A one-year total reads about 370 documents, not 365,000 |
| 2.7 | Build the server-search product picker once as a reusable component (from 2.2) and use it on every screen that picks products: Create Sale, Add Purchase, Add Stock Transfer, Add Stock Adjustment, Print Barcodes. Until it is in place those screens use the shared list from Phase 1. Must be done before products pass about 15,000 | those components | They still work and add no extra reads today. Before products pass about 15,000, no screen starts a listener on the whole `products` or `inventory` collection |

### Phase 3: shape the data

| # | Task | Files | Done when |
|---|---|---|---|
| 3.1 | Write `expiresAt` (sale date plus 3 years) on every new sale | `sales.service.ts` | New sale documents contain `expiresAt` |
| 3.2 | Backfill `expiresAt` on existing sales (3 years from each sale's `createdAt`) before any TTL policy is enabled | one-time script | No sale is missing `expiresAt` |
| 3.3 | Enable the TTL policy on `sales.expiresAt` | Firebase console or `gcloud firestore fields ttls update` | Policy shows Active; test document is removed after expiry |
| 3.4 | Turn off automatic indexes on fields never filtered by (keep `createdAt` and a few more) | `firestore.indexes.json` (`fieldOverrides`) | Sale storage per document drops by about a third |
| 3.5 | Optional: inventory document ID = `productId_warehouseId` (read saving plus duplicate protection). Needs a one-time migration and a backup first. | `inventory.service.ts`, `sales.service.ts`, `purchase.service.ts`, `stock-transfer.service.ts`, `stock-adjustment.service.ts` | Duplicate inventory records are impossible; stock totals match before and after |
| 3.6 | Invoice number from a counter updated inside the sale transaction. Use one counter per warehouse and per day (for example `W1-20261014-0001`), not one counter for the whole shop, so it is not a single hot document | `sales.service.ts` | Two sales can never share an invoice number, and numbers are consecutive within each series |
| 3.7 | Daily summary documents (totals by payment mode and warehouse), one per warehouse per day. Fine up to about 1 write a second per document. Above that, split into sharded counters or update it from a Cloud Function | `sales.service.ts` | A daily or monthly total reads 1 to 31 documents |

### Phase 4: only if the business grows a lot

| # | Task | When |
|---|---|---|
| 4.1 | Copy sales older than about 12 months to BigQuery or Cloud Storage, and keep only recent months in Firestore | Beyond about 5,000 sales a day or when storage passes about 20 GiB |
| 4.2 | Revisit per-screen search with a search service | Beyond about 50,000 products or when name search needs fuzzy matching |

## 5. Scalability limits and how the plan handles them

What scales well after Phases 1 to 3: reads per screen (pages and queries, not whole collections), sales history (TTL plus aggregation queries), and storage (index exemptions plus TTL).

What does not scale by itself, and the planned answer:

| Limit | What happens at growth | Planned answer |
|---|---|---|
| Shared full listeners (task 1.1) | Fine at 5k products. At 50k products and 100k inventory records, every user's first load reads about 150,000 documents, and every inventory change is read again by every open listener (10k sales a day, 3 items, 20 users is about 600,000 reads a day) | Phase 2 replaces the full lists with search and paging. Task 2.7 retires the full lists before about 15,000 products. Live listeners are kept only on small sets: the visible page, or low stock |
| One document written too often | Firestore handles about 1 sustained write a second per document. A single daily summary or invoice counter for the whole shop becomes a bottleneck at a few sales a second | Counters per warehouse and per day (tasks 3.6, 3.7), sharded counters or a Cloud Function if needed |
| Popular product in a transaction | Two reps selling the same product at the same time cause a transaction retry. Correct, but slower under heavy load | Retries are automatic. Keep transactions small (only the documents involved). Measure retries at 5x |
| Writes in one batch | A batch or transaction is limited to 500 writes. Deleting a category with many products already batches at 400 | Keep the batching. Move category cascade delete to a background job if a category can hold more than about 10,000 products |
| Document size | A sale with a very large cart approaches the 1 MiB limit | Cap items per sale at about 200 in the UI |
| More shops or tenants | Everything shares one database and one set of rules | If a second shop is added, add a `shopId` to every document and to the rules before it is needed, not after |
| Free quota | The free quota is per project, not per user | Treat it as a bonus. Plan for paying about 250 to 700 INR a month at 5x to 10x |

## 6. How we check each phase

- Run the emulator with a seeded set of 5,000 products and 10,000 inventory records.
- Record reads per screen before and after each phase, using the counter from task 0.3.
- Keep or add tests for these rules: no negative stock, two reps selling the last unit at the same time, purchase then sale, transfer between warehouses.
- Watch the Firestore Usage tab in the Firebase console for a week after each phase goes live.

Targets after Phases 1 and 2 (3 users, 1,000 sales a day):

| Measure | Target |
|---|---|
| Reads a day | under 50,000 (inside the free quota) |
| Writes a day | under 20,000 |
| Create Sale first load | under 50 documents |
| Products first load | about 100 documents |

## 7. Order of work

1. Phase 0 and Phase 1, then measure.
2. Phase 2, then measure.
3. Phase 3 in this order: 3.1, 3.2, 3.3 (TTL), then 3.4, 3.6, 3.7, then 3.5 last if wanted.
4. Phase 4 only when the numbers in section 6 say so.

Take a Firestore export before 3.2 and before 3.5.
