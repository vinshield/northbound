import "server-only";

import { mailgunConfig, publicEnv, siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import type { OrderWithItems } from "@/lib/types";

/**
 * Sends through the Mailgun HTTP API with basic auth ("api:<key>").
 * Using fetch directly keeps the dependency surface at zero.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const config = mailgunConfig();

  const form = new URLSearchParams();
  form.set("from", config.from);
  form.set("to", params.to);
  form.set("subject", params.subject);
  form.set("html", params.html);
  form.set("text", params.text);
  if (params.replyTo) form.set("h:Reply-To", params.replyTo);

  const response = await fetch(`${config.baseUrl}/v3/${config.domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Mailgun ${response.status}: ${body.slice(0, 300)}`);
  }

  try {
    return JSON.parse(body) as { id: string };
  } catch {
    return { id: "unknown" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT = "-apple-system,Segoe UI,Helvetica,Arial,sans-serif";

/**
 * Order confirmation email. Table-based layout with inline styles, because
 * that is still the only thing every mail client renders predictably.
 */
export function renderOrderConfirmation(order: OrderWithItems): { html: string; text: string } {
  const store = publicEnv.storeName;
  const money = (value: number) => formatMoney(value, order.currency);
  const address = order.shipping_address;
  const firstName = address.full_name ? escapeHtml(address.full_name.split(" ")[0]) : "";

  const itemRows = order.order_items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e8e5e0;vertical-align:top;">
          <div style="font:600 15px/1.4 ${FONT};color:#1a1814;">${escapeHtml(item.product_name)}</div>
          <div style="font:400 13px/1.5 ${FONT};color:#7a736a;margin-top:3px;">
            ${escapeHtml(item.variant_label)} &nbsp;&middot;&nbsp; Qty ${item.quantity}
          </div>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #e8e5e0;text-align:right;vertical-align:top;font:600 15px/1.4 ${FONT};color:#1a1814;white-space:nowrap;">
          ${money(item.unit_price * item.quantity)}
        </td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) => {
    const pad = strong ? "12px 0 0" : "7px 0 0";
    const type = strong ? "700 17px" : "400 14px";
    const labelColor = strong ? "#1a1814" : "#7a736a";
    return `
    <tr>
      <td style="padding:${pad};font:${type}/1.4 ${FONT};color:${labelColor};">${label}</td>
      <td style="padding:${pad};text-align:right;font:${type}/1.4 ${FONT};color:#1a1814;white-space:nowrap;">${value}</td>
    </tr>`;
  };

  const line2 = address.line2 ? `${escapeHtml(address.line2)}<br />` : "";
  const postal = address.postal_code ? ` ${escapeHtml(address.postal_code)}` : "";
  const greeting = firstName ? `Thanks, ${firstName}` : "Thanks";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e5e0;">

          <tr><td style="padding:30px 32px 24px;border-bottom:1px solid #e8e5e0;">
            <div style="font:700 19px/1 ${FONT};letter-spacing:-0.3px;color:#1a1814;">${escapeHtml(store)}</div>
          </td></tr>

          <tr><td style="padding:32px;">
            <h1 style="margin:0 0 10px;font:700 24px/1.25 ${FONT};color:#1a1814;letter-spacing:-0.4px;">
              ${greeting} &mdash; your order is confirmed.
            </h1>
            <p style="margin:0;font:400 15px/1.6 ${FONT};color:#5c554c;">
              We have received your payment and are preparing your parcel. Your order number is
              <strong style="color:#1a1814;">${escapeHtml(order.order_number)}</strong>.
            </p>
          </td></tr>

          <tr><td style="padding:0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
              ${totalRow("Subtotal", money(order.subtotal))}
              ${totalRow("Shipping", order.shipping_fee === 0 ? "Free" : money(order.shipping_fee))}
              ${totalRow("Total paid", money(order.total), true)}
            </table>
          </td></tr>

          <tr><td style="padding:28px 32px 0;">
            <div style="background:#faf9f7;border:1px solid #e8e5e0;border-radius:10px;padding:18px 20px;">
              <div style="font:600 12px/1 ${FONT};text-transform:uppercase;letter-spacing:0.8px;color:#7a736a;margin-bottom:10px;">
                Shipping to
              </div>
              <div style="font:400 14px/1.65 ${FONT};color:#1a1814;">
                ${escapeHtml(address.full_name)}<br />
                ${escapeHtml(address.line1)}<br />
                ${line2}
                ${escapeHtml(address.city)}, ${escapeHtml(address.state)}${postal}<br />
                ${escapeHtml(address.country)}<br />
                <span style="color:#7a736a;">${escapeHtml(address.phone)}</span>
              </div>
            </div>
          </td></tr>

          <tr><td style="padding:28px 32px 36px;">
            <a href="${siteUrl()}/orders" style="display:inline-block;background:#1a1814;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:9px;font:600 14px/1 ${FONT};">
              View your order
            </a>
          </td></tr>

          <tr><td style="padding:20px 32px 28px;border-top:1px solid #e8e5e0;background:#faf9f7;">
            <p style="margin:0;font:400 12px/1.6 ${FONT};color:#9a938a;">
              Questions about this order? Just reply to this email and a human will answer.
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `${store} - order confirmed`,
    "",
    `Order ${order.order_number}`,
    "",
    ...order.order_items.map(
      (i) =>
        `${i.quantity} x ${i.product_name} (${i.variant_label}) - ${money(i.unit_price * i.quantity)}`,
    ),
    "",
    `Subtotal: ${money(order.subtotal)}`,
    `Shipping: ${order.shipping_fee === 0 ? "Free" : money(order.shipping_fee)}`,
    `Total paid: ${money(order.total)}`,
    "",
    "Shipping to:",
    address.full_name,
    address.line1,
    address.line2 ?? "",
    `${address.city}, ${address.state} ${address.postal_code ?? ""}`.trim(),
    address.country,
    address.phone,
    "",
    `View your order: ${siteUrl()}/orders`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { html, text };
}

export async function sendOrderConfirmation(order: OrderWithItems) {
  const { html, text } = renderOrderConfirmation(order);
  return sendEmail({
    to: order.email,
    subject: `${publicEnv.storeName} order ${order.order_number} confirmed`,
    html,
    text,
  });
}
