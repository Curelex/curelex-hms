import env from "../config/env.js";

const buildInvoiceNumber = (year, seq) => {
  const padded = String(seq).padStart(env.invoiceDigits, "0");
  return `${env.invoicePrefix}-${year}-${padded}`;
};

export { buildInvoiceNumber };
