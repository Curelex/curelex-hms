import connectDb from "../config/db.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Customer from "../models/Customer.js";
import Supplier from "../models/Supplier.js";
import Purchase from "../models/Purchase.js";
import Sale from "../models/Sale.js";
import StockMovement from "../models/StockMovement.js";
import AuditLog from "../models/AuditLog.js";
import Counter from "../models/Counter.js";
import { ROLES, STAFF_PERMISSIONS } from "../utils/permissions.js";
import { createSale, finalizeSale } from "../services/saleService.js";
import { changeStock } from "../services/inventoryService.js";

const TOTAL = 25;

const categories = ["Grocery", "FMCG", "Beverage", "Household", "Snacks"];
const paymentMethods = ["Cash", "UPI", "Card", "Credit"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedUsers = async () => {
  const users = [];

  users.push(
    await User.create({
      fullName: "Admin User",
      email: "admin@test.com",
      password: "password123",
      role: ROLES.ADMIN,
      permissions: []
    })
  );

  for (let i = 1; i < TOTAL; i += 1) {
    users.push(
      await User.create({
        fullName: `Staff User ${i}`,
        email: `staff${i}@test.com`,
        password: "password123",
        role: ROLES.STAFF,
        permissions: STAFF_PERMISSIONS.SALES_BILLING
      })
    );
  }

  return users;
};

const seedProductsAndInventory = async (adminId) => {
  const products = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    const costPrice = rand(80, 1000);
    const price = costPrice + rand(20, 250);

    const product = await Product.create({
      name: `Product ${i}`,
      category: categories[(i - 1) % categories.length],
      price,
      costPrice,
      sku: `SKU${String(i).padStart(4, "0")}`,
      description: `Seeded product ${i}`,
      gstRate: [5, 12, 18][(i - 1) % 3],
      lowStockThreshold: rand(5, 15)
    });

    await Inventory.create({
      product: product._id,
      quantity: rand(120, 220),
      updatedBy: adminId
    });

    products.push(product);
  }

  return products;
};

const seedCustomers = async () => {
  const customers = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    customers.push(
      await Customer.create({
        name: `Customer ${i}`,
        phone: `900000${String(i).padStart(4, "0")}`,
        email: `customer${i}@test.com`,
        address: `Address block ${i}`,
        creditLimit: 50000,
        outstandingAmount: 0
      })
    );
  }

  return customers;
};

const seedSuppliers = async () => {
  const suppliers = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    suppliers.push(
      await Supplier.create({
        name: `Supplier ${i}`,
        phone: `800000${String(i).padStart(4, "0")}`,
        email: `supplier${i}@test.com`,
        address: `Supplier lane ${i}`,
        paymentTrackingEnabled: i % 2 === 0
      })
    );
  }

  return suppliers;
};

const seedPurchases = async ({ adminId, products, suppliers }) => {
  for (let i = 0; i < TOTAL; i += 1) {
    const product = products[i % products.length];
    const quantity = rand(20, 60);
    const unitCost = product.costPrice;

    const purchase = await Purchase.create({
      supplier: suppliers[i % suppliers.length]._id,
      items: [
        {
          product: product._id,
          quantity,
          unitCost,
          lineTotal: quantity * unitCost
        }
      ],
      totalAmount: quantity * unitCost,
      notes: `Seed purchase ${i + 1}`,
      createdBy: adminId
    });

    await changeStock({
      productId: product._id,
      quantityChange: quantity,
      movementType: "purchase",
      reason: "Seed purchase",
      referenceModel: "Purchase",
      referenceId: purchase._id,
      userId: adminId
    });
  }
};

const seedSales = async ({ adminId, products, customers }) => {
  for (let i = 0; i < TOTAL; i += 1) {
    const p1 = products[i % products.length];
    const p2 = products[(i + 7) % products.length];

    const sale = await createSale({
      customerId: customers[i % customers.length]._id,
      items: [
        { productId: p1._id, quantity: rand(1, 4) },
        { productId: p2._id, quantity: rand(1, 3) }
      ],
      discountAmount: rand(0, 120),
      paymentMethod: paymentMethods[i % paymentMethods.length],
      userId: adminId
    });

    await finalizeSale({
      saleId: sale._id,
      userId: adminId
    });
  }
};

const seedAdjustments = async ({ adminId, products }) => {
  for (let i = 0; i < TOTAL; i += 1) {
    const product = products[(i * 3) % products.length];
    const adjustment = i % 4 === 0 ? -2 : 3;

    await changeStock({
      productId: product._id,
      quantityChange: adjustment,
      movementType: "adjustment",
      reason: "Seed adjustment",
      referenceModel: "Inventory",
      referenceId: product._id,
      userId: adminId
    });
  }
};

const seedAuditLogs = async ({ adminId }) => {
  const logs = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    logs.push({
      action: "seed.simulation",
      entityType: "SeedBatch",
      metadata: { step: i, message: `Generated simulation event ${i}` },
      actor: adminId
    });
  }

  await AuditLog.insertMany(logs);
};

const clearCollections = async () => {
  await Promise.all([
    Sale.deleteMany({}),
    Purchase.deleteMany({}),
    StockMovement.deleteMany({}),
    Inventory.deleteMany({}),
    Product.deleteMany({}),
    Customer.deleteMany({}),
    Supplier.deleteMany({}),
    AuditLog.deleteMany({}),
    Counter.deleteMany({}),
    User.deleteMany({})
  ]);
};

const printSummary = async () => {
  const [users, products, inventory, customers, suppliers, purchases, sales, stockMovements, auditLogs] =
    await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
      Inventory.countDocuments({}),
      Customer.countDocuments({}),
      Supplier.countDocuments({}),
      Purchase.countDocuments({}),
      Sale.countDocuments({}),
      StockMovement.countDocuments({}),
      AuditLog.countDocuments({})
    ]);

  
 
};

const run = async () => {
  await connectDb();

  try {
    await clearCollections();

    const users = await seedUsers();
    const admin = users[0];
    const products = await seedProductsAndInventory(admin._id);
    const customers = await seedCustomers();
    const suppliers = await seedSuppliers();

    await seedPurchases({ adminId: admin._id, products, suppliers });
    await seedSales({ adminId: admin._id, products, customers });
    await seedAdjustments({ adminId: admin._id, products });
    await seedAuditLogs({ adminId: admin._id });

    await printSummary();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

run();
