// Cloudflare Worker: stores booking requests in D1 and serves a password-protected admin table.
// Everything else is served from the static site (env.ASSETS).
import { CARS, LOCATIONS } from "./data/config.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const str = (v, max) => String(v ?? "").trim().slice(0, max);

function makeRef() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return "JRC-" + [...b].map((x) => a[x % a.length]).join("");
}

async function createBooking(request, env) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_request" }, 400); }
  if (b.website) return json({ ok: true, ref: "JRC-000000" }); // honeypot: bots fill this hidden field

  const car = CARS.find((c) => c.id === b.car);
  const pickupAt = str(b.pickupAt, 16), returnAt = str(b.returnAt, 16);
  const pa = new Date(pickupAt), ra = new Date(returnAt);
  const name = str(b.name, 100), phone = str(b.phone, 30);
  const pickupLoc = str(b.pickupLoc, 100), returnLoc = str(b.returnLoc, 100);

  if (!car || !name || phone.replace(/\D/g, "").length < 8 ||
      !LOCATIONS.includes(pickupLoc) || !LOCATIONS.includes(returnLoc) ||
      isNaN(pa) || isNaN(ra) || ra <= pa) return json({ error: "invalid" }, 400);

  const days = Math.max(1, Math.ceil((ra - pa) / 864e5));
  if (days > 90) return json({ error: "invalid" }, 400);
  const total = days * car.price; // computed server-side from the real price list
  const lang = b.lang === "en" ? "en" : "fr";

  for (let i = 0; i < 3; i++) {
    const ref = makeRef();
    try {
      await env.jarray_bookings.prepare(
        `INSERT INTO bookings (ref, car_id, car_name, pickup_loc, pickup_at, return_loc, return_at, days, total, name, phone, email, notes, source, lang)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(ref, car.id, car.name, pickupLoc, pickupAt, returnLoc, returnAt, days, total, name, phone,
             str(b.email, 120) || null, str(b.notes, 1000) || null, str(b.source, 60) || null, lang).run();
      return json({ ok: true, ref });
    } catch (e) {
      if (!String(e).includes("UNIQUE")) return json({ error: "server" }, 500);
    }
  }
  return json({ error: "server" }, 500);
}

// ---------- Admin ----------
function authorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let pass = "";
  try { pass = atob(h.slice(6)).split(":").slice(1).join(":"); } catch { return false; }
  const a = new TextEncoder().encode(pass), b = new TextEncoder().encode(env.ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
const deny = () =>
  new Response("Mot de passe requis", { status: 401, headers: { "www-authenticate": 'Basic realm="Jarray Rent Car admin"' } });

const STATUS_LABEL = { new: "Nouvelle", confirmed: "Confirmée", cancelled: "Annulée" };

async function adminPage(env) {
  const { results } = await env.jarray_bookings.prepare("SELECT * FROM bookings ORDER BY id DESC LIMIT 500").all();
  const rows = results.map((r) => `
    <tr class="${esc(r.status)}">
      <td>${esc(r.created_at)}<br><b>${esc(r.ref)}</b></td>
      <td><b>${esc(r.name)}</b><br><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.email ? `<br>${esc(r.email)}` : ""}</td>
      <td>${esc(r.car_name)}</td>
      <td>${esc(r.pickup_at.replace("T", " "))}<br>${esc(r.pickup_loc)}</td>
      <td>${esc(r.return_at.replace("T", " "))}<br>${esc(r.return_loc)}</td>
      <td>${r.days} j · <b>${r.total} DT</b></td>
      <td>${esc(r.notes)}<br><small>${esc(r.source)}</small></td>
      <td><form method="post" action="/admin/status"><input type="hidden" name="id" value="${r.id}">
        <select name="status" onchange="this.form.submit()">
          ${Object.keys(STATUS_LABEL).map((s) => `<option value="${s}"${s === r.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
        </select></form></td>
    </tr>`).join("");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Réservations — Jarray Rent Car</title>
<style>body{font:14px system-ui,sans-serif;margin:0;background:#f3f4f1;color:#0b1620}header{background:#0b1620;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
header a{color:#5fd0d8}main{padding:16px;overflow-x:auto}table{border-collapse:collapse;width:100%;background:#fff;border-radius:10px;overflow:hidden}
th,td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #e1e4e0}th{background:#e9ece8;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
tr.new td:first-child{border-left:4px solid #0a6b73}tr.confirmed td:first-child{border-left:4px solid #1f9d55}tr.cancelled{opacity:.5}small{color:#4a5763}select{padding:6px}</style></head>
<body><header><b>Réservations (${results.length})</b><a href="/admin.csv">Exporter CSV</a></header>
<main><table><thead><tr><th>Reçue</th><th>Client</th><th>Voiture</th><th>Départ</th><th>Retour</th><th>Durée / total</th><th>Message / source</th><th>Statut</th></tr></thead>
<tbody>${rows || '<tr><td colspan="8">Aucune réservation pour le moment.</td></tr>'}</tbody></table></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

async function adminCsv(env) {
  const { results } = await env.jarray_bookings.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
  const cols = ["ref", "created_at", "status", "car_name", "pickup_loc", "pickup_at", "return_loc", "return_at", "days", "total", "name", "phone", "email", "notes", "source", "lang"];
  // prefix risky leading characters so spreadsheets don't run client-supplied formulas
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = "﻿" + [cols.join(","), ...results.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="reservations.csv"', "cache-control": "no-store" },
  });
}

async function adminStatus(request, env) {
  const f = await request.formData();
  const id = parseInt(f.get("id"), 10), status = f.get("status");
  if (id && STATUS_LABEL[status]) {
    await env.jarray_bookings.prepare("UPDATE bookings SET status = ? WHERE id = ?").bind(status, id).run();
  }
  return Response.redirect(new URL("/admin", request.url).href, 303);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === "/api/bookings" && request.method === "POST") return createBooking(request, env);
    if (pathname === "/admin" || pathname === "/admin.csv" || pathname === "/admin/status") {
      if (!authorized(request, env)) return deny();
      if (pathname === "/admin") return adminPage(env);
      if (pathname === "/admin.csv") return adminCsv(env);
      if (request.method === "POST") {
        // CSRF guard: the status form must come from this same origin
        const o = request.headers.get("origin");
        if (o && o !== url.origin) return new Response("Forbidden", { status: 403 });
        return adminStatus(request, env);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
