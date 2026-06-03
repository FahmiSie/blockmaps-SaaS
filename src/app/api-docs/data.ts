export interface Parameter {
  name: string;
  in: 'query' | 'body' | 'path';
  required: boolean;
  type: string;
  description?: string;
  schema?: string;
}

export interface ResponseSpec {
  code: number | string;
  description: string;
  schema?: string;
}

export interface Endpoint {
  id: string;
  module: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description?: string;
  security?: 'Public' | 'protectedProcedure' | 'companyProcedure' | 'operatorProcedure' | 'managerProcedure' | 'adminProcedure';
  parameters?: Parameter[];
  responses: ResponseSpec[];
}

export const endpoints: Endpoint[] = [
  // ── REST API ──
  {
    id: "rest-health",
    module: "REST API",
    method: "GET",
    path: "/api/health",
    summary: "Health Check",
    description: "Verifies application server status and database connectivity.",
    security: "Public",
    responses: [
      {
        code: 200,
        description: "Connected successfully",
        schema: `{
  "status": "ok",
  "timestamp": "2026-06-03T02:20:27Z",
  "database": "connected"
}`
      },
      {
        code: 503,
        description: "Database connection failed",
        schema: `{
  "status": "error",
  "timestamp": "2026-06-03T02:20:27Z",
  "database": "disconnected",
  "error": "Error details..."
}`
      }
    ]
  },
  {
    id: "rest-midtrans-webhook",
    module: "REST API",
    method: "POST",
    path: "/api/midtrans/notification",
    summary: "Midtrans Payment Webhook",
    description: "Receives transaction notification from Midtrans to activate company subscriptions.",
    security: "Public",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Midtrans notification payload",
        schema: `{
  "order_id": "string",
  "status_code": "string",
  "gross_amount": "string",
  "signature_key": "string",
  "transaction_status": "string",
  "payment_type": "string"
}`
      }
    ],
    responses: [
      {
        code: 200,
        description: "Success",
        schema: `{"ok": true}`
      },
      {
        code: 403,
        description: "Invalid signature"
      },
      {
        code: 404,
        description: "Transaction not found"
      }
    ]
  },

  // ── USER MODULE ──
  {
    id: "user-me",
    module: "User Module",
    method: "GET",
    path: "user.me",
    summary: "Get current authenticated user",
    description: "Fetches information about the currently logged in user, including their role and company details.",
    security: "protectedProcedure",
    responses: [
      {
        code: "200 OK",
        description: "Success",
        schema: `{
  "result": {
    "data": {
      "id": "cuid_string",
      "name": "User Name",
      "email": "user@example.com",
      "image": "https://avatar-url.jpg",
      "role": "ADMIN",
      "createdAt": "2026-06-03T02:20:00Z",
      "companyId": "company_cuid",
      "company": {
        "id": "company_cuid",
        "name": "Company Name",
        "slug": "company-slug",
        "logoUrl": "logo_url"
      }
    }
  }
}`
      }
    ]
  },
  {
    id: "user-list",
    module: "User Module",
    method: "GET",
    path: "user.list",
    summary: "List users in company",
    description: "Lists all users belonging to the company of the logged in user.",
    security: "managerProcedure",
    parameters: [
      { name: "page", in: "query", required: false, type: "number", description: "Default: 1" },
      { name: "limit", in: "query", required: false, type: "number", description: "Default: 20 (max 100)" },
      { name: "search", in: "query", required: false, type: "string", description: "Filter by name or email" },
      { name: "role", in: "query", required: false, type: "enum", description: "Filter by role: ADMIN, MANAGER, OPERATOR" }
    ],
    responses: [
      {
        code: "200 OK",
        description: "Success",
        schema: `{
  "result": {
    "data": {
      "users": [
        {
          "id": "cuid",
          "name": "Name",
          "email": "email",
          "image": "url",
          "role": "OPERATOR",
          "createdAt": "date"
        }
      ],
      "total": 12,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}`
      }
    ]
  },
  {
    id: "user-getById",
    module: "User Module",
    method: "GET",
    path: "user.getById",
    summary: "Get user by ID",
    description: "Gets detailed user details by their ID.",
    security: "adminProcedure",
    parameters: [
      { name: "id", in: "query", required: true, type: "string (cuid)", description: "User ID" }
    ],
    responses: [
      { code: "200 OK", description: "Success" },
      { code: "404 Not Found", description: "User not found" }
    ]
  },
  {
    id: "user-updateRole",
    module: "User Module",
    method: "POST",
    path: "user.updateRole",
    summary: "Update user role",
    description: "Updates a user's role. Admins only can promote/demote to/from ADMIN.",
    security: "managerProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Role update details",
        schema: `{
  "id": "string (cuid)",
  "role": "ADMIN | MANAGER | OPERATOR"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Role updated" },
      { code: "400 Bad Request", description: "Cannot change your own role" },
      { code: "403 Forbidden", description: "Insufficient privileges" }
    ]
  },
  {
    id: "user-updateProfile",
    module: "User Module",
    method: "POST",
    path: "user.updateProfile",
    summary: "Update profile name",
    description: "Allows users to update their profile name.",
    security: "protectedProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Profile updates",
        schema: `{
  "name": "string (1-100 chars, optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Profile updated" }
    ]
  },
  {
    id: "user-updateAvatar",
    module: "User Module",
    method: "POST",
    path: "user.updateAvatar",
    summary: "Update avatar image",
    description: "Uploads base64 image representation and updates current user's profile image url using Cloudinary.",
    security: "protectedProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Base64 payload",
        schema: `{
  "base64": "string"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Avatar updated" }
    ]
  },
  {
    id: "user-removeAvatar",
    module: "User Module",
    method: "POST",
    path: "user.removeAvatar",
    summary: "Remove avatar image",
    description: "Deletes avatar image from database and Cloudinary assets.",
    security: "protectedProcedure",
    responses: [
      { code: "200 OK", description: "Avatar removed" }
    ]
  },
  {
    id: "user-changePassword",
    module: "User Module",
    method: "POST",
    path: "user.changePassword",
    summary: "Change password",
    description: "Updates credentials login password.",
    security: "protectedProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Password details",
        schema: `{
  "currentPassword": "string",
  "newPassword": "string"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success", schema: `{"result": {"data": {"success": true}}}` },
      { code: "400 Bad Request", description: "Google account / new password matches old password" },
      { code: "401 Unauthorized", description: "Current password incorrect" }
    ]
  },
  {
    id: "user-remove",
    module: "User Module",
    method: "POST",
    path: "user.remove",
    summary: "Remove user from company",
    description: "Removes user from the current company.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "User details",
        schema: `{
  "id": "string (cuid)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "User detached" },
      { code: "400 Bad Request", description: "Cannot remove yourself" }
    ]
  },
  {
    id: "user-invite",
    module: "User Module",
    method: "POST",
    path: "user.invite",
    summary: "Invite user to company",
    description: "Invites user via email. If user does not exist, pre-creates a user record.",
    security: "managerProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        description: "Invitation details",
        schema: `{
  "email": "string",
  "role": "MANAGER | OPERATOR (default: OPERATOR)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "User invited" },
      { code: "409 Conflict", description: "User belongs to another company" }
    ]
  },
  {
    id: "user-stats",
    module: "User Module",
    method: "GET",
    path: "user.stats",
    summary: "Get user stats",
    description: "Gets totals and grouped role counts for company members.",
    security: "companyProcedure",
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },

  // ── COMPANY MODULE ──
  {
    id: "company-getCurrent",
    module: "Company Module",
    method: "GET",
    path: "company.getCurrent",
    summary: "Get current company",
    description: "Fetches current company properties and counter fields.",
    security: "companyProcedure",
    responses: [
      { code: "200 OK", description: "Success" },
      { code: "404 Not Found", description: "Company not found" }
    ]
  },
  {
    id: "company-create",
    module: "Company Module",
    method: "POST",
    path: "company.create",
    summary: "Create company",
    description: "Registers a company and elevates user role to ADMIN.",
    security: "protectedProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "name": "string",
  "slug": "string"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Company created" },
      { code: "409 Conflict", description: "User already belongs to company or slug is taken" }
    ]
  },
  {
    id: "company-update",
    module: "Company Module",
    method: "POST",
    path: "company.update",
    summary: "Update company details",
    description: "Updates company name or slug.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "name": "string (optional)",
  "slug": "string (optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Updated successfully" },
      { code: "409 Conflict", description: "Slug already taken" }
    ]
  },
  {
    id: "company-deleteCompany",
    module: "Company Module",
    method: "POST",
    path: "company.deleteCompany",
    summary: "Soft delete company",
    description: "Sets company status to 'Delete'.",
    security: "adminProcedure",
    responses: [
      { code: "200 OK", description: "Soft deleted" }
    ]
  },
  {
    id: "company-dashboardSummary",
    module: "Company Module",
    method: "GET",
    path: "company.dashboardSummary",
    summary: "Get dashboard metrics",
    description: "Aggregates counts of users, active zones, items, and categorized delivery requests.",
    security: "companyProcedure",
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "company-updateLogo",
    module: "Company Module",
    method: "POST",
    path: "company.updateLogo",
    summary: "Update company logo",
    description: "Uploads company logo image via base64.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "base64": "string"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Logo updated" }
    ]
  },
  {
    id: "company-removeLogo",
    module: "Company Module",
    method: "POST",
    path: "company.removeLogo",
    summary: "Remove company logo",
    description: "Clears company logo field.",
    security: "adminProcedure",
    responses: [
      { code: "200 OK", description: "Logo removed" }
    ]
  },

  // ── ZONE MODULE ──
  {
    id: "zone-list",
    module: "Zone Module",
    method: "GET",
    path: "zone.list",
    summary: "List zones",
    description: "Retrieves lists of company zones.",
    security: "companyProcedure",
    parameters: [
      { name: "includeInactive", in: "query", required: false, type: "boolean", description: "Default: false" },
      { name: "type", in: "query", required: false, type: "enum", description: "RAW_MATERIAL | PRODUCTION | FINISHED_GOODS | STORAGE" }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "zone-floorPlan",
    module: "Zone Module",
    method: "GET",
    path: "zone.floorPlan",
    summary: "Get floor plan and inventory",
    description: "Retrieves active company zones and lists items in inventory.",
    security: "companyProcedure",
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "zone-getById",
    module: "Zone Module",
    method: "GET",
    path: "zone.getById",
    summary: "Get zone details",
    description: "Details of a zone and nested inventory logs.",
    security: "companyProcedure",
    parameters: [
      { name: "id", in: "query", required: true, type: "string", description: "Zone CUID" }
    ],
    responses: [
      { code: "200 OK", description: "Success" },
      { code: "404 Not Found", description: "Zone not found" }
    ]
  },
  {
    id: "zone-create",
    module: "Zone Module",
    method: "POST",
    path: "zone.create",
    summary: "Create zone",
    description: "Creates layout coordinates for a warehouse zone.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "name": "string",
  "type": "RAW_MATERIAL | PRODUCTION | FINISHED_GOODS | STORAGE",
  "positionX": "number",
  "positionY": "number",
  "width": "number",
  "height": "number"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "zone-update",
    module: "Zone Module",
    method: "POST",
    path: "zone.update",
    summary: "Update zone config",
    description: "Updates properties or locations of a zone.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "id": "string (cuid)",
  "name": "string (optional)",
  "type": "string (optional)",
  "isActive": "boolean (optional)",
  "positionX": "number (optional)",
  "positionY": "number (optional)",
  "width": "number (optional)",
  "height": "number (optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "zone-bulkUpdatePositions",
    module: "Zone Module",
    method: "POST",
    path: "zone.bulkUpdatePositions",
    summary: "Save zones positions",
    description: "Saves drag and drop dimensions configuration in batch.",
    security: "companyProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "array",
        schema: `[
  {
    "id": "cuid",
    "positionX": "number",
    "positionY": "number",
    "width": "number",
    "height": "number"
  }
]`
      }
    ],
    responses: [
      { code: "200 OK", description: "Positions saved", schema: `{"result": {"data": {"updated": 5}}}` },
      { code: "403 Forbidden", description: "Zones ownership validation failed" }
    ]
  },
  {
    id: "zone-deactivate",
    module: "Zone Module",
    method: "POST",
    path: "zone.deactivate",
    summary: "Deactivate zone",
    description: "Sets isActive = false. Will fail if active delivery requests use this zone.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{"id": "string"}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Deactivated" },
      { code: "400 Bad Request", description: "Active deliveries block deactivation" }
    ]
  },
  {
    id: "zone-delete",
    module: "Zone Module",
    method: "POST",
    path: "zone.delete",
    summary: "Delete zone",
    description: "Removes zone from databases.",
    security: "adminProcedure",
    parameters: [
      { name: "body", in: "body", required: true, type: "object", schema: `{"id": "string"}` }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },

  // ── ITEM MODULE ──
  {
    id: "item-list",
    module: "Item Module",
    method: "GET",
    path: "item.list",
    summary: "List company items",
    description: "Fetches list of registered items and aggregates quantities across all company zones.",
    security: "companyProcedure",
    parameters: [
      { name: "page", in: "query", required: false, type: "number" },
      { name: "limit", in: "query", required: false, type: "number" },
      { name: "search", in: "query", required: false, type: "string", description: "Filter by name or sku" }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "item-create",
    module: "Item Module",
    method: "POST",
    path: "item.create",
    summary: "Create item",
    description: "Registers a product SKU item into database.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "name": "string",
  "sku": "string",
  "unit": "string"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Item created" },
      { code: "409 Conflict", description: "SKU already registered" }
    ]
  },
  {
    id: "item-update",
    module: "Item Module",
    method: "POST",
    path: "item.update",
    summary: "Update item properties",
    description: "Modifies item description or SKU name.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "id": "cuid",
  "name": "string (optional)",
  "sku": "string (optional)",
  "unit": "string (optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success" },
      { code: "409 Conflict", description: "New SKU already taken" }
    ]
  },

  // ── INVENTORY MODULE ──
  {
    id: "inventory-upsert",
    module: "Inventory Module",
    method: "POST",
    path: "inventory.upsert",
    summary: "Set manual stock level",
    description: "Sets or overrides item quantity levels directly in a zone.",
    security: "managerProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "zoneId": "string",
  "itemId": "string",
  "quantity": "number"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success" }
    ]
  },
  {
    id: "inventory-transferStock",
    module: "Inventory Module",
    method: "POST",
    path: "inventory.transferStock",
    summary: "Direct stock transfer",
    description: "Directly moves items between warehouse zones (instant mutation).",
    security: "managerProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "itemId": "string",
  "fromZoneId": "string",
  "toZoneId": "string",
  "quantity": "number",
  "notes": "string (optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Success" },
      { code: "400 Bad Request", description: "Invalid zones, or stock levels insufficient" }
    ]
  },

  // ── PAYMENT MODULE ──
  {
    id: "payment-createTransaction",
    module: "Payment Module",
    method: "POST",
    path: "payment.createTransaction",
    summary: "Initiate subscription payment",
    description: "Registers order with Midtrans Snap API and generates checkout transaction tokens.",
    security: "adminProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "amount": "number",
  "description": "string (optional)"
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Token created", schema: `{"result": {"data": {"snapToken": "...", "orderId": "..."}}}` },
      { code: "409 Conflict", description: "Active pending transaction already exists" }
    ]
  },

  // ── DELIVERY MODULE ──
  {
    id: "delivery-create",
    module: "Delivery Module",
    method: "POST",
    path: "delivery.create",
    summary: "Request delivery (Formal flow)",
    description: "Creates formal stock movements that need approval, validation, and manual step verification.",
    security: "operatorProcedure",
    parameters: [
      {
        name: "body",
        in: "body",
        required: true,
        type: "object",
        schema: `{
  "fromZoneId": "string",
  "toZoneId": "string",
  "notes": "string (optional)",
  "items": [
    { "itemId": "string", "quantity": "number" }
  ]
}`
      }
    ],
    responses: [
      { code: "200 OK", description: "Request submitted" },
      { code: "412 Precondition Failed", description: "Stock level checks failed in source zone" }
    ]
  },
  {
    id: "delivery-approve",
    module: "Delivery Module",
    method: "POST",
    path: "delivery.approve",
    summary: "Approve delivery",
    security: "managerProcedure",
    parameters: [
      { name: "body", in: "body", required: true, type: "object", schema: `{"id": "string"}` }
    ],
    responses: [
      { code: "200 OK", description: "Approved" }
    ]
  },
  {
    id: "delivery-complete",
    module: "Delivery Module",
    method: "POST",
    path: "delivery.complete",
    summary: "Mark delivery completed",
    description: "Finalizes stock movements and executes atomic database updates on inventory tables.",
    security: "operatorProcedure",
    parameters: [
      { name: "body", in: "body", required: true, type: "object", schema: `{"id": "string"}` }
    ],
    responses: [
      { code: "200 OK", description: "Stocks updated" }
    ]
  }
];
