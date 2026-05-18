// hms-react/src/utils/BillPDF.js
// ─────────────────────────────────────────────────────────────────────────────
// Pure browser PDF — no npm package needed.
// Usage: import { generateBillPDF } from '../utils/BillPDF';
//        generateBillPDF(billObject);   ← opens print dialog in new tab
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY = {
  name:     'Curelex Healthcare Private Limited',
  address:  '123, Medical Hub, Health Nagar, Punjab – 160001',
  phone:    '+91 98765 43210',
  email:    'billing@curelexhealthcare.com',
  gstin:    'GSTIN: 03AABCC1234D1Z5',
  tagline:  'Compassionate Care · Trusted Healthcare',
};

// ── Formatters ───────────────────────────────────────────────────
const fmt = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Category badge colours ────────────────────────────────────────
const catStyle = (cat) => {
  const map = {
    Medicine:     'background:#dbeafe;color:#1e40af',
    Lab:          'background:#ede9fe;color:#6d28d9',
    Procedure:    'background:#d1fae5;color:#065f46',
    Consultation: 'background:#fef3c7;color:#92400e',
    Other:        'background:#f1f5f9;color:#475569',
  };
  return map[cat] || map.Other;
};

// ── Two-column info row ───────────────────────────────────────────
const infoRow = (label, value) => `
  <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12px">
    <span style="color:#64748b">${label}</span>
    <span style="font-weight:600;color:#1e293b;text-align:right;max-width:58%">${value || '—'}</span>
  </div>`;

// ── Payment status colours ────────────────────────────────────────
const statusStyle = (s) => {
  const map = {
    Paid:      'background:#dcfce7;color:#166534',
    Partial:   'background:#fef9c3;color:#854d0e',
    Pending:   'background:#dbeafe;color:#1e40af',
    Cancelled: 'background:#fee2e2;color:#991b1b',
  };
  return map[s] || map.Pending;
};

// ─────────────────────────────────────────────────────────────────
export function generateBillPDF(bill) {
  const patient     = bill.patient     || {};
  const patientName = patient.name     || '—';
  const patientId   = patient.patientId || '—';
  const phone       = patient.phone    || '—';
  const gender      = patient.gender   || '—';
  const age         = patient.age != null ? `${patient.age} yrs` : '—';
  const bloodGroup  = patient.bloodGroup || '—';

  // ── Totals ────────────────────────────────────────────────────
  const itemsSubtotal = (bill.items || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
  const roomRent      = Number(bill.roomRent  || 0);
  const discount      = Number(bill.discount  || 0);
  const taxPct        = Number(bill.tax       || 0);
  const subtotal      = itemsSubtotal + roomRent;
  const taxAmt        = subtotal * taxPct / 100;
  const totalAmt      = subtotal - discount + taxAmt;
  const paidAmt       = Number(bill.paidAmount || 0);
  const balanceDue    = totalAmt - paidAmt;

  const ss = statusStyle(bill.paymentStatus);

  // ── Item rows ─────────────────────────────────────────────────
  const itemRows = (bill.items || []).length === 0
    ? `<tr><td colspan="6" style="padding:16px;text-align:center;color:#94a3b8">No items</td></tr>`
    : (bill.items || []).map((item, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#64748b">${i + 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:500">${item.description || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">
            <span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700;${catStyle(item.category)}">
              ${item.category || 'Other'}
            </span>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${item.quantity || 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(item.unitPrice)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${fmt(item.total)}</td>
        </tr>`).join('');

  // ── Room rent section (only if admitted) ─────────────────────
  const roomSection = bill.daysAdmitted > 0 ? `
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:18px">
      <div style="font-size:11px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">
        🏥 Room / Bed Rent
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${roomCell('Room Type',      bill.roomType || 'General Ward')}
        ${roomCell('Admission',      fmtDate(bill.admissionDate))}
        ${roomCell('Discharge',      fmtDate(bill.dischargeDate))}
        ${roomCell('Days × Rate',    `${bill.daysAdmitted}d × ${fmt(bill.roomRatePerDay)} = ${fmt(roomRent)}`)}
      </div>
    </div>` : '';

  // ── Full HTML ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${bill.billId || ''} · Curelex Healthcare</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff}
    @page{size:A4;margin:12mm 10mm}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .no-print{display:none!important}
    }
    .wrap{max-width:780px;margin:0 auto;padding:20px}
  </style>
</head>
<body>
<div class="wrap">

  <!-- Print button -->
  <div class="no-print" style="text-align:center;margin-bottom:18px">
    <button onclick="window.print()"
      style="padding:10px 32px;background:#0f4c81;color:#fff;border:none;border-radius:8px;
             font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.3px">
      🖨&nbsp; Save as PDF / Print
    </button>
  </div>

  <!-- ── HEADER ──────────────────────────────────────────────── -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
              padding-bottom:16px;border-bottom:3px solid #0f4c81;margin-bottom:20px">

    <div style="display:flex;align-items:center;gap:14px">
      <div style="width:58px;height:58px;border-radius:50%;
                  background:linear-gradient(135deg,#0f4c81,#38bdf8);
                  display:flex;align-items:center;justify-content:center;
                  color:#fff;font-size:26px;font-weight:900;flex-shrink:0">C</div>
      <div>
        <div style="font-size:17px;font-weight:800;color:#0f4c81;line-height:1.2">${COMPANY.name}</div>
        <div style="font-size:11px;color:#64748b;font-style:italic;margin-top:2px">${COMPANY.tagline}</div>
        <div style="font-size:11px;color:#475569;margin-top:6px;line-height:1.7">
          📍 ${COMPANY.address}<br/>
          📞 ${COMPANY.phone} &nbsp;|&nbsp; ✉ ${COMPANY.email}<br/>
          ${COMPANY.gstin}
        </div>
      </div>
    </div>

    <div style="text-align:right">
      <div style="font-size:24px;font-weight:900;color:#0f4c81;letter-spacing:1px">INVOICE</div>
      <div style="font-size:15px;font-weight:700;color:#334155;margin-top:4px">${bill.billId || '—'}</div>
      <div style="font-size:12px;color:#64748b;margin-top:3px">Date: ${fmtDate(bill.createdAt)}</div>
      <div style="margin-top:8px">
        <span style="padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;${ss}">
          ${bill.paymentStatus || 'Pending'}
        </span>
      </div>
    </div>
  </div>

  <!-- ── PATIENT + PAYMENT INFO ──────────────────────────────── -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px">
      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;
                  letter-spacing:.8px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">
        👤 Patient Information
      </div>
      ${infoRow('Name',           patientName)}
      ${infoRow('Patient ID',     patientId)}
      ${infoRow('Age / Gender',   `${age} / ${gender}`)}
      ${infoRow('Phone',          phone)}
      ${infoRow('Blood Group',    bloodGroup)}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px">
      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;
                  letter-spacing:.8px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">
        💳 Payment Details
      </div>
      ${infoRow('Bill ID',        bill.billId || '—')}
      ${infoRow('Bill Date',      fmtDate(bill.createdAt))}
      ${infoRow('Payment Method', bill.paymentMethod || '—')}
      ${infoRow('Payment Status', `<span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;${ss}">${bill.paymentStatus || '—'}</span>`)}
      ${bill.generatedBy?.name ? infoRow('Generated By', bill.generatedBy.name) : ''}
    </div>
  </div>

  <!-- ── ROOM RENT ────────────────────────────────────────────── -->
  ${roomSection}

  <!-- ── BILL ITEMS ────────────────────────────────────────────── -->
  <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;
              letter-spacing:.8px;margin-bottom:8px">Bill Items</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead>
      <tr style="background:#0f4c81">
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:left;width:36px">#</th>
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:left">Description</th>
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:left;width:110px">Category</th>
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:center;width:55px">Qty</th>
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:right;width:110px">Unit Price</th>
        <th style="padding:10px;color:#fff;font-size:11px;font-weight:700;text-align:right;width:110px">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- ── TOTALS ───────────────────────────────────────────────── -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
    <div style="width:290px">
      ${totalRow('Items Subtotal',               fmt(itemsSubtotal))}
      ${roomRent  > 0 ? totalRow('Room Rent',    fmt(roomRent))    : ''}
      ${discount  > 0 ? totalRow('Discount',     `<span style="color:#16a34a">− ${fmt(discount)}</span>`) : ''}
      ${taxPct    > 0 ? totalRow(`Tax (${taxPct}%)`, fmt(taxAmt)) : ''}

      <!-- Grand total -->
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;
                  font-size:16px;font-weight:800;color:#0f4c81;
                  border-top:2px solid #0f4c81;margin-top:6px">
        <span>Total Amount</span><span>${fmt(totalAmt)}</span>
      </div>

      ${paidAmt > 0 ? totalRow('Amount Paid', `<span style="color:#16a34a">${fmt(paidAmt)}</span>`) : ''}

      <!-- Balance due -->
      <div style="display:flex;justify-content:space-between;
                  padding:8px 12px;margin-top:8px;border-radius:6px;font-weight:700;font-size:13px;
                  ${balanceDue > 0 ? 'background:#fee2e2;color:#991b1b' : 'background:#dcfce7;color:#166534'}">
        <span>${balanceDue > 0 ? 'Balance Due' : '✓ Fully Paid'}</span>
        <span>${balanceDue > 0 ? fmt(balanceDue) : fmt(0)}</span>
      </div>
    </div>
  </div>

  <!-- ── NOTES ────────────────────────────────────────────────── -->
  ${bill.notes ? `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
              padding:12px 14px;font-size:12px;color:#475569;margin-bottom:20px">
    <strong>Notes:</strong> ${bill.notes}
  </div>` : ''}

  <!-- ── FOOTER ───────────────────────────────────────────────── -->
  <div style="border-top:2px solid #e2e8f0;padding-top:14px;
              display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:11px;color:#64748b;line-height:1.7">
      <strong style="color:#0f4c81">${COMPANY.name}</strong><br/>
      ${COMPANY.address}<br/>
      ${COMPANY.gstin}
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700;color:#0f4c81">
        Thank you for choosing Curelex Healthcare!
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:3px">
        Computer-generated invoice · No signature required
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">
        ${COMPANY.phone} | ${COMPANY.email}
      </div>
    </div>
  </div>

</div>
</body>
</html>`;

  // ── Open in new tab and auto-trigger print ────────────────────
  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Please allow pop-ups for this site to download the PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}

// ── Small helpers ─────────────────────────────────────────────────
function totalRow(label, value) {
  return `
    <div style="display:flex;justify-content:space-between;
                padding:5px 0;font-size:13px;border-bottom:1px solid #f1f5f9">
      <span style="color:#475569">${label}</span>
      <span style="font-weight:600">${value}</span>
    </div>`;
}

function roomCell(label, value) {
  return `
    <div>
      <div style="font-size:10px;color:#92400e;margin-bottom:3px">${label}</div>
      <div style="font-size:13px;font-weight:700;color:#78350f">${value}</div>
    </div>`;
}