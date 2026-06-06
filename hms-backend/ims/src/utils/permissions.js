export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff"
};

export const STAFF_PERMISSIONS = {
  SALES_BILLING: [
    "products.read",
    "products.write",
    "sales.create",
    "sales.read",
    "sales.invoice",
    "customers.read",
    "customers.write",
    "suppliers.read",
    "suppliers.write",
    "purchases.read",
    "purchases.write",
    "inventory.adjust"   // ← add this
  ]
};