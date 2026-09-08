import "server-only";
import { readFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { OrderRecord } from "./order-notifications";

const green = rgb(41 / 255, 75 / 255, 53 / 255);
const gold = rgb(232 / 255, 163 / 255, 23 / 255);
const ink = rgb(42 / 255, 42 / 255, 42 / 255);
const muted = rgb(0.43, 0.43, 0.43);
const line = rgb(0.86, 0.82, 0.75);
const formatMoney = (value: number | string) => `INR ${Number(value).toFixed(2)}`;
const safe = (value: unknown) => String(value ?? "").replace(/[^\x20-\x7E]/g, "-");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safe(text).split(/\s+/); const lines: string[] = []; let current = "";
  for (const word of words) { const next = current ? `${current} ${word}` : word; if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next; else { if (current) lines.push(current); current = word; } }
  if (current) lines.push(current); return lines;
}

export async function generateInvoicePdf(order: OrderRecord) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(join(process.cwd(), "public", "images", "sara-masala-logo-transparent.png"));
  const logo = await document.embedPng(logoBytes);
  const pageWidth = 595.28; const pageHeight = 841.89; const margin = 46;
  let page: PDFPage = document.addPage([pageWidth, pageHeight]); let y = pageHeight - margin;
  const newPage = () => { page = document.addPage([pageWidth, pageHeight]); y = pageHeight - margin; return page; };
  const ensure = (height: number) => { if (y - height < 48) { newPage(); drawFooter(); } };
  const text = (value: unknown, x: number, size = 9, options: { font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number; lineHeight?: number } = {}) => {
    const selectedFont = options.font || regular; const lineHeight = options.lineHeight || size * 1.35;
    const lines = wrap(String(value ?? ""), selectedFont, size, options.maxWidth || pageWidth - x - margin); ensure(lines.length * lineHeight);
    for (const row of lines) { page.drawText(row, { x, y, size, font: selectedFont, color: options.color || ink }); y -= lineHeight; }
  };
  const drawFooter = () => { page.drawLine({ start: { x: margin, y: 35 }, end: { x: pageWidth - margin, y: 35 }, thickness: 0.5, color: line }); page.drawText(`Invoice ${safe(order.order_number)}`, { x: margin, y: 21, size: 7, font: regular, color: muted }); };
  const rule = () => { page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.7, color: line }); y -= 16; };

  drawFooter();
  const logoScale = Math.min(155 / logo.width, 65 / logo.height);
  page.drawImage(logo, { x: margin, y: y - logo.height * logoScale + 8, width: logo.width * logoScale, height: logo.height * logoScale });
  page.drawText("INVOICE", { x: pageWidth - margin - 112, y: y - 5, size: 24, font: bold, color: green });
  page.drawText(`Invoice no: INV-${safe(order.order_number).replace(/^SM-/, "")}`, { x: pageWidth - margin - 180, y: y - 28, size: 8, font: regular, color: muted });
  page.drawText(`Order no: ${safe(order.order_number)}`, { x: pageWidth - margin - 180, y: y - 41, size: 8, font: regular, color: muted });
  page.drawText(`Date: ${new Date(order.paid_at || order.created_at).toLocaleDateString("en-IN")}`, { x: pageWidth - margin - 180, y: y - 54, size: 8, font: regular, color: muted });
  y -= 86; rule();

  const issuerName = process.env.INVOICE_ISSUER_NAME?.trim() || "Sara Masala (brand)";
  const issuerAddress = process.env.INVOICE_ISSUER_ADDRESS?.trim() || "Business address: To be supplied";
  text("ISSUED BY", margin, 8, { font: bold, color: gold });
  text(issuerName, margin, 11, { font: bold, color: green }); text(issuerAddress, margin, 8, { color: muted, maxWidth: 230 });
  y -= 8;
  text("BILL TO", margin, 8, { font: bold, color: gold }); text(order.customer_name, margin, 11, { font: bold }); text(order.customer_email, margin, 8); text(order.customer_phone, margin, 8);
  y -= 8;
  text("SHIP TO", margin, 8, { font: bold, color: gold });
  const address = order.shipping_address;
  text(address ? [address.line1, address.line2, `${address.city}, ${address.state} ${address.postal_code}`, address.country].filter(Boolean).join(", ") : "Not supplied", margin, 8, { maxWidth: pageWidth - margin * 2 });
  y -= 10; rule();

  const columns = { product: margin, weight: 285, quantity: 355, price: 405, total: 490 };
  page.drawText("PRODUCT", { x: columns.product, y, size: 8, font: bold, color: green });
  page.drawText("WEIGHT", { x: columns.weight, y, size: 8, font: bold, color: green });
  page.drawText("QTY", { x: columns.quantity, y, size: 8, font: bold, color: green });
  page.drawText("UNIT PRICE", { x: columns.price, y, size: 8, font: bold, color: green });
  page.drawText("TOTAL", { x: columns.total, y, size: 8, font: bold, color: green }); y -= 15;
  for (const item of order.order_items) {
    ensure(30); const rowY = y; const productLines = wrap(item.product_name, regular, 8, 225);
    productLines.forEach((value, index) => page.drawText(value, { x: columns.product, y: rowY - index * 11, size: 8, font: regular, color: ink }));
    page.drawText(safe(item.weight), { x: columns.weight, y: rowY, size: 8, font: regular, color: ink });
    page.drawText(String(item.quantity), { x: columns.quantity, y: rowY, size: 8, font: regular, color: ink });
    page.drawText(formatMoney(item.unit_price), { x: columns.price, y: rowY, size: 8, font: regular, color: ink });
    page.drawText(formatMoney(item.line_total), { x: columns.total, y: rowY, size: 8, font: regular, color: ink });
    y -= Math.max(25, productLines.length * 11 + 10); rule();
  }

  const totalLine = (label: string, value: number | string, strong = false, currency = true) => { ensure(20); page.drawText(label, { x: 365, y, size: strong ? 11 : 9, font: strong ? bold : regular, color: strong ? green : ink }); page.drawText(currency ? formatMoney(value) : safe(value), { x: 475, y, size: strong ? 11 : 9, font: strong ? bold : regular, color: strong ? green : ink }); y -= strong ? 22 : 17; };
  totalLine("Subtotal", order.subtotal); totalLine("Shipping", order.shipping); totalLine("Discount", order.discount); totalLine("Tax", "Not configured", false, false);
  totalLine("GRAND TOTAL", order.total, true);
  y -= 6; rule();

  text("PAYMENT", margin, 8, { font: bold, color: gold }); text(`Status: ${order.payment_status}`, margin, 8); text(`Method: ${order.payment_method}`, margin, 8); text(`Razorpay payment ID: ${order.razorpay_payment_id || "Not available"}`, margin, 8);
  y -= 7; text(process.env.INVOICE_TAX_REGISTRATION?.trim() || "Tax registration: To be supplied", margin, 8, { color: muted });
  text(process.env.INVOICE_TAX_NOTE?.trim() || "Tax details and applicable classifications will be added when supplied by the business.", margin, 8, { color: muted });
  text("This invoice does not state a GSTIN, GST rate, HSN code, or legal company name unless configured by the business.", margin, 7, { color: muted });

  document.setTitle(`Invoice ${order.order_number}`); document.setAuthor("Sara Masala"); document.setCreator("Sara Masala ecommerce");
  return document.save();
}
