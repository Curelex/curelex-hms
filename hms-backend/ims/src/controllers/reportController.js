import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { asyncHandler } from "../utils/asyncHandler.js";

const getDateRange = (period) => {
  const now = new Date();
  if (period === "daily") {
    const from = new Date(now); from.setHours(0,0,0,0);
    const to   = new Date(now); to.setHours(23,59,59,999);
    return { fromDate: from, toDate: to };
  }
  if (period === "weekly") {
    const from = new Date(now); from.setDate(now.getDate()-6); from.setHours(0,0,0,0);
    const to   = new Date(now); to.setHours(23,59,59,999);
    return { fromDate: from, toDate: to };
  }
  if (period === "monthly") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
    const to   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    return { fromDate: from, toDate: to };
  }
  if (period === "yearly") {
    const from = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
    const to   = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
    return { fromDate: from, toDate: to };
  }
  const from = new Date(now); from.setHours(0,0,0,0);
  const to   = new Date(now); to.setHours(23,59,59,999);
  return { fromDate: from, toDate: to };
};

// ← ADDED clinicId parameter to computeSummary
const computeSummary = async (period, clinicId) => {
  const { fromDate, toDate } = getDateRange(period);
  const sales = await Sale.find({
    clinicId, // ← ADDED
    status: "finalized",
    createdAt: { $gte: fromDate, $lte: toDate },
  });

  const totalSales    = sales.reduce((s, sale) => s + Number(sale.finalAmount    || 0), 0);
  const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discountAmount || 0), 0);

  let profitOrLoss = 0;
  for (const sale of sales) {
    const revenue = Number(sale.finalAmount || 0);
    let cost = 0;
    for (const item of sale.items) {
      const product = await Product.findById(item.product).select("costPrice").lean();
      cost += (product ? Number(product.costPrice || 0) : 0) * Number(item.quantity);
    }
    profitOrLoss += revenue - cost;
  }

  return {
    period, fromDate, toDate,
    totalSales:    Number(totalSales.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    profitOrLoss:  Number(profitOrLoss.toFixed(2)),
  };
};

export const dashboardSummary = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const summary = await computeSummary(req.query.period || "daily", clinicId); // ← ADDED
  res.json(summary);
});

export const stockReport = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const clinicProducts = await Product.find({ clinicId }, "_id").lean(); // ← ADDED
  const productIds = clinicProducts.map((p) => p._id);

  const inventory = await Inventory.find({ product: { $in: productIds } }) // ← ADDED
    .populate("product", "name sku lowStockThreshold");

  const report = inventory.map((entry) => ({
    productName: entry.product?.name,
    sku:         entry.product?.sku,
    quantity:    entry.quantity,
    status:
      entry.quantity === 0 ? "out_of_stock"
      : entry.quantity <= entry.product.lowStockThreshold ? "low_stock"
      : "available",
  }));
  res.json({ data: report });
});

export const movementReport = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const sales = await Sale.find({ clinicId, status: "finalized" }); // ← ADDED
  const movementMap = new Map();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const prev = movementMap.get(String(item.product)) || { quantity: 0, revenue: 0, name: item.name, sku: item.sku };
      prev.quantity += Number(item.quantity);
      prev.revenue  += Number(item.lineTotal);
      movementMap.set(String(item.product), prev);
    });
  });
  const movement = [...movementMap.values()].sort((a, b) => b.quantity - a.quantity);
  res.json({ fastMoving: movement.slice(0, 10), slowMoving: movement.slice(-10).reverse() });
});

export const exportSalesCsv = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId; // ← ADDED
  const sales = await Sale.find({ clinicId, status: "finalized" }).populate("customer", "name"); // ← ADDED
  const rows = sales.map((sale) => ({
    invoiceNo: sale.invoiceNo, customer: sale.customer?.name || "Walk-in",
    paymentMethod: sale.paymentMethod, subtotal: sale.subtotal,
    totalTax: sale.totalTax, discountAmount: sale.discountAmount,
    finalAmount: sale.finalAmount, createdAt: sale.createdAt,
  }));
  const parser = new Parser();
  const csv = parser.parse(rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=sales-report.csv");
  res.send(csv);
});

// PDF helpers (unchanged)
const TEAL="#0d9488",BLACK="#0f172a",GRAY="#64748b",WHITE="#ffffff",ROW_A="#f0fdfa",ROW_B="#ffffff";
const L=50,R=545,W=R-L,ROW_H=20,HDR_H=22;
const fmt=(n)=>`Rs. ${Number(n||0).toFixed(2)}`;
const drawSectionHeader=(doc,text)=>{const y=doc.y+12;doc.rect(L,y,W,HDR_H).fill(TEAL);doc.fontSize(11).font("Helvetica-Bold").fillColor(WHITE).text(text,L+8,y+5,{width:W-16,lineBreak:false});doc.y=y+HDR_H+4;};
const drawTableHeader=(doc,headers,colX,colW)=>{const y=doc.y;doc.rect(L,y,W,HDR_H).fill("#ccfbf1");headers.forEach((h,i)=>{doc.fontSize(8).font("Helvetica-Bold").fillColor(TEAL).text(h,colX[i],y+6,{width:colW[i],lineBreak:false});});doc.y=y+HDR_H;};
const drawRow=(doc,values,colX,colW,idx,colorFn)=>{if(doc.y+ROW_H>780){doc.addPage();doc.y=50;}const rowY=doc.y;doc.rect(L,rowY,W,ROW_H).fill(idx%2===0?ROW_A:ROW_B);values.forEach((val,i)=>{const color=colorFn?colorFn(i,val):BLACK;doc.fontSize(8).font(color!==BLACK?"Helvetica-Bold":"Helvetica").fillColor(color).text(String(val??"—"),colX[i],rowY+5,{width:colW[i],lineBreak:false});});doc.y=rowY+ROW_H;};

export const downloadReportPdf = asyncHandler(async (req, res) => {
  const period = req.query.period || "daily";
  const clinicId = req.user.clinicId; // ← ADDED
  const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
  const generatedAt = new Date().toLocaleString("en-IN");
  const { fromDate, toDate } = getDateRange(period);

  const rangeLabel = (() => {
    const opts = { day: "2-digit", month: "short", year: "numeric" };
    const f = fromDate.toLocaleDateString("en-IN", opts);
    const t = toDate.toLocaleDateString("en-IN", opts);
    return period === "daily" ? f : `${f} — ${t}`;
  })();

  // ← ADDED clinicId to all queries
  const clinicProducts = await Product.find({ clinicId }, "_id").lean();
  const productIds = clinicProducts.map((p) => p._id);

  const [summary, inventory] = await Promise.all([
    computeSummary(period, clinicId), // ← ADDED
    Inventory.find({ product: { $in: productIds } }).populate("product", "name sku lowStockThreshold"), // ← ADDED
  ]);

  const sales = await Sale.find({
    clinicId, status: "finalized", // ← ADDED
    createdAt: { $gte: fromDate, $lte: toDate },
  }).populate("customer", "name").sort({ createdAt: -1 });

  const stockRows = inventory.map((entry) => ({
    name: entry.product?.name || "—", sku: entry.product?.sku || "—",
    quantity: entry.quantity,
    status: entry.quantity === 0 ? "Out of stock" : entry.quantity <= (entry.product?.lowStockThreshold||5) ? "Low stock" : "Available",
  }));

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=report-${period}-${new Date().toISOString().slice(0,10)}.pdf`);
  doc.pipe(res);

  doc.fontSize(22).font("Helvetica-Bold").fillColor(BLACK).text("RETAIL IMS — REPORT", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor(GRAY).text(`Period: ${periodLabel}  (${rangeLabel})   |   Generated: ${generatedAt}`, { align: "center" });
  doc.moveDown(0.6);
  doc.moveTo(L,doc.y).lineTo(R,doc.y).lineWidth(1).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.8);

  doc.fontSize(12).font("Helvetica-Bold").fillColor(BLACK).text("Summary");
  doc.moveDown(0.5);

  const boxes=[{label:"TOTAL SALES",value:fmt(summary.totalSales),profit:null},{label:"TOTAL DISCOUNTS",value:fmt(summary.totalDiscount),profit:null},{label:"PROFIT / LOSS",value:fmt(summary.profitOrLoss),profit:summary.profitOrLoss}];
  const boxW=155,boxH=58,boxGap=12,boxY=doc.y;
  boxes.forEach(({label,value,profit},i)=>{const bx=L+i*(boxW+boxGap);doc.rect(bx,boxY,boxW,boxH).fillAndStroke("#f0fdfa",TEAL);doc.fontSize(8).font("Helvetica-Bold").fillColor(TEAL).text(label,bx+10,boxY+10,{width:boxW-20,lineBreak:false});const vc=(profit!==null&&profit<0)?"#dc2626":BLACK;doc.fontSize(15).font("Helvetica-Bold").fillColor(vc).text(value,bx+10,boxY+28,{width:boxW-20,lineBreak:false});});
  doc.y=boxY+boxH+20;

  drawSectionHeader(doc,`Sales — ${periodLabel} (${rangeLabel})`);
  if(sales.length===0){doc.fontSize(9).font("Helvetica").fillColor(GRAY).text("No finalized sales in this period.",L,doc.y+4);doc.moveDown(1);}
  else{const sColX=[L,150,260,340,420,480],sColW=[100,105,75,75,55,65],sHdrs=["Invoice","Customer","Payment","Discount","Total","Date"];drawTableHeader(doc,sHdrs,sColX,sColW);sales.forEach((sale,idx)=>{drawRow(doc,[sale.invoiceNo,sale.customer?.name||"Walk-in",sale.paymentMethod,fmt(sale.discountAmount),fmt(sale.finalAmount),new Date(sale.createdAt).toLocaleDateString("en-IN")],sColX,sColW,idx,null);});}

  doc.moveDown(1);
  drawSectionHeader(doc,"Current Stock Report");
  const stColX=[L,200,300,400],stColW=[145,95,95,95];
  drawTableHeader(doc,["Product","SKU","Quantity","Status"],stColX,stColW);
  stockRows.forEach((row,idx)=>{const sc=row.status==="Out of stock"?"#dc2626":row.status==="Low stock"?"#d97706":"#059669";drawRow(doc,[row.name,row.sku,String(row.quantity),row.status],stColX,stColW,idx,(ci)=>ci===3?sc:BLACK);});

  doc.moveDown(1.5);
  doc.moveTo(L,doc.y).lineTo(R,doc.y).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.4);
  doc.fontSize(8).font("Helvetica").fillColor("#94a3b8").text("Generated by Retail IMS",{align:"center"});
  doc.end();
});