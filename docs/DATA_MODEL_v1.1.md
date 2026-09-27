# Nursery Inventory & Billing System — Data Model v1.1

**Project:** Nursery Inventory Dashboard  
**Database:** Firebase Cloud Firestore  
**Frontend:** Angular  
**Status:** Design / Blueprint  
**Version:** 1.1  
**Last Updated:** 2026-09-27

---

# 1. Purpose

This document defines the planned data model for the nursery inventory, purchasing, warehouse stock, barcode, billing, sales/order, and reporting system.

Version 1.1 extends the original architecture to support **multiple warehouses**. The business currently has two warehouses, but the data model must support additional warehouses without changing the product schema.

This document covers:

- Product and category management
- Supplier/dealer management
- Warehouse management
- Product stock per warehouse
- Purchasing
- Inventory transaction history
- Product barcode management
- Barcode-based billing
- Orders / sales
- Warehouse-aware stock deduction
- User active warehouse/session context
- Customer information as an order snapshot
- Dashboard reporting
- Relationships between entities
- Data integrity rules
- Stock management
- Future extensibility

This document should be treated as the primary reference when implementing new modules.

Any major database-model change should be reflected here before implementation.

---

# 2. Database Technology

The application uses **Firebase Cloud Firestore**.

Firestore is a NoSQL, document-oriented database.

```text
Collection
    ↓
Document
    ↓
Fields
```

The application primarily uses root-level collections for major business entities.

---

# 3. Major Architecture Change in v1.1

## Previous model

The original design stored current inventory directly on the product:

```text
PRODUCT
  └── stockQuantity
```

That model works for one physical inventory location but is insufficient when the same product can exist in multiple warehouses.

## New model

Stock is now maintained separately for each warehouse:

```text
                  PRODUCT
                     │
             ┌───────┴───────┐
             │               │
             ▼               ▼
        WAREHOUSE 1      WAREHOUSE 2
             │               │
             ▼               ▼
          Qty 20           Qty 30

Total Product Stock = 50
```

The implementation must **not** add fields such as `warehouse1Quantity` and `warehouse2Quantity` to every product.

Instead, stock is represented through the `warehouse_stock` collection.

This allows:

```text
Warehouse 1
Warehouse 2
Warehouse 3
...
```

without redesigning the product document.

---

# 4. Core Collections

The application architecture now uses these primary collections:

- `categories`
- `products`
- `suppliers`
- `warehouses`
- `warehouse_stock`
- `purchases`
- `purchase_items`
- `orders`
- `order_items`
- `inventory_transactions`

Future collections may include:

- `users`
- `payments`
- `settings`
- `stock_adjustments`
- `product_suppliers`

---

# 5. Collection: categories

Document path:

```text
categories/{categoryId}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Category display name |
| `code` | string | Yes | Category/business code |
| `isActive` | boolean | Yes | Category status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

Relationship:

```text
CATEGORY 1 ───────── N PRODUCT
```

---

# 6. Collection: products

## Purpose

The product collection is the **product master**. It describes what the item is, not where its physical stock is stored.

Document path:

```text
products/{productId}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Product name |
| `categoryId` | string | Target | Category document ID |
| `categoryName` | string | Optional | Category snapshot/display value |
| `supplierId` | string | Current implementation | Selected/default supplier ID |
| `supplier` | string | Current implementation | Supplier display snapshot |
| `description` | string | No | Description |
| `unitPrice` | number | Yes | Selling price |
| `gst` | number | Yes | GST percentage |
| `standardPackage` | number | No | Package quantity/size |
| `barcode` | string | Future | Product barcode |
| `image` | string | No | Product image |
| `isActive` | boolean | Yes | Product status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

## Important v1.1 rule

`products.stockQuantity` is no longer the authoritative inventory source once warehouse inventory is implemented.

Stock belongs to `warehouse_stock`.

Example product:

```json
{
  "name": "Rose Plant",
  "categoryId": "category_001",
  "categoryName": "Flower Plants",
  "supplierId": "supplier_001",
  "supplier": "ABC Nursery Suppliers",
  "unitPrice": 250,
  "gst": 18,
  "barcode": "890100000001",
  "isActive": true
}
```

---

# 7. Collection: suppliers

Document path:

```text
suppliers/{supplierId}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Supplier name |
| `mobile` | string | Recommended | Contact number |
| `email` | string | No | Email |
| `address` | string | No | Address |
| `gstNumber` | string | No | GST number |
| `notes` | string | No | Internal notes |
| `isActive` | boolean | Yes | Supplier status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

The current product UI uses a single supplier selection. Historical supplier-product relationships will still be captured through purchases.

---

# 8. Collection: warehouses

## Purpose

Stores physical inventory locations.

Document path:

```text
warehouses/{warehouseId}
```

Schema:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Warehouse display name |
| `code` | string | Yes | Short unique warehouse code |
| `address` | string | No | Warehouse address |
| `isActive` | boolean | Yes | Whether warehouse can be used |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

Initial records:

```text
Warehouse 1 → WH1
Warehouse 2 → WH2
```

Example:

```json
{
  "name": "Warehouse 1",
  "code": "WH1",
  "address": "",
  "isActive": true
}
```

Do not hardcode warehouse IDs into product logic.

---

# 9. Collection: warehouse_stock

## Purpose

Stores the current quantity of a product at a particular warehouse.

Document path:

```text
warehouse_stock/{stockId}
```

Schema:

| Field | Type | Required | Description |
|---|---|---|---|
| `productId` | string | Yes | Product document ID |
| `productName` | string | Recommended | Product snapshot/display value |
| `warehouseId` | string | Yes | Warehouse document ID |
| `warehouseName` | string | Recommended | Warehouse snapshot/display value |
| `quantity` | number | Yes | Current stock at this warehouse |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last stock update |

Example:

```text
Product: Rose Plant

warehouse_stock record A
  productId   = rose_product_id
  warehouseId = warehouse_1_id
  quantity    = 20

warehouse_stock record B
  productId   = rose_product_id
  warehouseId = warehouse_2_id
  quantity    = 30
```

Therefore:

```text
Total Rose Plant Stock = 20 + 30 = 50
```

## Integrity rule

There should be at most one current stock record for a given:

```text
productId + warehouseId
```

Application logic must prevent duplicate stock records for the same product/warehouse pair.

---

# 10. Product Availability

Availability is no longer based on one `products.stockQuantity` field.

Calculate:

```text
Total Stock = SUM(quantity for product across active warehouses)
```

Then:

```text
Product Active
AND Category Active
AND Total Stock > 0
        ↓
     AVAILABLE
```

If total stock is zero:

```text
Warehouse 1 = 0
Warehouse 2 = 0
Total       = 0
→ Out of Stock
```

If one warehouse has zero but another has stock:

```text
Warehouse 1 = 0
Warehouse 2 = 15
Total       = 15
→ Product is still globally in stock
```

---

# 11. Add Product Flow

The Add Product screen should eventually collect initial stock per warehouse.

Example:

```text
Product Name: Rose Plant
Category:     Plants
Supplier:     ABC Supplier
Unit Price:   ₹250

Initial Stock
--------------------------------
Warehouse 1               20
Warehouse 2               30
--------------------------------
Total                     50
```

Saving a product requires:

```text
1. Create product
2. Obtain productId
3. Create warehouse_stock for Warehouse 1
4. Create warehouse_stock for Warehouse 2
5. Create OPENING_STOCK inventory transactions where quantity > 0
```

Eventually this operation should be implemented atomically where appropriate.

---

# 12. All Products Screen

The All Products screen should eventually display warehouse-level inventory.

Example:

```text
Product      Category   Supplier   WH1   WH2   Total   Status
----------------------------------------------------------------
Rose Plant   Plants     ABC         20    30     50     Active
Money Plant  Plants     XYZ          0    15     15     Active
Tulip        Plants     ABC          0     0      0     Out of Stock
```

Product details can also show:

```text
Warehouse Stock
Warehouse 1: 20
Warehouse 2: 30
Total:       50
```

Warehouse quantities must be loaded from `warehouse_stock`, not from hardcoded product fields.

---

# 13. Editing Products and Stock

Product master editing and stock editing are conceptually different operations.

Product editing includes fields such as:

- Name
- Category
- Supplier
- Price
- GST
- Description
- Product status

Warehouse quantity changes should ultimately be handled as inventory operations rather than silently overwriting stock without history.

For example:

```text
Stock adjustment
WH1: 20 → 18
```

should create an inventory transaction describing the adjustment.

---

# 14. Collection: purchases

A purchase must identify the warehouse receiving the inventory.

Document path:

```text
purchases/{purchaseId}
```

Important fields:

| Field | Type | Required |
|---|---|---|
| `purchaseNumber` | string | Yes |
| `supplierId` | string | Yes |
| `supplierName` | string | Recommended |
| `warehouseId` | string | Yes |
| `warehouseName` | string | Recommended |
| `purchaseDate` | timestamp | Yes |
| `status` | string | Yes |
| `subtotal` | number | Yes |
| `gstAmount` | number | Yes |
| `totalAmount` | number | Yes |
| `notes` | string | No |
| `createdAt` | timestamp | Recommended |
| `updatedAt` | timestamp | Recommended |

Example:

```text
Supplier ABC
      ↓
Purchase PUR-2026-000001
      ↓
Receiving Warehouse = WH1
      ↓
Stock added to WH1
```

---

# 15. Collection: purchase_items

Document path:

```text
purchase_items/{purchaseItemId}
```

Fields include:

- `purchaseId`
- `productId`
- `productName`
- `quantity`
- `unitCost`
- `gst`
- `totalCost`
- `createdAt`

The warehouse can normally be obtained from the parent purchase, because the purchase represents receipt into a selected warehouse.

---

# 16. Purchase → Warehouse Stock Flow

Example:

```text
WH1 current Rose stock = 20
Purchase receives       = 50
WH1 new Rose stock      = 70
```

Flow:

```text
Supplier
   ↓
Purchase
   ↓
Selected Receiving Warehouse
   ↓
Purchase Items
   ↓
warehouse_stock + quantity
   ↓
Inventory Transaction (IN)
```

WH2 remains unchanged.

---

# 17. Active Warehouse / User Session

The application will eventually have authentication.

Current staffing requirement:

```text
1 Admin
2 Sales Representatives
```

All three users can access both Warehouse 1 and Warehouse 2.

Therefore, a user is **not permanently assigned to one warehouse**.

Instead, the application should maintain an **active warehouse context** for the current working session.

Conceptually:

```text
LOGIN
  ↓
SELECT ACTIVE WAREHOUSE
  ↓
Warehouse 1 OR Warehouse 2
  ↓
Application Session
```

Example:

```text
Logged-in user: Sales Rep A
Active Warehouse: Warehouse 1
```

The user may still view products and stock information from both warehouses.

The active warehouse mainly determines the **primary stock source for sales and other warehouse-specific operations**.

---

# 18. Warehouse Selector

After authentication is implemented, the application should provide a clearly visible warehouse selector/context.

Example:

```text
User: Sales Rep A
Active Warehouse: [ Warehouse 1 ▼ ]
```

The active warehouse must be known before completing a sale.

The selected warehouse should be available to billing logic through application/session state.

---

# 19. Collection: orders

Orders must record warehouse context.

Important fields now include:

| Field | Type | Required | Description |
|---|---|---|---|
| `orderNumber` | string | Yes | Business order number |
| `customerName` | string | No | Customer snapshot |
| `customerMobile` | string | No | Customer snapshot |
| `warehouseId` | string | Yes | Active/originating warehouse |
| `warehouseName` | string | Recommended | Warehouse snapshot |
| `orderDate` | timestamp | Yes | Sale date/time |
| `status` | string | Yes | Draft / Completed / Cancelled / Returned |
| `subtotal` | number | Yes | Before discount/tax |
| `discountAmount` | number | Yes | Discount |
| `gstAmount` | number | Yes | GST amount |
| `totalAmount` | number | Yes | Final amount |
| `createdBy` | string | Future | User ID |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

---

# 20. Collection: order_items

Order items continue to store historical product snapshots.

Important fields:

- `orderId`
- `productId`
- `productName`
- `barcode`
- `quantity`
- `unitPrice`
- `gst`
- `discountAmount`
- `totalAmount`
- `createdAt`

If one order line is fulfilled from multiple warehouses, fulfillment/source information must also be preserved. This can be represented in the order item or associated stock transactions. The inventory transaction ledger is the authoritative history of which warehouse quantities were actually deducted.

---

# 21. Sales Stock Deduction Rule

The active warehouse has first priority.

Example:

```text
Active Warehouse = WH1
Customer buys Rose Plant
```

## Case 1 — active warehouse has enough

```text
Requested = 3
WH1 = 10
WH2 = 20

Deduct 3 from WH1

WH1 → 7
WH2 → 20
```

## Case 2 — active warehouse has zero

```text
Requested = 3
WH1 = 0
WH2 = 20

Deduct 3 from WH2

WH1 → 0
WH2 → 17
```

## Case 3 — active warehouse has some, but not enough

The architecture supports split fulfillment.

```text
Requested = 5
WH1 = 2
WH2 = 10

WH1 supplies 2
WH2 supplies 3

WH1 → 0
WH2 → 7
```

This rule should be implemented explicitly in billing logic rather than hiding it in the UI.

---

# 22. Sale Validation

A sale is allowed only when:

```text
Requested Quantity <= Total Available Quantity Across Warehouses
```

Example:

```text
WH1 = 2
WH2 = 3
Total = 5

Request 4 → Allowed
Request 5 → Allowed
Request 6 → Rejected
```

Stock must never become negative at any warehouse.

---

# 23. Collection: inventory_transactions

Every inventory movement must identify the warehouse affected.

Document path:

```text
inventory_transactions/{transactionId}
```

Schema:

| Field | Type | Required | Description |
|---|---|---|---|
| `productId` | string | Yes | Product affected |
| `productName` | string | Recommended | Product snapshot |
| `warehouseId` | string | Yes | Warehouse whose stock changed |
| `warehouseName` | string | Recommended | Warehouse snapshot |
| `transactionType` | string | Yes | Movement type |
| `quantity` | number | Yes | Quantity moved |
| `direction` | string | Yes | IN / OUT |
| `quantityBefore` | number | Recommended | Warehouse stock before |
| `quantityAfter` | number | Recommended | Warehouse stock after |
| `referenceType` | string | Yes | PURCHASE / ORDER / ADJUSTMENT |
| `referenceId` | string | Yes | Related document |
| `supplierId` | string | No | Related supplier |
| `orderId` | string | No | Related order |
| `notes` | string | No | Reason/details |
| `createdAt` | timestamp | Yes | Movement timestamp |
| `createdBy` | string | Future | User ID |

Possible transaction types:

- `OPENING_STOCK`
- `PURCHASE`
- `SALE`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `RETURN_IN`
- `RETURN_OUT`
- `TRANSFER_IN` (future)
- `TRANSFER_OUT` (future)

---

# 24. Split Sale Inventory Transactions

Suppose:

```text
Active warehouse = WH1
Requested = 5
WH1 stock = 2
WH2 stock = 10
```

The sale produces two inventory transactions.

Transaction 1:

```json
{
  "productId": "product_001",
  "warehouseId": "warehouse_1",
  "transactionType": "SALE",
  "quantity": 2,
  "direction": "OUT",
  "quantityBefore": 2,
  "quantityAfter": 0,
  "referenceType": "ORDER",
  "referenceId": "order_001"
}
```

Transaction 2:

```json
{
  "productId": "product_001",
  "warehouseId": "warehouse_2",
  "transactionType": "SALE",
  "quantity": 3,
  "direction": "OUT",
  "quantityBefore": 10,
  "quantityAfter": 7,
  "referenceType": "ORDER",
  "referenceId": "order_001"
}
```

This gives an exact audit trail of where the sold inventory came from.

---

# 25. Current Stock Formula

Current stock is calculated per warehouse:

```text
Warehouse Stock
= Opening Stock
+ Purchases
+ Returns In
+ Adjustments In
- Sales
- Adjustments Out
± Transfers
```

For fast application access, the current value is stored in `warehouse_stock.quantity`.

`inventory_transactions` provides the historical ledger.

Total product stock is derived as:

```text
TOTAL PRODUCT STOCK
= SUM(warehouse_stock.quantity)
```

---

# 26. Atomic Stock Updates

Stock-changing operations must use Firestore transactions when the resulting quantity depends on current quantity.

Conceptually:

```text
BEGIN FIRESTORE TRANSACTION
        ↓
Read required warehouse_stock records
        ↓
Calculate total available stock
        ↓
Validate requested quantity
        ↓
Determine deduction allocation
        ↓
Update warehouse_stock records
        ↓
Create order / related records
        ↓
Create inventory transaction records
        ↓
COMMIT
```

Either all required changes succeed or the operation should fail.

This prevents concurrent billing users from overselling stock.

---

# 27. Barcode and Billing

A barcode still identifies the product/SKU, not a warehouse-specific physical unit.

```text
Barcode
   ↓
Product
   ↓
Read warehouse stock
   ↓
Add to billing cart
   ↓
Checkout
   ↓
Use active warehouse priority
   ↓
Deduct stock
```

Scanning a barcode does **not** change inventory. Inventory changes only after successful checkout.

---

# 28. Billing Cart

The billing cart can remain in Angular application state before checkout.

```text
Cart Item
├── productId
├── productName
├── barcode
├── quantity
├── unitPrice
├── gst
└── totalAmount
```

Warehouse allocation does not need to be finalized when an item is merely scanned. It should be validated and finalized at checkout using current stock values.

---

# 29. Returns and Cancellation

Completed orders should not simply be deleted.

A return must restore stock and create inventory transaction records.

Because sales may have used more than one warehouse, the system must preserve enough fulfillment history to determine the appropriate warehouse for stock restoration.

Example:

```text
Original sale:
WH1 OUT 2
WH2 OUT 3

Full return:
WH1 IN 2
WH2 IN 3
```

This preserves warehouse-level inventory accuracy.

---

# 30. Warehouse Transfers — Future

The architecture should support transferring stock between warehouses.

Example:

```text
Transfer 10 Rose Plants
WH1 → WH2
```

Inventory effects:

```text
WH1: TRANSFER_OUT 10
WH2: TRANSFER_IN 10
```

Total company stock remains unchanged.

A dedicated `stock_transfers` collection can be introduced when transfer workflow is implemented.

---

# 31. Historical Snapshots

Historical documents should retain display values used at transaction time.

Examples:

Orders/order items:

- product name
- barcode
- selling price
- GST
- warehouse context

Purchases:

- supplier name
- warehouse name
- product name
- cost
- GST

Inventory transactions:

- product name
- warehouse name

Master-data changes should not rewrite historical transactions.

---

# 32. Updated Relationship Summary

```text
CATEGORY 1 ───────── N PRODUCT

PRODUCT 1 ───────── N WAREHOUSE_STOCK
WAREHOUSE 1 ─────── N WAREHOUSE_STOCK

SUPPLIER 1 ──────── N PURCHASE
WAREHOUSE 1 ─────── N PURCHASE
PURCHASE 1 ──────── N PURCHASE_ITEM
PRODUCT 1 ───────── N PURCHASE_ITEM

WAREHOUSE 1 ─────── N ORDER
ORDER 1 ─────────── N ORDER_ITEM
PRODUCT 1 ───────── N ORDER_ITEM

PRODUCT 1 ───────── N INVENTORY_TRANSACTION
WAREHOUSE 1 ─────── N INVENTORY_TRANSACTION
```

---

# 33. Updated ERD

```text
┌─────────────────┐
│   CATEGORIES    │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│    PRODUCTS     │
│ productId       │
│ categoryId      │
│ supplierId      │
│ name            │
│ barcode         │
│ price / gst     │
│ isActive        │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐        ┌─────────────────┐
│     WAREHOUSE_STOCK     │ N:1    │   WAREHOUSES    │
│ productId               │───────▶│ warehouseId     │
│ warehouseId             │        │ name            │
│ quantity                │        │ code            │
└─────────────────────────┘        │ isActive        │
                                   └───────┬─────────┘
                                           │
                         ┌─────────────────┼──────────────────┐
                         │                 │                  │
                         ▼                 ▼                  ▼
                   PURCHASES           ORDERS       INVENTORY_TRANSACTIONS
                         │                 │                  ▲
                         ▼                 ▼                  │
                  PURCHASE_ITEMS      ORDER_ITEMS ────────────┘
                         │                 │
                         └────── PRODUCT ──┘

SUPPLIERS
    │
    │ 1:N
    ▼
PURCHASES
```

---

# 34. Overall Business Flow

```text
                         SUPPLIER
                            │
                            ▼
                         PURCHASE
                            │
                    Select Warehouse
                            │
                            ▼
                         STOCK IN
                            │
                            ▼
                     WAREHOUSE_STOCK
                            │
                            ▼
                          PRODUCT
                            │
                            ▼
                         BARCODE
                            │
                           SCAN
                            │
                            ▼
                         BILLING
                            │
                    Active Warehouse
                            │
                            ▼
                          ORDER
                            │
                            ▼
              Active Warehouse Priority
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
          Primary Warehouse      Other Warehouse
                 │                     │
                 └──────────┬──────────┘
                            ▼
                         STOCK OUT
                            │
                            ▼
                INVENTORY TRANSACTIONS
                            │
                            ▼
                  DASHBOARD / REPORTS
```

---

# 35. Dashboard Data

Dashboard reporting can eventually include:

- Total products
- Active products
- Inactive products
- Total stock across all warehouses
- Stock by warehouse
- Low-stock products
- Out-of-stock products
- Today's orders
- Today's sales
- Sales by warehouse
- Inventory value by warehouse

Possible views:

```text
Overall Company
Warehouse 1
Warehouse 2
```

Charts can include:

- Stock by category
- Stock by warehouse
- Product distribution
- Sales over time
- Sales by warehouse

---

# 36. Security and Roles

Future roles:

- Admin
- Manager
- Billing Staff
- Inventory Staff

Current business requirement:

```text
Admin              → access WH1 + WH2
Sales Representative 1 → access WH1 + WH2
Sales Representative 2 → access WH1 + WH2
```

Warehouse access and active warehouse are separate concepts.

A user may have permission to access both warehouses while operating in one active warehouse context at a time.

Future user data may contain permitted warehouse IDs if access restrictions are later introduced.

---

# 37. Deletion Strategy

Master records should generally be deactivated rather than deleted once referenced historically.

This applies to:

- Categories
- Products
- Suppliers
- Warehouses

Transactional records should not normally be physically deleted after completion:

- Purchases
- Orders
- Inventory transactions

Warehouses containing historical transactions should be marked inactive rather than deleted.

---

# 38. Updated Data Integrity Rules

The application should enforce:

1. Stock cannot become negative.
2. Warehouse stock cannot become negative.
3. Sale quantity cannot exceed total available stock across permitted warehouses.
4. The active warehouse is the first stock source for a sale.
5. Another warehouse may supply remaining quantity when the active warehouse cannot fully satisfy the sale.
6. Every warehouse stock change creates an inventory transaction.
7. Every inventory transaction records `warehouseId`.
8. Inventory transactions reference their source document.
9. There should be only one current `warehouse_stock` record per product/warehouse pair.
10. Total product stock is derived from warehouse stock.
11. Product availability uses total warehouse stock, not one warehouse alone.
12. Historical order prices do not change when product prices change.
13. Historical purchase costs do not change when supplier pricing changes.
14. Historical transactions should not be silently deleted.
15. Product barcode values should be unique among active products.
16. Business order numbers should be unique.
17. Business purchase numbers should be unique.
18. Stock-changing operations should be atomic.
19. Customer information remains an order snapshot.
20. Category relationships should ultimately use category IDs rather than names.
21. Master records should be deactivated when historical data depends on them.
22. Completed sales must record the originating/active warehouse.
23. Split warehouse fulfillment must remain traceable.
24. Returns must restore stock using the recorded warehouse fulfillment history.

---

# 39. Updated Testing Strategy

## Warehouses

- Create WH1
- Create WH2
- Activate/deactivate warehouse
- Ensure inactive warehouse cannot be selected for new operational transactions

## Products

- Create product with WH1 and WH2 opening quantities
- Product with stock only in WH1
- Product with stock only in WH2
- Product with zero stock everywhere
- Verify total stock calculation
- Verify availability logic

## Sales

Test:

```text
WH1=10, WH2=10, request=3, active=WH1
→ WH1 becomes 7
```

```text
WH1=0, WH2=10, request=3, active=WH1
→ WH2 becomes 7
```

```text
WH1=2, WH2=10, request=5, active=WH1
→ WH1 becomes 0
→ WH2 becomes 7
```

```text
WH1=2, WH2=2, request=5
→ Reject sale
```

Also verify corresponding inventory transaction records.

## Purchases

- Receive purchase into WH1
- Receive purchase into WH2
- Ensure only selected warehouse quantity increases

## Returns

- Return sale fulfilled entirely by active warehouse
- Return split sale
- Verify warehouse quantities are restored correctly

## Concurrency

- Simulate concurrent sales
- Ensure Firestore transaction prevents negative inventory/overselling

---

# 40. Updated Implementation Order

The implementation sequence changes because warehouse stock must exist before purchasing and billing are built.

```text
PHASE 1   Categories                               DONE
PHASE 2   Products                                 DONE
PHASE 3   Suppliers                                DONE
PHASE 4   Warehouses                               NEXT
PHASE 5   Warehouse Stock
PHASE 6   Modify Add Product for warehouse stock
PHASE 7   Modify All Products for WH1/WH2/Total
PHASE 8   Warehouse-aware product editing/stock adjustments
PHASE 9   Purchases + Purchase Items
PHASE 10  Inventory Transactions
PHASE 11  Stock IN / Adjustments
PHASE 12  Barcode Generation / Labels
PHASE 13  Billing Cart / Barcode Scanning
PHASE 14  Orders + Order Items
PHASE 15  Active Warehouse Sales Deduction
PHASE 16  Returns / Cancellation
PHASE 17  Dashboard / Reports / Charts
PHASE 18  Authentication
PHASE 19  Roles / Warehouse Session Context / Security Rules
PHASE 20  Production Deployment
```

---

# 41. Current Development Status

Implemented:

- [x] Categories
- [x] Add Category
- [x] Edit Category
- [x] Activate / Deactivate Category
- [x] Delete Category
- [x] Product creation
- [x] Product category selection
- [x] Supplier management
- [x] Supplier selection on product
- [x] Supplier display in product workflow
- [x] Product listing
- [x] Product details
- [x] Product editing
- [x] Product deletion
- [x] Existing product availability logic
- [x] Existing stock quantity handling
- [x] Firestore Emulator integration

Architecture change approved but not yet implemented:

- [ ] Warehouses
- [ ] Warehouse-specific stock
- [ ] Warehouse-based availability calculation
- [ ] Warehouse-aware purchases
- [ ] Active warehouse session
- [ ] Warehouse-priority sales deduction
- [ ] Split warehouse fulfillment

---

# 42. Immediate Next Development Milestone

The next coding task is **Warehouse Foundation**.

Do not begin by modifying the All Products table.

Sequence:

```text
1. Create Warehouse interface/model
        ↓
2. Create WarehouseService
        ↓
3. Create WH1 and WH2 in Firestore Emulator
        ↓
4. Verify warehouse CRUD/read behavior
        ↓
5. Create WarehouseStockService
        ↓
6. Modify Add Product
        ↓
7. Test product + warehouse stock creation
        ↓
8. Modify All Products
        ↓
9. Modify product stock editing/adjustments
```

---

# 43. Migration of Existing Products

Existing product documents currently contain `stockQuantity`.

These values must not simply disappear when warehouse stock is introduced.

A deliberate migration is required.

For each existing product, decide which warehouse currently owns its existing quantity.

Example:

```text
Existing:
Rose Plant.stockQuantity = 50
```

If existing inventory physically belongs to Warehouse 1:

```text
warehouse_stock
  Rose + WH1 = 50
  Rose + WH2 = 0
```

After migration and verification, `products.stockQuantity` should no longer be used as the inventory source of truth.

Do not automatically split old stock 50/50 unless that reflects the actual physical inventory.

---

# 44. Architecture Rule Going Forward

Before implementing a major module:

1. Define the collection.
2. Define document fields.
3. Define relationships.
4. Define warehouse impact.
5. Define stock impact.
6. Define historical-data requirements.
7. Define validation.
8. Implement the service.
9. Implement the UI.
10. Test with Firestore Emulator.
11. Run `npm run build`.
12. Commit the working milestone.

---

# 45. Final Target Architecture

```text
                              CATEGORY
                                 │
                                 ▼
                              PRODUCT
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
              WAREHOUSE_STOCK             BARCODE
                    │                         │
                    ▼                         ▼
                WAREHOUSE                   SCAN
                    │                         │
          ┌─────────┴─────────┐               ▼
          │                   │            BILLING
          ▼                   ▼               │
      PURCHASE              ORDER ◀───────────┘
          │                   │
          ▼                   ▼
   PURCHASE_ITEM          ORDER_ITEM
          │                   │
          └─────────┬─────────┘
                    │
                    ▼
          INVENTORY_TRANSACTIONS
                    │
                    ▼
             DASHBOARD / REPORTS

SUPPLIER
   │
   ▼
PURCHASE
```

Complete business flow:

```text
SUPPLIER
   ↓
PURCHASE
   ↓
SELECT RECEIVING WAREHOUSE
   ↓
STOCK IN
   ↓
WAREHOUSE STOCK
   ↓
PRODUCT / BARCODE
   ↓
SCAN
   ↓
BILLING
   ↓
ACTIVE WAREHOUSE PRIORITY
   ↓
ORDER
   ↓
STOCK OUT FROM ONE OR MORE WAREHOUSES
   ↓
INVENTORY HISTORY
   ↓
DASHBOARD / REPORTS
```

---

# 46. Version 1.1 Decisions Summary

The following decisions are now part of the architecture:

- The business currently has two warehouses.
- The architecture supports more than two warehouses.
- Warehouse quantities are not hardcoded into product fields.
- `warehouse_stock` stores current stock by product and warehouse.
- `products.stockQuantity` will be retired as the authoritative stock field after migration.
- Total stock is the sum of warehouse quantities.
- A product is globally out of stock only when total stock across warehouses is zero.
- All three current staff members may access both warehouses.
- Users will operate with an active warehouse context.
- Users can still see inventory information for both warehouses.
- During sales, the active warehouse has first deduction priority.
- If necessary, another warehouse can supply remaining stock.
- Split fulfillment must be recorded in inventory transactions.
- Purchases must identify the receiving warehouse.
- Every inventory transaction must identify the affected warehouse.
- Returns must respect the warehouse source history of the original sale.
- Firestore transactions will protect stock-changing operations from concurrency problems.

---

# 47. Next Step

With blueprint v1.1 finalized, implementation starts with:

```text
WarehouseService
      ↓
Create WH1 + WH2
      ↓
WarehouseStockService
      ↓
Modify Add Product
      ↓
Modify All Products
```

This warehouse foundation should be completed before building Purchases, Inventory Transactions, or Billing.
