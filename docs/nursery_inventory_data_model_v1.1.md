# Nursery Inventory & Billing System — Data Model v1.1

**Project:** Nursery Inventory Dashboard  
**Database:** Firebase Cloud Firestore  
**Frontend:** Angular  
**Status:** Design / Blueprint — Multi-Warehouse Revision  
**Version:** 1.1  
**Last Updated:** 2026-09-27

---

# 1. Purpose

This document defines the planned data model for the nursery inventory, purchasing, warehouse stock, barcode, billing, sales/order, and reporting system.

Version 1.1 extends the original architecture to support:

- Multiple warehouses
- Warehouse-specific stock
- Warehouse-aware purchasing
- Warehouse-aware billing and sales
- Stock transfers between warehouses
- Warehouse-specific inventory history
- Current warehouse context for application users

It also reflects the supplier functionality implemented after v1.0.

This document should be treated as the primary reference when implementing new modules.

Any major database-model change should be reflected here before implementation.

---

# 2. Database Technology

The application uses:

**Firebase Cloud Firestore**

Firestore is a NoSQL, document-oriented database.

The basic structure is:

```text
Collection
    ↓
Document
    ↓
Fields
```

The application primarily uses root-level collections for major business entities.

---

# 3. High-Level Business Architecture

```text
                         CATEGORIES
                             │
                             │ 1:N
                             ▼
                          PRODUCTS
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  ▼                     ▼
              WAREHOUSES ◄────── WAREHOUSE_STOCK
                                      │
                                      │
                        Product + Warehouse + Quantity
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
                PURCHASES           ORDERS          TRANSFERS
                    │                 │                 │
                    ▼                 ▼                 ▼
                 STOCK IN          STOCK OUT       OUT → IN
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      ▼
                           INVENTORY_TRANSACTIONS
```

---

# 4. Core Collections

The application architecture uses:

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
- `stock_transfers`
- `stock_transfer_items`

Current implementation includes:

- `categories`
- `products`
- `suppliers`

Future collections may include:

- `users`
- `payments`
- `settings`
- `stock_adjustments`
- `product_suppliers`

---

# 5. Collection: categories

## Purpose

Stores product categories.

Examples:

- Plants
- Pots
- Fertilizers
- Seeds
- Garden Tools

## Document path

`categories/{categoryId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Category display name |
| `code` | string | Yes | Category/business code |
| `isActive` | boolean | Yes | Category status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification |

## Relationship

```text
CATEGORY 1 ───────── N PRODUCT
```

---

# 6. Collection: products

## Purpose

The product master stores the definition of every product sold or stocked.

A product is global across warehouses.

A product does **not** represent warehouse-specific inventory.

## Document path

`products/{productId}`

## Target Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Product name |
| `categoryId` | string | Recommended | Category document ID |
| `categoryName` | string | Optional | Category snapshot |
| `supplierId` | string | Current | Currently selected/default supplier ID |
| `supplier` | string | Current | Currently selected/default supplier name |
| `description` | string | No | Description |
| `unitPrice` | number | Yes | Selling price |
| `gst` | number | Yes | GST percentage |
| `standardPackage` | number | No | Package quantity/size |
| `barcode` | string | Future | Product barcode |
| `image` | string | No | Product image |
| `isActive` | boolean | Yes | Product master status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

## Important Stock Change

In v1.0:

```text
products.stockQuantity
```

was intended to be the authoritative current stock.

In v1.1, stock becomes warehouse-specific.

Therefore the target model is:

```text
products
    ↓
Product master information

warehouse_stock
    ↓
Actual current quantity per Product × Warehouse
```

`products.stockQuantity` may temporarily remain during migration, but it must not remain the authoritative stock source after warehouse inventory is implemented.

---

# 7. Category Relationship

The current application stores category by name.

Current:

```javascript
product.category = "Gold Buckets";
```

Target:

```javascript
product.categoryId = "category_document_id";
product.categoryName = "Gold Buckets";
```

Relationship:

```text
PRODUCT
   │
   └── categoryId
           │
           ▼
       CATEGORY
```

Using the ID prevents category renaming from breaking relationships.

---

# 8. Product Barcode

Each sellable product should have one SKU/product barcode.

```text
ONE PRODUCT
    ↓
ONE BARCODE
    ↓
MANY PHYSICAL UNITS
    ↓
POSSIBLY STORED IN MULTIPLE WAREHOUSES
```

Example:

```text
Rose Plant
Barcode: 890100000001

Warehouse A: 100 units
Warehouse B: 60 units
Total:       160 units
```

Scanning the barcode identifies the product.

It does **not** identify the warehouse.

The application's current warehouse context determines which warehouse inventory is used during billing.

---

# 9. Collection: suppliers

## Purpose

Stores suppliers/dealers.

## Document path

`suppliers/{supplierId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Supplier name |
| `mobile` | string | Recommended | Contact number |
| `email` | string | No | Email |
| `address` | string | No | Address |
| `gstNumber` | string | No | GST number |
| `notes` | string | No | Notes |
| `isActive` | boolean | Yes | Supplier status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

## Current Implementation Status

Supplier functionality has now been implemented.

Implemented:

- Add supplier
- List suppliers
- Edit supplier
- Activate/deactivate supplier
- Delete supplier
- Supplier selection while adding a product
- Supplier display in All Products
- Supplier dropdown while editing a product
- Product supplier update in Firestore

The current product implementation supports **one selected supplier per product**.

Fields currently used:

```javascript
supplierId
supplier
```

---

# 10. Supplier ↔ Product Relationship

The long-term business relationship remains:

```text
SUPPLIER N ───────── N PRODUCT
```

because different suppliers may supply the same product over time.

The current product UI maintains one selected/default supplier:

```text
PRODUCT
   │
   ├── supplierId
   └── supplier
```

Actual historical supplier-product relationships should primarily be derived from purchases:

```text
SUPPLIER
    ↓
PURCHASE
    ↓
PURCHASE_ITEM
    ↓
PRODUCT
```

A future `product_suppliers` collection can be introduced if supplier-specific catalogs, prices, or multiple preferred suppliers are required.

---

# 11. Collection: warehouses

## Purpose

Stores physical warehouse/store inventory locations.

The business currently has two warehouse locations, but the architecture supports more warehouses later.

## Document path

`warehouses/{warehouseId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Warehouse display name |
| `code` | string | Yes | Unique short warehouse code |
| `address` | string | No | Warehouse address |
| `mobile` | string | No | Contact number |
| `isActive` | boolean | Yes | Warehouse status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification |

## Example

```json
{
  "name": "Warehouse 1",
  "code": "WH01",
  "address": "Amravati, Maharashtra",
  "mobile": "",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 12. Collection: warehouse_stock

## Purpose

Stores the current stock quantity of a product at a specific warehouse.

This becomes the authoritative source for current inventory.

## Document path

`warehouse_stock/{warehouseStockId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `warehouseId` | string | Yes | Warehouse ID |
| `warehouseName` | string | Recommended | Warehouse snapshot/display value |
| `productId` | string | Yes | Product ID |
| `productName` | string | Recommended | Product snapshot/display value |
| `quantity` | number | Yes | Current quantity at warehouse |
| `updatedAt` | timestamp | Yes | Last stock update |

## Example

```json
{
  "warehouseId": "warehouse_001",
  "warehouseName": "Warehouse 1",
  "productId": "product_001",
  "productName": "Rose Plant",
  "quantity": 100,
  "updatedAt": "timestamp"
}
```

Another warehouse may contain:

```json
{
  "warehouseId": "warehouse_002",
  "warehouseName": "Warehouse 2",
  "productId": "product_001",
  "productName": "Rose Plant",
  "quantity": 60,
  "updatedAt": "timestamp"
}
```

Therefore:

```text
Rose Plant

Warehouse 1 = 100
Warehouse 2 = 60
------------------
Company Total = 160
```

## Uniqueness Rule

There should logically be only one stock record for each:

```text
warehouseId + productId
```

---

# 13. Product ↔ Warehouse Relationship

A product can exist in many warehouses.

A warehouse can contain many products.

Therefore:

```text
PRODUCT N ───────── N WAREHOUSE
```

implemented through:

```text
WAREHOUSE_STOCK
```

Conceptually:

```text
PRODUCT
   │
   └──────────────┐
                  ▼
           WAREHOUSE_STOCK
                  ▲
                  │
WAREHOUSE ────────┘
```

---

# 14. Current Warehouse Context

The application must know which warehouse the user is currently operating in.

Conceptually:

```text
Logged-in User
      ↓
Current Warehouse
      ↓
Application Context
```

Example:

```javascript
currentWarehouseId = "warehouse_001";
```

The current warehouse affects:

- Product stock shown to the user
- Billing availability
- Sale stock deduction
- Purchases/stock receiving
- Inventory adjustments
- Reports
- Dashboard data

The warehouse must not be inferred only from what is visible on a screen. It should be represented explicitly in application state and persisted on every stock-changing business transaction.

When authentication/roles are implemented, a user may have:

```text
defaultWarehouseId
allowedWarehouseIds[]
```

depending on business requirements.

---

# 15. Product Availability

Availability is now warehouse-specific.

Old logic:

```text
Product Active
AND Category Active
AND products.stockQuantity > 0
```

New logic:

```text
Product Active
AND Category Active
AND warehouse_stock.quantity > 0
FOR CURRENT WAREHOUSE
```

Example:

```text
Rose Plant

Warehouse 1 = 0
Warehouse 2 = 20
```

At Warehouse 1:

```text
Out of Stock
```

At Warehouse 2:

```text
Available
```

The product itself remains active in both cases.

---

# 16. Collection: purchases

## Purpose

Represents inventory received from a supplier into a specific warehouse.

## Document path

`purchases/{purchaseId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Purchase document ID |
| `purchaseNumber` | string | Yes | Human-readable purchase number |
| `supplierId` | string | Yes | Supplier ID |
| `supplierName` | string | Recommended | Supplier snapshot |
| `warehouseId` | string | Yes | Receiving warehouse |
| `warehouseName` | string | Recommended | Warehouse snapshot |
| `purchaseDate` | timestamp | Yes | Purchase/receipt date |
| `status` | string | Yes | Draft / Received / Cancelled |
| `subtotal` | number | Yes | Amount before GST |
| `gstAmount` | number | Yes | GST amount |
| `totalAmount` | number | Yes | Final amount |
| `notes` | string | No | Notes |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

## Stock Rule

A received purchase increases stock only at:

```text
purchase.warehouseId
```

---

# 17. Collection: purchase_items

## Document path

`purchase_items/{purchaseItemId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `purchaseId` | string | Yes | Parent purchase |
| `productId` | string | Yes | Product |
| `productName` | string | Yes | Product snapshot |
| `quantity` | number | Yes | Quantity received |
| `unitCost` | number | Yes | Supplier cost |
| `gst` | number | Yes | GST percentage |
| `totalCost` | number | Yes | Line total |
| `createdAt` | timestamp | Recommended | Creation timestamp |

Warehouse can be obtained from the parent purchase. If reporting requirements later justify it, `warehouseId` may also be denormalized onto purchase items.

---

# 18. Purchase → Warehouse Stock Flow

```text
Supplier
   ↓
Purchase
   ↓
Receiving Warehouse
   ↓
Purchase Items
   ↓
warehouse_stock
   ↓
Inventory Transaction
```

Example:

```text
Warehouse 1 Rose stock = 20
Purchase receives       = 50
New Warehouse 1 stock   = 70
```

Warehouse 2 is unchanged.

---

# 19. Collection: orders

## Purpose

Represents a customer sale/billing transaction.

Every completed sale belongs to a warehouse.

## Document path

`orders/{orderId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `orderNumber` | string | Yes | Human-readable number |
| `warehouseId` | string | Yes | Warehouse where sale occurred |
| `warehouseName` | string | Recommended | Warehouse snapshot |
| `customerName` | string | No | Customer snapshot |
| `customerMobile` | string | No | Customer snapshot |
| `orderDate` | timestamp | Yes | Sale date/time |
| `status` | string | Yes | Draft / Completed / Cancelled / Returned |
| `subtotal` | number | Yes | Before discount/tax |
| `discountAmount` | number | Yes | Discount |
| `gstAmount` | number | Yes | GST |
| `totalAmount` | number | Yes | Final amount |
| `paymentStatus` | string | Future | Paid / Partial / Unpaid |
| `paymentMethod` | string | Future | Cash / UPI / Card |
| `notes` | string | No | Notes |
| `createdBy` | string | Future | User ID |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

---

# 20. Customer Data Decision

No permanent customer master is required for v1.

Customer information remains an order snapshot:

```json
{
  "customerName": "Rahul Sharma",
  "customerMobile": "9876543210"
}
```

---

# 21. Collection: order_items

## Document path

`order_items/{orderItemId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `orderId` | string | Yes | Parent order |
| `productId` | string | Yes | Product |
| `productName` | string | Yes | Product snapshot |
| `barcode` | string | Yes | Barcode used |
| `quantity` | number | Yes | Quantity sold |
| `unitPrice` | number | Yes | Sale price |
| `gst` | number | Yes | GST percentage |
| `discountAmount` | number | Yes | Line discount |
| `totalAmount` | number | Yes | Final line amount |
| `createdAt` | timestamp | Recommended | Creation timestamp |

The order's `warehouseId` determines which warehouse stock is reduced.

---

# 22. Billing → Warehouse Stock Flow

The intended flow is:

```text
Logged-in User
      ↓
Current Warehouse
      ↓
Barcode Scan
      ↓
Find Product
      ↓
Read warehouse_stock
for Product + Current Warehouse
      ↓
Validate Quantity
      ↓
Cart
      ↓
Complete Billing
      ↓
Create Order with warehouseId
      ↓
Create Order Items
      ↓
Decrease Current Warehouse Stock
      ↓
Create Inventory Transactions
```

Example:

```text
Current Warehouse = Warehouse 1

Rose Plant:
Warehouse 1 = 100
Warehouse 2 = 60

Customer buys 5.

After sale:

Warehouse 1 = 95
Warehouse 2 = 60
```

Stock must never be deducted from another warehouse merely because that warehouse has available inventory.

---

# 23. Billing Cart

The billing cart can remain in Angular state before checkout.

```text
Cart
├── productId
├── productName
├── barcode
├── quantity
├── unitPrice
├── gst
└── totalAmount
```

Warehouse context should be maintained outside or alongside the cart:

```text
currentWarehouseId
```

At checkout:

```text
Cart
+
Current Warehouse
        ↓
Order
+
Order Items
+
Warehouse Stock Updates
+
Inventory Transactions
```

---

# 24. Collection: inventory_transactions

## Purpose

Stores the immutable business history of stock movements.

Transaction types include:

- `OPENING_STOCK`
- `PURCHASE`
- `SALE`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `RETURN_IN`
- `RETURN_OUT`
- `TRANSFER_IN`
- `TRANSFER_OUT`

## Document path

`inventory_transactions/{transactionId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Transaction ID |
| `warehouseId` | string | Yes | Warehouse affected |
| `warehouseName` | string | Recommended | Warehouse snapshot |
| `productId` | string | Yes | Product |
| `productName` | string | Recommended | Product snapshot |
| `transactionType` | string | Yes | Movement type |
| `quantity` | number | Yes | Quantity moved |
| `direction` | string | Yes | IN / OUT |
| `quantityBefore` | number | Recommended | Warehouse stock before |
| `quantityAfter` | number | Recommended | Warehouse stock after |
| `referenceType` | string | Yes | PURCHASE / ORDER / TRANSFER / ADJUSTMENT |
| `referenceId` | string | Yes | Related document |
| `supplierId` | string | No | Related supplier |
| `orderId` | string | No | Related order |
| `transferId` | string | No | Related transfer |
| `notes` | string | No | Reason/notes |
| `createdAt` | timestamp | Yes | Movement timestamp |
| `createdBy` | string | Future | User ID |

---

# 25. Inventory Transaction — Purchase Example

```json
{
  "warehouseId": "warehouse_001",
  "warehouseName": "Warehouse 1",
  "productId": "product_001",
  "productName": "Rose Plant",
  "transactionType": "PURCHASE",
  "quantity": 50,
  "direction": "IN",
  "quantityBefore": 20,
  "quantityAfter": 70,
  "referenceType": "PURCHASE",
  "referenceId": "purchase_001",
  "supplierId": "supplier_001",
  "createdAt": "timestamp"
}
```

---

# 26. Inventory Transaction — Sale Example

```json
{
  "warehouseId": "warehouse_001",
  "warehouseName": "Warehouse 1",
  "productId": "product_001",
  "productName": "Rose Plant",
  "transactionType": "SALE",
  "quantity": 3,
  "direction": "OUT",
  "quantityBefore": 70,
  "quantityAfter": 67,
  "referenceType": "ORDER",
  "referenceId": "order_001",
  "orderId": "order_001",
  "createdAt": "timestamp"
}
```

---

# 27. Stock Management

The authoritative current stock becomes:

```text
warehouse_stock.quantity
```

Current stock for one warehouse:

```text
Opening Stock
+ Purchases
+ Returns In
+ Transfers In
+ Adjustments In
- Sales
- Returns Out
- Transfers Out
- Adjustments Out
```

Company-wide product stock is derived by summing warehouse quantities:

```text
Total Product Stock
=
SUM(warehouse_stock.quantity for productId)
```

Example:

```text
Rose Plant

WH01 = 100
WH02 = 60

Total = 160
```

---

# 28. Important Stock Rule

Stock must never become negative at any warehouse.

Validation must use the relevant warehouse record:

```text
requestedQuantity <= warehouse_stock.quantity
```

Example:

```text
WH01 stock = 5
WH02 stock = 20
```

If billing from WH01:

```text
Request 3 → Allowed
Request 7 → Rejected
```

The application must not use WH02 stock to satisfy a WH01 sale automatically.

A warehouse transfer must be performed if inventory needs to move.

---

# 29. Atomic Stock Updates

Stock-changing operations must use Firestore transactions when the new value depends on existing warehouse stock.

Conceptually:

```text
READ warehouse_stock
        ↓
VALIDATE quantity
        ↓
UPDATE warehouse_stock
        ↓
CREATE business records
        ↓
CREATE inventory transaction
        ↓
COMMIT
```

For billing:

```text
READ Product + Warehouse Stock
        ↓
Validate enough stock
        ↓
Create Order
        ↓
Create Order Items
        ↓
Decrease warehouse_stock
        ↓
Create SALE Inventory Transaction
        ↓
COMMIT
```

This prevents concurrent billing users from overselling the same warehouse inventory.

---

# 30. Firestore Transaction vs Inventory Transaction

These remain separate concepts.

**Firestore transaction**

Technical atomic database operation:

```javascript
runTransaction(...)
```

**Inventory transaction**

Business history record:

```text
PURCHASE
SALE
TRANSFER
RETURN
ADJUSTMENT
```

---

# 31. Warehouse Transfers

Inventory can move between warehouses.

Example:

```text
Warehouse 1
Rose Plant = 100

Transfer 20

Warehouse 1 = 80
Warehouse 2 = previous quantity + 20
```

Transfers must not directly modify stock without history.

Flow:

```text
Source Warehouse
      ↓
TRANSFER_OUT
      ↓
Stock Transfer
      ↓
TRANSFER_IN
      ↓
Destination Warehouse
```

---

# 32. Collection: stock_transfers

## Document path

`stock_transfers/{transferId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Transfer document ID |
| `transferNumber` | string | Yes | Business-facing transfer number |
| `fromWarehouseId` | string | Yes | Source warehouse |
| `fromWarehouseName` | string | Recommended | Source snapshot |
| `toWarehouseId` | string | Yes | Destination warehouse |
| `toWarehouseName` | string | Recommended | Destination snapshot |
| `transferDate` | timestamp | Yes | Transfer date |
| `status` | string | Yes | Draft / Completed / Cancelled |
| `notes` | string | No | Notes |
| `createdBy` | string | Future | User |
| `createdAt` | timestamp | Yes | Creation timestamp |
| `updatedAt` | timestamp | Yes | Last update |

---

# 33. Collection: stock_transfer_items

## Document path

`stock_transfer_items/{transferItemId}`

## Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `transferId` | string | Yes | Parent transfer |
| `productId` | string | Yes | Product |
| `productName` | string | Yes | Product snapshot |
| `quantity` | number | Yes | Quantity transferred |
| `createdAt` | timestamp | Yes | Creation timestamp |

A completed transfer creates two inventory transactions per product:

```text
Source:
TRANSFER_OUT

Destination:
TRANSFER_IN
```

---

# 34. Transfer Atomicity

A completed warehouse transfer should atomically:

```text
Validate source quantity
        ↓
Decrease source warehouse_stock
        ↓
Increase destination warehouse_stock
        ↓
Create TRANSFER_OUT transaction
        ↓
Create TRANSFER_IN transaction
        ↓
Mark transfer Completed
```

Either the entire operation succeeds or none of it should be applied.

---

# 35. Order Cancellation and Returns

A completed order should not simply be deleted.

Because an order belongs to a warehouse, returned stock must return to the appropriate warehouse.

```text
Completed Order
      ↓
Warehouse from order.warehouseId
      ↓
RETURN_IN
      ↓
Increase warehouse_stock
```

Example:

```text
SALE
Warehouse 1
OUT 3

Return:
Warehouse 1
IN 3
```

---

# 36. Historical Snapshots

Historical records must remain meaningful even if master data changes.

Order snapshots include:

- `productId`
- `productName`
- `barcode`
- `unitPrice`
- `gst`

Order additionally stores:

- `warehouseId`
- `warehouseName`

Purchase snapshots include:

- `supplierId`
- `supplierName`
- `warehouseId`
- `warehouseName`

Inventory transactions include warehouse and product snapshots.

---

# 37. Relationship Summary

```text
CATEGORY 1 ───────── N PRODUCT

PRODUCT N ───────── N WAREHOUSE
            through
        WAREHOUSE_STOCK

SUPPLIER 1 ───────── N PURCHASE

WAREHOUSE 1 ──────── N PURCHASE

PURCHASE 1 ───────── N PURCHASE_ITEM

PRODUCT 1 ────────── N PURCHASE_ITEM

WAREHOUSE 1 ──────── N ORDER

ORDER 1 ──────────── N ORDER_ITEM

PRODUCT 1 ────────── N ORDER_ITEM

WAREHOUSE 1 ──────── N INVENTORY_TRANSACTION

PRODUCT 1 ────────── N INVENTORY_TRANSACTION

STOCK_TRANSFER 1 ─── N STOCK_TRANSFER_ITEM
```

---

# 38. Updated ERD

```text
┌───────────────────┐
│    CATEGORIES     │
├───────────────────┤
│ categoryId        │
│ name              │
│ code              │
│ isActive          │
└─────────┬─────────┘
          │ 1:N
          ▼
┌──────────────────────┐
│       PRODUCTS       │
├──────────────────────┤
│ productId            │
│ categoryId           │
│ categoryName         │
│ supplierId           │
│ supplier             │
│ name                 │
│ barcode              │
│ unitPrice            │
│ gst                  │
│ isActive             │
└──────────┬───────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────┐
│     WAREHOUSE_STOCK      │
├──────────────────────────┤
│ warehouseStockId         │
│ warehouseId              │
│ warehouseName            │
│ productId                │
│ productName              │
│ quantity                 │
│ updatedAt                │
└────────────┬─────────────┘
             │
             │ N:1
             ▼
┌──────────────────────┐
│      WAREHOUSES      │
├──────────────────────┤
│ warehouseId          │
│ name                 │
│ code                 │
│ address              │
│ isActive             │
└─────┬─────────┬──────┘
      │         │
      │         │
      ▼         ▼
 PURCHASES    ORDERS
      │         │
      ▼         ▼
PURCHASE_ITEMS ORDER_ITEMS


SUPPLIERS
    │
    │ 1:N
    ▼
PURCHASES


PRODUCTS
    │
    │ 1:N
    ▼
INVENTORY_TRANSACTIONS
    ▲
    │
WAREHOUSES


WAREHOUSE A
    │
    ▼
STOCK_TRANSFER
    │
    ▼
STOCK_TRANSFER_ITEMS
    │
    ▼
WAREHOUSE B
```

---

# 39. Overall Business Flow

```text
SUPPLIER
    ↓
PURCHASE
    ↓
SELECT / CURRENT WAREHOUSE
    ↓
STOCK IN
    ↓
WAREHOUSE_STOCK
    ↓
PRODUCT AVAILABLE AT WAREHOUSE
    ↓
BARCODE
    ↓
SCAN
    ↓
BILLING
    ↓
ORDER
    ↓
STOCK OUT FROM CURRENT WAREHOUSE
    ↓
INVENTORY TRANSACTION
    ↓
DASHBOARD / REPORTS
```

Warehouse transfer flow:

```text
WAREHOUSE A
    ↓
TRANSFER OUT
    ↓
STOCK TRANSFER
    ↓
TRANSFER IN
    ↓
WAREHOUSE B
```

---

# 40. Dashboard Data

The dashboard should support both:

```text
Current Warehouse View
```

and eventually:

```text
All Warehouses / Company View
```

Potential metrics:

- Total Products
- Active Products
- Inactive Products
- Current Warehouse Stock
- Company-wide Stock
- Low Stock Products
- Out of Stock Products
- Today's Orders
- Today's Sales
- Inventory Value
- Warehouse Transfers

Charts:

- Stock by Category
- Stock by Warehouse
- Product Distribution
- Sales Over Time
- Sales by Warehouse

---

# 41. Product Status vs Inventory Status

These remain separate.

Product status:

```text
products.isActive
```

Inventory status:

```text
warehouse_stock.quantity
```

Therefore the same product can be:

```text
Product Active

Warehouse 1 → Out of Stock
Warehouse 2 → In Stock
```

This is valid and expected.

---

# 42. Naming Standards

## Collections

Use plural lowercase snake_case:

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
- `stock_transfers`
- `stock_transfer_items`

## Fields

Use camelCase:

- `productId`
- `supplierId`
- `warehouseId`
- `purchaseDate`
- `createdAt`
- `updatedAt`

---

# 43. Business Number Format

Examples:

```text
Purchase:
PUR-2026-000001

Order:
ORD-2026-000001

Stock Transfer:
TRF-2026-000001
```

Business numbers do not replace Firestore document IDs.

---

# 44. Deletion Strategy

Master records:

- Categories
- Products
- Suppliers
- Warehouses

should generally use:

```text
isActive = false
```

once historical records depend on them.

Transactional records:

- Purchases
- Orders
- Inventory transactions
- Stock transfers

should generally not be physically deleted after completion.

Use status/reversal operations instead.

---

# 45. Security and Warehouse Authorization

Production will eventually use Firebase Authentication and Firestore Security Rules.

Potential roles:

- Admin
- Manager
- Billing Staff
- Inventory Staff

Potential warehouse-aware permissions:

```text
Admin
→ All warehouses

Manager
→ Assigned warehouses or all warehouses

Billing Staff
→ Billing for assigned warehouse(s)

Inventory Staff
→ Inventory operations for assigned warehouse(s)
```

Future user data may include:

```javascript
{
  defaultWarehouseId: "warehouse_001",
  allowedWarehouseIds: [
    "warehouse_001",
    "warehouse_002"
  ]
}
```

Server/security-rule authorization must ultimately enforce access; hiding warehouses in the Angular UI alone is not sufficient.

---

# 46. Firestore Emulator

Development uses:

```text
Angular Application
        ↓
Firestore Emulator
localhost:8080
```

Warehouse features should first be tested using the emulator.

---

# 47. Updated Testing Strategy

## Categories

- Create
- Edit
- Activate/deactivate
- Delete

## Products

- Create
- Edit
- Supplier selection
- Supplier update
- Activate/deactivate
- Category availability

## Suppliers

- Create
- Edit
- Activate/deactivate
- Delete
- Product association

## Warehouses

- Create
- Edit
- Activate/deactivate
- Switch current warehouse

## Warehouse Stock

- Same product in two warehouses
- Different quantity in each warehouse
- Zero stock in one warehouse
- Positive stock in another
- Company total calculation

## Purchases

- Select supplier
- Select receiving warehouse
- Receive multiple products
- Increase only selected warehouse stock
- Create inventory transactions

## Billing

- Select/current warehouse
- Scan barcode
- Find product
- Read current warehouse stock
- Reject insufficient warehouse stock
- Complete order
- Deduct only current warehouse stock
- Leave other warehouse stock unchanged
- Create inventory transaction

## Transfers

- Transfer product between warehouses
- Reject quantity greater than source stock
- Decrease source
- Increase destination
- Create OUT and IN transactions

## Returns

- Restore stock to correct warehouse
- Create return transaction

---

# 48. Updated Data Integrity Rules

The application must enforce:

1. Warehouse stock cannot become negative.
2. Sale quantity cannot exceed stock at the order warehouse.
3. Every stock-changing operation creates inventory history.
4. Inventory transactions include `warehouseId`.
5. Inventory transactions reference their source business document.
6. Purchases increase stock only in the receiving warehouse.
7. Sales decrease stock only in the order/current warehouse.
8. Transfers decrease source and increase destination.
9. Source and destination warehouses of a transfer cannot be the same.
10. Product + warehouse should have one logical current-stock record.
11. Historical prices remain snapshots.
12. Historical purchase costs remain snapshots.
13. Historical transactions are not silently deleted.
14. Barcode values should be unique among active products.
15. Business order numbers should be unique.
16. Business purchase numbers should be unique.
17. Transfer numbers should be unique.
18. Stock-changing operations should be atomic.
19. Customer information remains an order snapshot.
20. Category relationships should ultimately use category IDs.
21. Master records should be deactivated when history depends on them.
22. Warehouse IDs must be stored on stock-changing business records.
23. UI warehouse selection must not be treated as the only source of historical warehouse information.
24. Company-wide stock is derived from warehouse stock, not independently edited.
25. A sale must never automatically consume another warehouse's stock.

---

# 49. Stock Migration Strategy

The existing application currently has:

```text
products.stockQuantity
```

Before removing its authority, existing quantities must be migrated deliberately.

For each existing product:

```text
Existing products.stockQuantity
          ↓
Choose initial/default warehouse
          ↓
Create warehouse_stock record
          ↓
Verify quantity
          ↓
Application starts reading warehouse_stock
          ↓
Stop using products.stockQuantity as authoritative stock
```

Example:

```text
Existing:
Rose Plant stockQuantity = 25

Migration:
warehouse_stock
warehouseId = WH01
productId = Rose
quantity = 25
```

Do not simply delete `products.stockQuantity` before migration is complete.

---

# 50. Recommended Implementation Order — v1.1

## Completed

- [x] Categories
- [x] Add Category
- [x] Edit Category
- [x] Activate / Deactivate Category
- [x] Delete Category
- [x] Product creation
- [x] Product category selection
- [x] Product listing
- [x] Product details
- [x] Product editing
- [x] Product deletion
- [x] Product availability logic using current legacy stock
- [x] Supplier creation
- [x] Supplier listing
- [x] Supplier editing
- [x] Supplier activate/deactivate
- [x] Supplier deletion
- [x] Supplier selection on product
- [x] Supplier display in All Products
- [x] Supplier dropdown in Edit Product
- [x] Supplier update in Firestore
- [x] Firestore Emulator integration

## Next

### PHASE 3 — Warehouse Master

- Create `warehouses`
- Warehouse service
- Add warehouse UI
- List warehouses
- Edit warehouse
- Activate/deactivate warehouse

### PHASE 4 — Current Warehouse Context

- Warehouse selector
- Current warehouse state
- Prepare future user/default warehouse mapping

### PHASE 5 — Warehouse Stock

- Create `warehouse_stock`
- Migrate current product stock
- Display warehouse-specific quantity
- Calculate company-wide quantity where needed

### PHASE 6 — Purchases

- Purchases
- Purchase items
- Receiving warehouse
- Supplier relationship

### PHASE 7 — Inventory Transactions

- Warehouse-aware inventory ledger
- Purchase stock IN
- Adjustment IN/OUT

### PHASE 8 — Warehouse Transfers

- Stock transfer
- Transfer items
- Atomic source/destination updates

### PHASE 9 — Barcode

- Barcode generation
- Barcode labels
- Product lookup

### PHASE 10 — Billing

- Current warehouse billing
- Barcode scanning
- Cart
- Stock validation

### PHASE 11 — Orders

- Orders
- Order items
- Warehouse snapshot

### PHASE 12 — Stock OUT

- Atomic billing completion
- Warehouse-specific stock deduction
- Inventory transactions

### PHASE 13 — Dashboard / Reports

- Warehouse-specific metrics
- Company-wide metrics
- Charts

### PHASE 14 — Authentication / Roles

- Firebase Authentication
- User warehouse access
- Security rules

### PHASE 15 — Production Deployment

---

# 51. Current Development Status

Current working modules:

```text
CATEGORIES      ✅
PRODUCTS        ✅
SUPPLIERS       ✅
WAREHOUSES      NEXT
WAREHOUSE STOCK PENDING
PURCHASES       PENDING
INVENTORY       PENDING
TRANSFERS       PENDING
BARCODE         PENDING
BILLING         PENDING
ORDERS          PENDING
DASHBOARD       PENDING
AUTH / ROLES    PENDING
```

The current product implementation uses one supplier selection per product.

The next architectural milestone is multi-warehouse support.

---

# 52. Next Development Milestone

The next module is:

```text
WAREHOUSE MASTER
```

Sequence:

```text
WAREHOUSE MASTER
        ↓
CURRENT WAREHOUSE CONTEXT
        ↓
WAREHOUSE STOCK
        ↓
STOCK MIGRATION
        ↓
PURCHASES
        ↓
INVENTORY TRANSACTIONS
        ↓
WAREHOUSE TRANSFERS
        ↓
BARCODE
        ↓
BILLING
        ↓
ORDERS
        ↓
STOCK OUT
        ↓
DASHBOARD / REPORTS
```

---

# 53. Architecture Rule Going Forward

Before implementing a major module:

1. Define the collection.
2. Define document fields.
3. Define relationships.
4. Define warehouse impact.
5. Define stock impact.
6. Define historical data requirements.
7. Define validation.
8. Define atomicity requirements.
9. Implement the service.
10. Implement the UI.
11. Test with Firestore Emulator.
12. Run `npm run build`.
13. Commit the working milestone.

---

# 54. Final Target Architecture

```text
                           CATEGORY
                              │
                              │ 1:N
                              ▼
                           PRODUCT
                              │
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
              BARCODE               WAREHOUSE_STOCK
                                           ▲
                                           │
                                       WAREHOUSE
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
             PURCHASE                    ORDER                  STOCK TRANSFER
                │                          │                          │
                ▼                          ▼                          ▼
         PURCHASE_ITEM                ORDER_ITEM              TRANSFER_ITEM
                │                          │                          │
                └──────────────┬───────────┴──────────────┬───────────┘
                               │                          │
                               ▼                          ▼
                       WAREHOUSE STOCK            INVENTORY HISTORY


SUPPLIER
    │
    │ 1:N
    ▼
PURCHASE
```

Complete business flow:

```text
SUPPLIER
   ↓
PURCHASE
   ↓
WAREHOUSE
   ↓
STOCK IN
   ↓
WAREHOUSE STOCK
   ↓
PRODUCT / BARCODE
   ↓
SCAN
   ↓
BILLING AT CURRENT WAREHOUSE
   ↓
ORDER
   ↓
STOCK OUT FROM THAT WAREHOUSE
   ↓
INVENTORY HISTORY
   ↓
DASHBOARD / REPORTS
```

---

# 55. Key Architectural Decisions

## Decision 1 — Product is global

A product is defined once.

```text
Rose Plant = one Product
```

It is not duplicated for every warehouse.

## Decision 2 — Stock belongs to a warehouse

```text
Product + Warehouse = Current Quantity
```

## Decision 3 — Billing uses current warehouse

A sale reduces stock only from the warehouse associated with the order.

## Decision 4 — Purchases use receiving warehouse

A purchase increases only the selected receiving warehouse.

## Decision 5 — Transfers are explicit

Inventory never silently moves between warehouses.

## Decision 6 — Every stock movement is traceable

Every stock change produces an inventory transaction.

## Decision 7 — Warehouse is persisted on transactions

The warehouse is not merely a UI filter. It becomes part of the historical business record.

## Decision 8 — Current product supplier is not the complete supplier history

The current `supplierId` / `supplier` fields support the existing UI. Purchase history remains the authoritative historical source for supplier-product activity.

---

# 56. References

Firebase documentation:

- Cloud Firestore Data Model
- Structuring Cloud Firestore Data
- Transactions and Batched Writes
- Firestore Security Overview
- Get Started with Firestore Security Rules

Reference URLs:

```text
https://firebase.google.com/docs/firestore/data-model
https://firebase.google.com/docs/firestore/manage-data/structure-data
https://firebase.google.com/docs/firestore/manage-data/transactions
https://firebase.google.com/docs/firestore/security/overview
https://firebase.google.com/docs/firestore/security/get-started
```

---

# 57. Version History

## v1.0 — 2026-09-26

Initial architecture covering:

- Categories
- Products
- Suppliers
- Purchases
- Inventory transactions
- Barcode
- Billing
- Orders
- Dashboard

Stock was modeled primarily through:

```text
products.stockQuantity
```

## v1.1 — 2026-09-27

Added and revised:

- Supplier implementation status
- Current single-supplier product UI
- Multi-warehouse architecture
- `warehouses`
- `warehouse_stock`
- Warehouse-specific product availability
- Current warehouse context
- Warehouse-aware purchases
- Warehouse-aware billing
- Warehouse-aware orders
- Warehouse-aware inventory transactions
- Warehouse stock transfers
- Stock migration strategy
- Warehouse authorization direction
- Updated testing strategy
- Updated data integrity rules
- Updated implementation order

The primary stock architecture changed from:

```text
PRODUCT → stockQuantity
```

to:

```text
PRODUCT
   +
WAREHOUSE
   ↓
WAREHOUSE_STOCK.quantity
```
