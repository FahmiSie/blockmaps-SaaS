# Blockmaps SaaS API Specification (Swagger Style)

This document describes the API specifications for the Blockmaps SaaS application. It covers Next.js REST API routes and the tRPC JSON-RPC endpoints.

---

## 🔐 Authentication & Authorization Headers

All secured routes (REST webhooks and tRPC procedures) expect authentication:
- **Cookies:** NextAuth session cookie (`next-auth.session-token`)
- **Headers:** `Authorization: Bearer <token>` (if applicable)

---

## 📌 REST API Endpoints

### `GET /api/health`
* **Summary:** Health check endpoint
* **Description:** Verifies application server and database connectivity status.
* **Responses:**
  * **`200 OK`**
    * *Description:* Database connected successfully.
    * *Content-Type:* `application/json`
    * *Schema:*
      ```json
      {
        "status": "ok",
        "timestamp": "string (date-time)",
        "database": "connected"
      }
      ```
  * **`503 Service Unavailable`**
    * *Description:* Database connection failed.
    * *Content-Type:* `application/json`
    * *Schema:*
      ```json
      {
        "status": "error",
        "timestamp": "string (date-time)",
        "database": "disconnected",
        "error": "string"
      }
      ```

---

### `POST /api/midtrans/notification`
* **Summary:** Midtrans payment notification webhook
* **Description:** Receives transaction notifications from Midtrans and updates company status to Active on successful payment.
* **Request Body:**
  * *Content-Type:* `application/json`
  * *Required:* true
  * *Schema:*
    ```json
    {
      "order_id": "string (pattern: ORDER-<companyId>-<timestamp>)",
      "status_code": "string",
      "gross_amount": "string (decimal number)",
      "signature_key": "string (SHA-512 hex hash)",
      "transaction_status": "string (e.g. pending, settlement, capture, expire, cancel)",
      "payment_type": "string (optional)"
    }
    ```
* **Responses:**
  * **`200 OK`**
    * *Description:* Webhook payload verified and transaction updated successfully.
    * *Content-Type:* `application/json`
    * *Schema:*
      ```json
      {
        "ok": true
      }
      ```
  * **`403 Forbidden`**
    * *Description:* Invalid signature key.
  * **`404 Not Found`**
    * *Description:* Transaction not found in database.
  * **`500 Internal Server Error`**
    * *Description:* Internal database failure or missing environment configuration.

---

## ⚡ tRPC API Endpoints

tRPC requests are structured as:
* **Queries (GET):** `GET /api/trpc/<router>.<procedure>?input=<url_encoded_json>`
* **Mutations (POST):** `POST /api/trpc/<router>.<procedure>` with JSON body: `{"json": <payload>}`

In case of error, tRPC endpoints return a `200 OK` (or standard HTTP error status depending on config) containing:
```json
{
  "error": {
    "json": {
      "message": "string",
      "code": -32603,
      "data": {
        "code": "BAD_REQUEST", // NOT_FOUND, FORBIDDEN, CONFLICT, etc.
        "httpStatus": 400
      }
    }
  }
}
```

---

### 👤 User Module (`user`)

#### `GET /api/trpc/user.me`
* **Summary:** Get current authenticated user
* **Security:** `protectedProcedure`
* **Responses:**
  * **`200 OK`**
    * *Schema:*
      ```json
      {
        "result": {
          "data": {
            "id": "string (cuid)",
            "name": "string (nullable)",
            "email": "string",
            "image": "string (url, nullable)",
            "role": "string (enum: ADMIN, MANAGER, OPERATOR)",
            "createdAt": "string (date-time)",
            "companyId": "string (cuid, nullable)",
            "company": {
              "id": "string (cuid)",
              "name": "string",
              "slug": "string",
              "logoUrl": "string (url, nullable)"
            }
          }
        }
      }
      ```
  * **`404 Not Found`**
    * *Description:* Current session user does not exist in DB.

#### `GET /api/trpc/user.list`
* **Summary:** List users in current company
* **Security:** `managerProcedure` (Manager/Admin only)
* **Query Parameters:**
  * `page` (integer, default: 1, min: 1)
  * `limit` (integer, default: 20, min: 1, max: 100)
  * `search` (string, optional)
  * `role` (string, enum: ADMIN, MANAGER, OPERATOR, optional)
* **Responses:**
  * **`200 OK`**
    * *Schema:*
      ```json
      {
        "result": {
          "data": {
            "users": [
              {
                "id": "string (cuid)",
                "name": "string (nullable)",
                "email": "string",
                "image": "string (url, nullable)",
                "role": "string (enum: ADMIN, MANAGER, OPERATOR)",
                "createdAt": "string (date-time)"
              }
            ],
            "total": 12,
            "page": 1,
            "limit": 20,
            "totalPages": 1
          }
        }
      }
      ```

#### `GET /api/trpc/user.getById`
* **Summary:** Get user details by ID
* **Security:** `adminProcedure` (Admin only)
* **Query Parameters:**
  * `id` (string, required, cuid)
* **Responses:**
  * **`200 OK`**
  * **`404 Not Found`**

#### `POST /api/trpc/user.updateRole`
* **Summary:** Update user role within the company
* **Security:** `managerProcedure` (Manager/Admin only, non-Admins cannot set role to ADMIN or modify ADMIN users)
* **Request Body:**
  ```json
  {
    "id": "string (cuid)",
    "role": "string (enum: ADMIN, MANAGER, OPERATOR)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (e.g. attempting to change own role)
  * **`403 Forbidden`** (privilege escalations/restrictions)
  * **`404 Not Found`**

#### `POST /api/trpc/user.updateProfile`
* **Summary:** Update current user's profile info
* **Security:** `protectedProcedure`
* **Request Body:**
  ```json
  {
    "name": "string (min: 1, max: 100, optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/user.updateAvatar`
* **Summary:** Upload & update user avatar
* **Security:** `protectedProcedure`
* **Request Body:**
  ```json
  {
    "base64": "string (base64 encoded image string)"
  }
  ```
* **Responses:**
  * **`200 OK`**
    * *Schema:*
      ```json
      {
        "result": {
          "data": {
            "id": "string",
            "name": "string",
            "image": "string (cloudinary url)"
          }
        }
      }
      ```

#### `POST /api/trpc/user.removeAvatar`
* **Summary:** Remove user avatar
* **Security:** `protectedProcedure`
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/user.changePassword`
* **Summary:** Update password
* **Security:** `protectedProcedure`
* **Request Body:**
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string (min length: 8)"
  }
  ```
* **Responses:**
  * **`200 OK`**
    * *Schema:* `{ "result": { "data": { "success": true } } }`
  * **`400 Bad Request`** (e.g. Google OAuth account, new password same as current)
  * **`401 Unauthorized`** (current password incorrect)

#### `POST /api/trpc/user.remove`
* **Summary:** Remove user from company
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (removing self)
  * **`404 Not Found`**

#### `POST /api/trpc/user.invite`
* **Summary:** Invite or pre-create a user into company
* **Security:** `managerProcedure`
* **Request Body:**
  ```json
  {
    "email": "string (email format)",
    "role": "string (enum: MANAGER, OPERATOR, default: OPERATOR)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`409 Conflict`** (User already belongs to another company)

#### `GET /api/trpc/user.stats`
* **Summary:** Get user counts by roles in company
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

---

### 🏢 Company Module (`company`)

#### `GET /api/trpc/company.getCurrent`
* **Summary:** Get current company details
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/company.create`
* **Summary:** Create a new company
* **Security:** `protectedProcedure`
* **Request Body:**
  ```json
  {
    "name": "string (min: 2, max: 100)",
    "slug": "string (min: 2, max: 50, lowercase alphanumeric & hyphens)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`409 Conflict`** (Already belongs to active company / Slug taken)

#### `POST /api/trpc/company.update`
* **Summary:** Update company name or slug
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "slug": "string (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`409 Conflict`** (Slug already taken)

#### `POST /api/trpc/company.deleteCompany`
* **Summary:** Soft delete company
* **Security:** `adminProcedure`
* **Responses:**
  * **`200 OK`** (Sets status to "Delete")

#### `GET /api/trpc/company.dashboardSummary`
* **Summary:** Get dashboard metrics summary
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/company.updateLogo`
* **Summary:** Update logo image
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "base64": "string"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/company.removeLogo`
* **Summary:** Remove logo
* **Security:** `adminProcedure`
* **Responses:**
  * **`200 OK`**

---

### 🗺️ Zone Module (`zone`)

#### `GET /api/trpc/zone.list`
* **Summary:** List company zones
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `includeInactive` (boolean, default: false)
  * `type` (string, enum: RAW_MATERIAL, PRODUCTION, FINISHED_GOODS, STORAGE, optional)
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/zone.floorPlan`
* **Summary:** Get zones layout floorplan with nested inventory
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/zone.getById`
* **Summary:** Get zone details with inventory list
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `id` (string, required)
* **Responses:**
  * **`200 OK`**
  * **`404 Not Found`**

#### `POST /api/trpc/zone.create`
* **Summary:** Create a new zone
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "name": "string",
    "type": "string (enum: RAW_MATERIAL, PRODUCTION, FINISHED_GOODS, STORAGE)",
    "positionX": "number",
    "positionY": "number",
    "width": "number (positive)",
    "height": "number (positive)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/zone.update`
* **Summary:** Update zone info or position
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)",
    "name": "string (optional)",
    "type": "string (optional)",
    "isActive": "boolean (optional)",
    "positionX": "number (optional)",
    "positionY": "number (optional)",
    "width": "number (optional)",
    "height": "number (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`404 Not Found`**

#### `POST /api/trpc/zone.bulkUpdatePositions`
* **Summary:** Drag and drop coordinates batch update
* **Security:** `companyProcedure`
* **Request Body:**
  ```json
  [
    {
      "id": "string (cuid)",
      "positionX": "number",
      "positionY": "number",
      "width": "number",
      "height": "number"
    }
  ]
  ```
* **Responses:**
  * **`200 OK`**
    * *Schema:* `{ "result": { "data": { "updated": "number" } } }`
  * **`403 Forbidden`** (ownership check failure)

#### `POST /api/trpc/zone.deactivate`
* **Summary:** Deactivate a zone
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (Active delivery requests prevent deactivation)
  * **`404 Not Found`**

#### `POST /api/trpc/zone.delete`
* **Summary:** Permanent delete zone
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/zone.stats`
* **Summary:** Zone group count statistics
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

---

### 📦 Item Module (`item`)

#### `GET /api/trpc/item.list`
* **Summary:** Get paginated items with quantities
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `page` (integer, default: 1)
  * `limit` (integer, default: 20)
  * `search` (string, optional)
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/item.getById`
* **Summary:** Get item detail
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `id` (string, required)
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/item.create`
* **Summary:** Create item
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "name": "string",
    "sku": "string",
    "unit": "string"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`409 Conflict`** (SKU already exists)

#### `POST /api/trpc/item.update`
* **Summary:** Update item
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)",
    "name": "string (optional)",
    "sku": "string (optional)",
    "unit": "string (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`409 Conflict`** (New SKU already exists)

#### `POST /api/trpc/item.delete`
* **Summary:** Delete item
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**

---

### 🗃️ Inventory Module (`inventory`)

#### `GET /api/trpc/inventory.byZone`
* **Summary:** Get stocks in zone
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `zoneId` (string, required)
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/inventory.byItem`
* **Summary:** Get item stock distribution in zones
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `itemId` (string, required)
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/inventory.upsert`
* **Summary:** Set item quantity manually in a zone
* **Security:** `managerProcedure`
* **Request Body:**
  ```json
  {
    "zoneId": "string (cuid)",
    "itemId": "string (cuid)",
    "quantity": "number (min: 0)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/inventory.transferStock`
* **Summary:** Direct stock transfer from zone A to zone B
* **Security:** `managerProcedure`
* **Request Body:**
  ```json
  {
    "itemId": "string (cuid)",
    "fromZoneId": "string (cuid)",
    "toZoneId": "string (cuid)",
    "quantity": "number (positive)",
    "notes": "string (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (Same zones, or insufficient stock)

#### `GET /api/trpc/inventory.overview`
* **Summary:** Company total stock overview per item
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/inventory.stockOverview`
* **Summary:** Company total stock overview per zone
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**

---

### 💳 Payment Module (`payment`)

#### `POST /api/trpc/payment.createTransaction`
* **Summary:** Create Midtrans Snap token transaction
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "amount": "number (min: 1000)",
    "description": "string (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**
    * *Schema:*
      ```json
      {
        "result": {
          "data": {
            "snapToken": "string",
            "orderId": "string",
            "transactionId": "string"
          }
        }
      }
      ```
  * **`409 Conflict`** (There is already a pending transaction)

#### `GET /api/trpc/payment.getPendingTransactions`
* **Summary:** Fetch pending transactions with live validation
* **Description:** Automatically syncs pending transactions against Midtrans Core API status before returning.
* **Security:** `adminProcedure`
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/payment.getTransactionHistory`
* **Summary:** Get transaction history (max 50)
* **Security:** `adminProcedure`
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/payment.updateTransactionStatus`
* **Summary:** Sync status right after Snap frontend callback
* **Security:** `protectedProcedure`
* **Request Body:**
  ```json
  {
    "orderId": "string"
  }
  ```
* **Responses:**
  * **`200 OK`**
    * *Schema:* `{ "result": { "data": { "ok": true, "status": "string" } } }`
  * **`403 Forbidden`** (company ownership check failed)
  * **`500 Internal Server Error`** (Midtrans contact failed)

#### `POST /api/trpc/payment.refreshSnapToken`
* **Summary:** Re-generate token for pending order
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "transactionId": "string"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/payment.deleteTransaction`
* **Summary:** Delete a pending transaction
* **Security:** `adminProcedure`
* **Request Body:**
  ```json
  {
    "transactionId": "string"
  }
  ```
* **Responses:**
  * **`200 OK`**

---

### 🚚 Delivery Module (`delivery`)

#### `GET /api/trpc/delivery.list`
* **Summary:** List delivery requests
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `page` (integer, default: 1)
  * `limit` (integer, default: 20)
  * `status` (string, enum: PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, optional)
  * `fromZoneId` (string, optional)
  * `toZoneId` (string, optional)
  * `requestedById` (string, optional)
  * `search` (string, optional)
* **Responses:**
  * **`200 OK`**

#### `GET /api/trpc/delivery.getById`
* **Summary:** Get delivery details
* **Security:** `companyProcedure`
* **Query Parameters:**
  * `id` (string, required)
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/delivery.create`
* **Summary:** Create delivery request (Formal flow)
* **Security:** `operatorProcedure`
* **Request Body:**
  ```json
  {
    "fromZoneId": "string (cuid)",
    "toZoneId": "string (cuid)",
    "notes": "string (max: 500, optional)",
    "items": [
      {
        "itemId": "string (cuid)",
        "quantity": "number (positive)"
      }
    ]
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (Same zones, or items do not belong to company)
  * **`412 Precondition Failed`** (Insufficient stock in source zone)

#### `POST /api/trpc/delivery.approve`
* **Summary:** Approve pending delivery
* **Security:** `managerProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (Cannot approve non-PENDING requests)

#### `POST /api/trpc/delivery.reject`
* **Summary:** Reject pending/approved delivery
* **Security:** `managerProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)",
    "notes": "string (optional)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/delivery.start`
* **Summary:** Transition approved request to IN_PROGRESS
* **Security:** `operatorProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/delivery.complete`
* **Summary:** Mark request as COMPLETED (performs DB stock mutations)
* **Description:** Deducts quantities from the source zone and adds them to the target zone in a single database transaction.
* **Security:** `operatorProcedure`
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**

#### `POST /api/trpc/delivery.cancel`
* **Summary:** Cancel a PENDING delivery request
* **Security:** `operatorProcedure` (Creator of the request, or Manager/Admin can cancel)
* **Request Body:**
  ```json
  {
    "id": "string (cuid)"
  }
  ```
* **Responses:**
  * **`200 OK`**
  * **`400 Bad Request`** (Cannot cancel non-PENDING requests)
  * **`403 Forbidden`** (User is not the requester or Manager/Admin)

#### `GET /api/trpc/delivery.stats`
* **Summary:** Delivery request statistics & history log
* **Security:** `companyProcedure`
* **Responses:**
  * **`200 OK`**
