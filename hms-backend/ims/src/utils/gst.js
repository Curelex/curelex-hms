const round2 = (value) => Number((value || 0).toFixed(2));

const calculateLine = ({ quantity, unitPrice, gstRate }) => {
  const qty = Number(quantity || 0);
  const price = Number(unitPrice || 0);
  const rate = Number(gstRate || 0);

  const lineAmount = round2(qty * price);
  const lineTax = round2((lineAmount * rate) / 100);
  const lineTotal = round2(lineAmount + lineTax);

  return { lineAmount, lineTax, lineTotal, gstRate: rate };
};

const calculateTotals = ({ items, discountAmount = 0 }) => {
  const subtotal = round2(items.reduce((sum, item) => sum + Number(item.lineAmount || 0), 0));
  const totalTax = round2(items.reduce((sum, item) => sum + Number(item.lineTax || 0), 0));
  const grossTotal = round2(subtotal + totalTax);
  const totalDiscount = round2(discountAmount);
  const finalAmount = round2(Math.max(grossTotal - totalDiscount, 0));

  return { subtotal, totalTax, grossTotal, totalDiscount, finalAmount };
};

export {
  calculateLine,
  calculateTotals
};
