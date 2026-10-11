// Where did this visitor come from? Used to tag every booking message so
// online bookings can be counted per channel.
//
// Share links with ?src=<name> to track a channel or partner, e.g.
//   https://site/?src=instagram-bio
//   https://site/?src=hotel-yadis
// Without ?src=, the referrer is used (google, facebook, instagram…) or "direct".

const KEY = "jrc_src";
const TTL_DAYS = 30;

const REFERRERS = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)youtube\.com$/, "youtube"],
];

const clean = (v) => String(v).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

function fromUrl() {
  const q = new URLSearchParams(location.search);
  const src = q.get("src") || q.get("ref") || q.get("utm_source");
  if (src) {
    const camp = q.get("utm_campaign");
    return clean(camp ? `${src}-${camp}` : src);
  }
  if (q.has("gclid")) return "google-ads";
  if (q.has("fbclid")) return "facebook";
  return "";
}

function fromReferrer() {
  if (!document.referrer) return "";
  let host;
  try { host = new URL(document.referrer).hostname; } catch { return ""; }
  if (host === location.hostname) return "";
  const hit = REFERRERS.find(([re]) => re.test(host));
  return hit ? hit[1] : clean(host.replace(/^www\./, ""));
}

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && Date.now() - v.at < TTL_DAYS * 864e5) return v.src;
  } catch {}
  return "";
}

function save(src) {
  try { localStorage.setItem(KEY, JSON.stringify({ src, at: Date.now() })); } catch {}
}

// An explicit ?src= link always wins; otherwise keep the first channel seen
// in the last 30 days, then the referrer, then "direct".
let source = fromUrl();
if (source) save(source);
else {
  source = load() || fromReferrer();
  if (source) save(source);
  else source = "direct";
}

export const getSource = () => source;

// Short booking reference, e.g. JRC-261011-K7Q2 — write it in the booking sheet
export function makeRef() {
  const d = new Date();
  const ymd = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rnd = "";
  for (let i = 0; i < 4; i++) rnd += chars[Math.floor(Math.random() * chars.length)];
  return `JRC-${ymd}-${rnd}`;
}
