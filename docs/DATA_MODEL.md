# Nursery Inventory & Billing System — Data Model v1

**Project:** Nursery Inventory Dashboard  
**Database:** Firebase Cloud Firestore  
**Frontend:** Angular  
**Status:** Design / Blueprint  
**Version:** 1.0  
**Last Updated:** 2026-09-26

---

# 1. Purpose

This document defines the planned data model for the nursery inventory, purchasing, barcode, billing, sales/order, and reporting system.

The purpose is to finalize the database architecture before implementing the remaining application modules.

This document covers:

- Product and category management
- Supplier/dealer management
- Purchasing
- Inventory stock
- Inventory transaction history
- Product barcode management
- Barcode-based billing
- Orders / sales
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

Unlike a traditional SQL database, Firestore does not use tables and rows in the relational sense.

Example:
```text
products
    └── productId
          ├── name
          ├── categoryId
          ├── unitPrice
          ├── stockQuantity
          └── barcode
```

Firestore also supports subcollections and nested objects, but this application will primarily use root-level collections for the main business entities.

Reference:  
[https://firebase.google.com/docs/firestore/data-model](https://firebase.google.com/docs/firestore/data-model)

---

# 3. High-Level Business Architecture

```text
                         ┌──────────────────┐
                         │    CATEGORIES    │
                         └────────┬─────────┘
                                  │
                                  │ 1 : N
                                  ▼
                         ┌──────────────────┐
                         │     PRODUCTS     │
                         │                  │
                         │ barcode          │
                         │ price            │
                         │ current stock    │
                         └───────┬──────────┘
                                 │
               ┌─────────────────┼──────────────────┐
               │                 │                  │
               ▼                 ▼                  ▼
        ┌────────────┐    ┌───────────────┐   ┌───────────┐
        │ PURCHASES  │    │  INVENTORY    │   │  ORDERS   │
        │            │    │ TRANSACTIONS  │   │           │
        └─────┬──────┘    └───────────────┘   └─────┬─────┘
              │                                     │
              ▼                                     ▼
       ┌──────────────┐                     ┌──────────────┐
       │ PURCHASE     │                     │ ORDER ITEMS  │
       │ ITEMS        │                     │              │
       └──────┬───────┘                     └──────┬───────┘
              │                                    │
              └────────────────┬───────────────────┘
                               │
                               ▼
                            PRODUCT
```

---

# 4. Core Collections

The initial application will use these collections:
- `categories`
- `products`
- `suppliers`
- `purchases`
- `purchase_items`
- `orders`
- `order_items`
- `inventory_transactions`

Current collections already implemented:
- `categories`
- `products`

Future collections may include:
- `users`
- `payments`
- `settings`
- `stock_adjustments`
- `product_suppliers`

These are intentionally not required for the first version.

---

# 5. Collection: categories

### Purpose
Stores the categories used to group nursery products.

Examples:
- Plants
- Pots
- Fertilizers
- Seeds
- Garden Tools

### Document path
`categories/{categoryId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Category display name |
| `code` | string | Yes | Short business/category code |
| `isActive` | boolean | Yes | Whether category is active |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

### Example
```json
{
  "name": "Flower Plants",
  "code": "FLOWER",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Relationship
```text
CATEGORY 1 ───────── N PRODUCT
```
One category can contain many products.

---

# 6. Collection: products

### Purpose
The product master contains every product sold or stocked by the nursery.

Examples:
- Rose Plant
- Money Plant
- Ceramic Pot
- Organic Fertilizer
- Garden Tool

### Document path
`products/{productId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Product name |
| `categoryId` | string | Recommended | Category document ID |
| `categoryName` | string | Optional | Category snapshot/display value |
| `description` | string | No | Product description |
| `unitPrice` | number | Yes | Selling price |
| `gst` | number | Yes | GST percentage |
| `standardPackage` | number | No | Package quantity/size |
| `stockQuantity` | number | Yes | Current stock |
| `barcode` | string | Future | Product barcode |
| `image` | string | No | Product image |
| `isActive` | boolean | Yes | Product status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

### Example
```json
{
  "name": "Rose Plant",
  "categoryId": "category_001",
  "categoryName": "Flower Plants",
  "description": "Red rose plant",
  "unitPrice": 250,
  "gst": 18,
  "standardPackage": null,
  "stockQuantity": 25,
  "barcode": "890100000001",
  "image": "",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 7. Category Relationship

The current application stores the category using the category name.

Current:
```javascript
product.category = "Gold Buckets"
```

The target model should use:
```javascript
product.categoryId = "category_document_id"
```

Optionally keep:
```javascript
product.categoryName = "Gold Buckets"
```
as a snapshot/display field.

Preferred model:
```text
PRODUCT
   │
   └── categoryId
           │
           ▼
       CATEGORY
```

### Why categoryId?
If the category name changes:
- Old: `Flower Plants`
- New: `Flowering Plants`

the product relationship remains intact because it points to `categoryId` rather than the category name.

The existing data should be migrated deliberately rather than changed casually.

---

# 8. Product Barcode

### Purpose
Each sellable product should have a barcode.  
The barcode identifies the product during billing.

For v1:
```text
ONE PRODUCT
     ↓
ONE BARCODE
     ↓
MANY PHYSICAL UNITS
```

Example:
- **Product:** Rose Plant
- **Barcode:** `890100000001`
- **Stock:** `100`

When the barcode is scanned:
```text
890100000001
        ↓
Find Product
        ↓
Rose Plant
        ↓
Add to Billing Cart
```

The barcode does not represent an individual physical plant.  
It represents the product type/SKU.

---

# 9. Collection: suppliers

### Purpose
Stores suppliers/dealers who provide products to the nursery.

### Document path
`suppliers/{supplierId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Firestore document ID |
| `name` | string | Yes | Supplier/dealer name |
| `mobile` | string | Recommended | Contact number |
| `email` | string | No | Email |
| `address` | string | No | Address |
| `gstNumber` | string | No | GST number |
| `notes` | string | No | Internal notes |
| `isActive` | boolean | Yes | Supplier status |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last modification timestamp |

### Example
```json
{
  "name": "ABC Nursery Suppliers",
  "mobile": "9876543210",
  "email": "supplier@example.com",
  "address": "Pune, Maharashtra",
  "gstNumber": "",
  "notes": "Primary plant supplier",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 10. Supplier ↔ Product Relationship

A supplier can provide many products.  
A product can be provided by many suppliers.

Therefore the logical relationship is:
```text
SUPPLIER N ───────── N PRODUCT
```

For v1, we will maintain this relationship through purchases.

Example:
```text
Supplier A
   │
   └── Purchase #P001
          ├── Rose Plant
          ├── Money Plant
          └── Ceramic Pot

Supplier B
   │
   └── Purchase #P002
          ├── Rose Plant
          └── Fertilizer
```

This gives us actual historical supplier-product relationships.

Later, if we need supplier-specific catalogs, pricing, or preferred supplier information, we can introduce `product_suppliers`.

---

# 11. Collection: purchases

### Purpose
Represents inventory received from a supplier.  
A completed/received purchase increases stock.

### Document path
`purchases/{purchaseId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Purchase document ID |
| `purchaseNumber` | string | Yes | Human-readable purchase number |
| `supplierId` | string | Yes | Supplier document ID |
| `supplierName` | string | Recommended | Supplier snapshot |
| `purchaseDate` | timestamp | Yes | Purchase/receipt date |
| `status` | string | Yes | Draft / Received / Cancelled |
| `subtotal` | number | Yes | Amount before GST |
| `gstAmount` | number | Yes | GST amount |
| `totalAmount` | number | Yes | Final amount |
| `notes` | string | No | Notes |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

### Example
```json
{
  "purchaseNumber": "PUR-2026-000001",
  "supplierId": "supplier_001",
  "supplierName": "ABC Nursery Suppliers",
  "purchaseDate": "timestamp",
  "status": "Received",
  "subtotal": 10000,
  "gstAmount": 1800,
  "totalAmount": 11800,
  "notes": "",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

# 12. Collection: purchase_items

### Purpose
Contains the individual products included in a purchase.

### Document path
`purchase_items/{purchaseItemId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `purchaseId` | string | Yes | Parent purchase ID |
| `productId` | string | Yes | Product ID |
| `productName` | string | Yes | Product snapshot |
| `quantity` | number | Yes | Quantity received |
| `unitCost` | number | Yes | Supplier cost |
| `gst` | number | Yes | GST percentage |
| `totalCost` | number | Yes | Line total |
| `createdAt` | timestamp | Recommended | Creation timestamp |

### Example
```json
{
  "purchaseId": "purchase_001",
  "productId": "product_001",
  "productName": "Rose Plant",
  "quantity": 50,
  "unitCost": 120,
  "gst": 18,
  "totalCost": 6000,
  "createdAt": "timestamp"
}
```

### Relationships
```text
PURCHASE 1 ───────── N PURCHASE_ITEM
PRODUCT  1 ───────── N PURCHASE_ITEM
```

---

# 13. Collection: orders

### Purpose
Represents a completed or pending customer sale/billing transaction.

### Document path
`orders/{orderId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Order document ID |
| `orderNumber` | string | Yes | Human-readable order number |
| `customerName` | string | No | Customer snapshot |
| `customerMobile` | string | No | Customer snapshot |
| `orderDate` | timestamp | Yes | Sale date/time |
| `status` | string | Yes | Draft / Completed / Cancelled / Returned |
| `subtotal` | number | Yes | Before discount/tax |
| `discountAmount` | number | Yes | Discount |
| `gstAmount` | number | Yes | GST amount |
| `totalAmount` | number | Yes | Final amount |
| `paymentStatus` | string | Future | Paid / Partial / Unpaid |
| `paymentMethod` | string | Future | Cash / UPI / Card etc. |
| `notes` | string | No | Notes |
| `createdAt` | timestamp | Recommended | Creation timestamp |
| `updatedAt` | timestamp | Recommended | Last update |

---

# 14. Customer Data Decision

The business does NOT require a permanent customer-management system.  
Therefore we will NOT create `customers` for v1.

Instead, customer details are stored as a snapshot on the order:
```json
{
  "customerName": "Rahul Sharma",
  "customerMobile": "9876543210"
}
```

This means:
```text
Customer information ──> Order only
```
rather than:
```text
Customer ──> Customer Master ──> Multiple Orders
```

This keeps the application aligned with the current business requirement.

---

# 15. Collection: order_items

### Purpose
Contains the products sold in an order.

### Document path
`order_items/{orderItemId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Document ID |
| `orderId` | string | Yes | Parent order |
| `productId` | string | Yes | Product ID |
| `productName` | string | Yes | Product snapshot |
| `barcode` | string | Yes | Barcode used |
| `quantity` | number | Yes | Quantity sold |
| `unitPrice` | number | Yes | Price at sale |
| `gst` | number | Yes | GST percentage |
| `discountAmount` | number | Yes | Line discount |
| `totalAmount` | number | Yes | Final line amount |
| `createdAt` | timestamp | Recommended | Creation timestamp |

### Example
```json
{
  "orderId": "order_001",
  "productId": "product_001",
  "productName": "Rose Plant",
  "barcode": "890100000001",
  "quantity": 3,
  "unitPrice": 250,
  "gst": 18,
  "discountAmount": 0,
  "totalAmount": 750,
  "createdAt": "timestamp"
}
```

---

# 16. Collection: inventory_transactions

### Purpose
This collection stores the complete history of stock movements.

Possible transaction types:
- `OPENING_STOCK`
- `PURCHASE`
- `SALE`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `RETURN_IN`
- `RETURN_OUT`

### Document path
`inventory_transactions/{transactionId}`

### Schema
| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | System | Transaction ID |
| `productId` | string | Yes | Product affected |
| `productName` | string | Recommended | Product snapshot |
| `transactionType` | string | Yes | Type of movement |
| `quantity` | number | Yes | Quantity moved |
| `direction` | string | Yes | IN / OUT |
| `quantityBefore` | number | Recommended | Stock before |
| `quantityAfter` | number | Recommended | Stock after |
| `referenceType` | string | Yes | PURCHASE / ORDER / ADJUSTMENT |
| `referenceId` | string | Yes | Related document |
| `supplierId` | string | No | Related supplier |
| `orderId` | string | No | Related order |
| `notes` | string | No | Reason |
| `createdAt` | timestamp | Yes | Movement timestamp |
| `createdBy` | string | Future | User ID |

### Purchase example
```json
{
  "productId": "product_001",
  "productName": "Rose Plant",
  "transactionType": "PURCHASE",
  "quantity": 50,
  "direction": "IN",
  "quantityBefore": 25,
  "quantityAfter": 75,
  "referenceType": "PURCHASE",
  "referenceId": "purchase_001",
  "supplierId": "supplier_001",
  "createdAt": "timestamp"
}
```

### Sale example
```json
{
  "productId": "product_001",
  "productName": "Rose Plant",
  "transactionType": "SALE",
  "quantity": 3,
  "direction": "OUT",
  "quantityBefore": 75,
  "quantityAfter": 72,
  "referenceType": "ORDER",
  "referenceId": "order_001",
  "orderId": "order_001",
  "createdAt": "timestamp"
}
```

---

# 17. Stock Management

The product document maintains the current stock:
```javascript
products.stockQuantity
```

The inventory transaction collection maintains the history.

Conceptually:
```text
Current Stock = Opening Stock + Stock IN - Stock OUT ± Adjustments
```

Example:
- Opening stock = 100
- Purchase +50 → Stock = 150
- Sale -10 → Stock = 140
- Adjustment -2 → Stock = 138

Therefore, `products.stockQuantity` is the current fast-access value, while `inventory_transactions` is the historical stock ledger.

---

# 18. Purchase → Stock Flow

When stock is received:
```text
Supplier ──> Purchase ──> Purchase Items ──> Increase Product Stock ──> Inventory Transaction
```

Example:
- Current stock = 20
- Purchase quantity = 50
- New stock = 70

Inventory transaction:
- `type = PURCHASE`
- `direction = IN`
- `quantity = 50`
- `quantityBefore = 20`
- `quantityAfter = 70`

---

# 19. Billing → Stock Flow

When a customer purchases products:
```text
Barcode Scan ──> Find Product ──> Add to Cart ──> Customer Details ──> Complete Billing ──> Create Order ──> Create Order Items ──> Decrease Stock ──> Inventory Transaction
```

Example:
- Current stock = 70
- Customer buys = 3
- New stock = 67

---

# 20. Important Stock Rule

Stock must never become negative.  
Before sale, `requestedQuantity <= stockQuantity` must be true.

Example:
- Stock = 5, Requested = 3 → **Allowed**
- Stock = 5, Requested = 7 → **Rejected**

---

# 21. Atomic Stock Updates

Stock-changing operations should eventually use Firestore transactions when the new stock value depends on the current stock.

Conceptually:
```text
READ product stock ──> VALIDATE quantity ──> UPDATE product stock ──> CREATE inventory transaction ──> COMMIT
```

Firestore transactions provide atomic operations: the writes either all succeed or none are applied. Firestore can also retry a transaction when concurrent changes cause contention.

This is especially important for billing because two billing users could potentially sell the same product at nearly the same time.

---

# 22. Important Distinction

There are two different meanings of "transaction":

1. **Firestore transaction**  
   A technical database operation (`runTransaction(...)`) used to ensure atomicity and consistency.
2. **Inventory transaction**  
   A business record (`PURCHASE`, `SALE`, `ADJUSTMENT`, `RETURN`) stored in `inventory_transactions`.

---

# 23. Billing Cart

The billing cart does not need to be permanently stored in Firestore before checkout.  
It can exist in Angular application state:

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

After checkout:
```text
Cart ──> Order + Order Items + Stock Update + Inventory Transaction
```

This avoids unnecessary temporary database documents.

---

# 24. Barcode → Billing Flow

The final intended flow:

```text
                    PRODUCT
                       │
                       │ barcode
                       ▼
                  PRINTED LABEL
                       │
                       │ scan
                       ▼
                  BARCODE SCANNER
                       │
                       ▼
                  FIND PRODUCT
                       │
                       ▼
                      CART
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
        Customer Name      Customer Mobile
              │                 │
              └────────┬────────┘
                       ▼
                    BILLING
                       │
                       ▼
                     ORDER
                       │
                       ▼
                   STOCK OUT
```

The scanner identifies the product. It should NOT directly change stock.  
Stock changes only when billing is successfully completed.

---

# 25. Order Cancellation

A completed order should not simply be deleted.

Example:
```text
Completed Order ──> Cancel / Return ──> Restore Stock ──> Create Inventory Transaction
```

For example:
- `SALE` (OUT 3)
- then return: `RETURN_IN` (IN 3)

This preserves the history.

---

# 26. Historical Snapshots

Master data can change.

Example:  
Product `Rose Plant` may later become `Premium Red Rose Plant`.

Historical orders should not suddenly display the new name.

Therefore order items store snapshots:
- `productId`
- `productName`
- `barcode`
- `unitPrice`
- `gst`

Similarly, purchase items store:
- `productId`
- `productName`
- `unitCost`
- `gst`

This duplication is intentional.

---

# 27. Relationship Summary

- **Category → Product:** `CATEGORY 1 ───────── N PRODUCT`
- **Supplier → Purchase:** `SUPPLIER 1 ───────── N PURCHASE`
- **Purchase → Purchase Item:** `PURCHASE 1 ───────── N PURCHASE_ITEM`
- **Product → Purchase Item:** `PRODUCT 1 ───────── N PURCHASE_ITEM`
- **Order → Order Item:** `ORDER 1 ─────────── N ORDER_ITEM`
- **Product → Order Item:** `PRODUCT 1 ───────── N ORDER_ITEM`
- **Product → Inventory Transaction:** `PRODUCT 1 ───────── N INVENTORY_TRANSACTION`

### Supplier ↔ Product Logical Relationship
```text
SUPPLIER N ───────── N PRODUCT
```
Maintained in v1 through:
```text
PURCHASE ──> PURCHASE_ITEM ──> PRODUCT
```

---

# 28. Complete ERD

```text
┌─────────────────────┐
│     CATEGORIES      │
├─────────────────────┤
│ categoryId (PK)     │
│ name                │
│ code                │
│ isActive            │
│ createdAt           │
│ updatedAt           │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌────────────────────────────┐
│          PRODUCTS          │
├────────────────────────────┤
│ productId (PK)             │
│ categoryId (FK)            │
│ categoryName (snapshot)    │
│ name                       │
│ barcode                    │
│ unitPrice                  │
│ gst                        │
│ standardPackage            │
│ stockQuantity              │
│ isActive                   │
│ createdAt                  │
│ updatedAt                  │
└─────────┬─────────┬────────┘
          │         │
          │         │
       1:N│         │1:N
          │         │
          ▼         ▼
┌────────────────┐  ┌──────────────────┐
│ PURCHASE_ITEMS │  │   ORDER_ITEMS    │
├────────────────┤  ├──────────────────┤
│ purchaseItemId │  │ orderItemId      │
│ purchaseId     │  │ orderId          │
│ productId      │  │ productId        │
│ productName    │  │ productName      │
│ quantity       │  │ barcode          │
│ unitCost       │  │ quantity         │
│ gst            │  │ unitPrice        │
│ totalCost      │  │ gst              │
└───────┬────────┘  │ totalAmount      │
        │           └────────┬─────────┘
        │                    │
        │ N:1                │ N:1
        ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│    PURCHASES     │  │      ORDERS      │
├──────────────────┤  ├──────────────────┤
│ purchaseId       │  │ orderId          │
│ purchaseNumber   │  │ orderNumber      │
│ supplierId       │  │ customerName     │
│ supplierName     │  │ customerMobile   │
│ purchaseDate     │  │ orderDate        │
│ status           │  │ status           │
│ subtotal         │  │ subtotal         │
│ gstAmount        │  │ discountAmount   │
│ totalAmount      │  │ gstAmount        │
└────────┬─────────┘  │ totalAmount      │
         │            └──────────────────┘
         │ N:1
         ▼
┌─────────────────────┐
│      SUPPLIERS      │
├─────────────────────┤
│ supplierId (PK)     │
│ name                │
│ mobile              │
│ email               │
│ address             │
│ gstNumber           │
│ notes               │
│ isActive            │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘


PRODUCTS
    │
    │ 1:N
    ▼
┌────────────────────────────────┐
│     INVENTORY_TRANSACTIONS     │
├────────────────────────────────┤
│ transactionId (PK)             │
│ productId (FK)                 │
│ productName                    │
│ transactionType                │
│ quantity                       │
│ direction                      │
│ quantityBefore                 │
│ quantityAfter                  │
│ referenceType                  │
│ referenceId                    │
│ supplierId                     │
│ orderId                        │
│ notes                          │
│ createdAt                      │
│ createdBy                      │
└────────────────────────────────┘
```

---

# 29. Overall Business Flow

```text
                    ┌─────────────┐
                    │  SUPPLIER   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PURCHASE   │
                    └──────┬──────┘
                           │
                           ▼
                     ┌───────────┐
                     │ STOCK IN  │
                     └─────┬─────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   PRODUCT   │
                    │    STOCK    │
                    └──────┬──────┘
                           │
                           ▼
                      ┌─────────┐
                      │ BARCODE │
                      └────┬────┘
                           │
                         SCAN
                           │
                           ▼
                     ┌───────────┐
                     │  BILLING  │
                     └─────┬─────┘
                           │
                           ▼
                      ┌─────────┐
                      │  ORDER  │
                      └────┬────┘
                           │
                           ▼
                     ┌───────────┐
                     │ STOCK OUT │
                     └─────┬─────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ INVENTORY TRANSACTION│
                └──────────┬───────────┘
                           │
                           ▼
                     ┌───────────┐
                     │ DASHBOARD │
                     └───────────┘
```

---

# 30. Dashboard Data

The dashboard can eventually display:
- Total Products
- Active Products
- Inactive Products
- Total Stock Units
- Low Stock Products
- Out of Stock Products
- Today's Orders
- Today's Sales
- Inventory Value

**Charts:**
- **Bar Chart:** Stock by Category
- **Pie Chart:** Product/Stock Distribution
- **Line Chart:** Sales Over Time

The charts should eventually use real Firestore data rather than hardcoded demo values.

---

# 31. Product Availability

The current application uses:
`product.isActive` + `category.isActive` + `stockQuantity > 0`

Therefore:
```text
Product Active AND Category Active AND Stock > 0 ──> AVAILABLE
Otherwise ──> UNAVAILABLE
```

The UI can distinguish:
- Out of Stock
- Product Inactive
- Category Inactive

---

# 32. Product Status vs Inventory Status

These must remain separate.

- **Product status (`isActive`):** Controls whether the product is active.
- **Inventory status (Derived from `stockQuantity`):**
  - `stockQuantity > 0` → In Stock
  - `stockQuantity = 0` → Out of Stock

Therefore, `Active + Out of Stock` is a valid state.

---

# 33. Naming Standards

### Collections
Use plural lowercase `snake_case`:
- `categories`
- `products`
- `suppliers`
- `purchases`
- `purchase_items`
- `orders`
- `order_items`
- `inventory_transactions`

### Fields
Use `camelCase`:
- `productId`
- `supplierId`
- `purchaseDate`
- `stockQuantity`
- `createdAt`
- `updatedAt`

### IDs
Use Firestore document IDs for internal relationships (`productId`, `supplierId`, `purchaseId`, `orderId`).  
Human-readable numbers should be separate (`purchaseNumber`, `orderNumber`).

---

# 34. Business Number Format

- **Purchase:** `PUR-2026-000001`
- **Order:** `ORD-2026-000001`

These are business-facing numbers. They should not replace Firestore document IDs.

---

# 35. Deletion Strategy

- **Master records (`categories`, `products`, `suppliers`):** Should generally use `isActive = false` instead of physical deletion when historical records depend on them.
- **Transactional records (`orders`, `purchases`, `inventory_transactions`):** Should generally not be physically deleted after completion. Use `Cancelled`, `Returned`, or `Reversed` status instead.

---

# 36. Security

Production Firestore must eventually use Firebase Authentication and Firestore Security Rules for authorization and data validation.

Potential roles:
- Admin
- Manager
- Billing Staff
- Inventory Staff

Possible permissions:
- **Admin:** Everything
- **Manager:** Products, Suppliers, Purchases, Inventory, Reports
- **Billing Staff:** Billing, Orders, Product lookup
- **Inventory Staff:** Products, Suppliers, Purchases, Stock

---

# 37. Firestore Emulator

Development currently uses the Firestore Emulator:

```text
Angular Application ──> Firestore Emulator (localhost:8080)
```

All database features should first be tested against the emulator before introducing Production Firestore.

---

# 38. Testing Strategy

- **Products:** Create, Edit, Delete, Activate, Deactivate, Stock = 0, Stock > 0
- **Suppliers:** Create, Edit, Activate, Deactivate
- **Purchases:** Create purchase, Add multiple products, Increase stock, Create inventory transaction
- **Billing:** Scan barcode, Find product, Add to cart, Change quantity, Validate stock, Complete order, Decrease stock, Create inventory transaction
- **Returns:** Cancel completed order, Restore stock, Create return transaction

---

# 39. Data Integrity Rules

The application should enforce:
1. Stock cannot become negative.
2. Sale quantity cannot exceed available stock.
3. Every stock-changing operation creates an inventory transaction.
4. Inventory transactions reference their source document.
5. Historical order prices do not change when product prices change.
6. Historical purchase costs do not change when supplier pricing changes.
7. Historical transactions should not be silently deleted.
8. Product barcode values should be unique among active products.
9. Business order numbers should be unique.
10. Business purchase numbers should be unique.
11. Stock-changing operations should be atomic.
12. Customer information remains an order snapshot.
13. Category relationships should use category IDs rather than names.
14. Master records should be deactivated rather than deleted when historical data depends on them.

---

# 40. Recommended Implementation Order

- **PHASE 1:** Categories, Products, Status, Basic Stock
- **PHASE 2:** Suppliers
- **PHASE 3:** Purchases, Purchase Items
- **PHASE 4:** Inventory Transactions
- **PHASE 5:** Stock IN, Stock Adjustments
- **PHASE 6:** Barcode Generation, Barcode Labels
- **PHASE 7:** Billing Cart, Barcode Scanning
- **PHASE 8:** Orders, Order Items
- **PHASE 9:** Stock OUT
- **PHASE 10:** Dashboard, Reports, Charts
- **PHASE 11:** Authentication, Roles, Security Rules
- **PHASE 12:** Production Deployment

---

# 41. Current Development Status

Already implemented:
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
- [x] Product availability logic
- [x] Stock quantity
- [x] Firestore Emulator integration

**Git checkpoint:**
- **Branch:** `feature/login`
- **Commit:** `9c5b9af`
- **Message:** Complete product and category management

---

# 42. Next Development Milestone

The next module is: **SUPPLIERS**

Sequence:
```text
SUPPLIERS ──> PURCHASES ──> INVENTORY TRANSACTIONS ──> STOCK IN ──> BARCODE ──> BILLING ──> ORDERS ──> STOCK OUT ──> DASHBOARD
```

---

# 43. Architecture Rule Going Forward

Before implementing a major module:
1. Define the collection.
2. Define document fields.
3. Define relationships.
4. Define stock impact.
5. Define historical data requirements.
6. Define validation.
7. Implement the service.
8. Implement the UI.
9. Test with Firestore Emulator.
10. Run `npm run build`.
11. Commit the working milestone.

---

# 44. Final Target Architecture

```text
                         CATEGORY
                            │
                            │ 1:N
                            ▼
                         PRODUCT
                            │
              ┌─────────────┼──────────────┐
              │             │              │
              ▼             ▼              ▼
          BARCODE       PURCHASE        ORDER
                            │              │
                            ▼              ▼
                     PURCHASE_ITEM     ORDER_ITEM
                            │              │
                            └──────┬───────┘
                                   │
                                   ▼
                         INVENTORY TRANSACTIONS

SUPPLIER
    │
    │ 1:N
    ▼
PURCHASE
```

### Complete Business Flow:
```text
SUPPLIER ──> PURCHASE ──> STOCK IN ──> PRODUCT STOCK ──> BARCODE ──> SCAN ──> BILLING ──> ORDER ──> STOCK OUT ──> INVENTORY HISTORY ──> DASHBOARD / REPORTS
```

---

# 45. References

Firebase documentation:
- [Cloud Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Structuring Cloud Firestore Data](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore Security Overview](https://firebase.google.com/docs/firestore/security/overview)
- [Get Started with Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)