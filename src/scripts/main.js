import { AGENCY, LOCATIONS, CARS } from "../data/config.js";
import { EN, DYN } from "../data/i18n.js";

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let lang = "fr";
  try { lang = localStorage.getItem("lang") || "fr"; } catch {}
  const t = () => DYN[lang];

  // ---------- i18n ----------
  const original = new Map();
  $$("[data-i18n], [data-i18n-html]").forEach((el) => original.set(el, el.innerHTML));

  function applyLang() {
    document.documentElement.lang = lang;
    $("#langToggle").textContent = lang === "fr" ? "EN" : "FR";
    original.forEach((html, el) => {
      const key = el.dataset.i18n || el.dataset.i18nHtml;
      el.innerHTML = lang === "en" && EN[key] ? EN[key] : html;
    });
    renderCars();
    fillCarSelect();
    updateSummary();
  }

  $("#langToggle").addEventListener("click", () => {
    lang = lang === "fr" ? "en" : "fr";
    try { localStorage.setItem("lang", lang); } catch {}
    applyLang();
  });

  // ---------- Agency info ----------
  const waLink = (text = "") => `https://wa.me/${AGENCY.whatsapp}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  $$(".js-whatsapp").forEach((a) => (a.href = waLink()));
  $$(".js-phone").forEach((a) => { a.href = "tel:" + AGENCY.phone.replace(/\s/g, ""); a.textContent = AGENCY.phone; });
  $$(".js-email").forEach((a) => { a.href = "mailto:" + AGENCY.email; a.textContent = AGENCY.email; });
  $$(".js-address").forEach((el) => (el.textContent = AGENCY.address));
  $(".js-fb").href = AGENCY.facebook;
  $(".js-ig").href = AGENCY.instagram;
  $("#map").src = `https://maps.google.com/maps?q=${encodeURIComponent(AGENCY.mapQuery)}&z=13&output=embed`;
  $("#year").textContent = new Date().getFullYear();

  // ---------- Locations & dates ----------
  $$(".js-locations").forEach((sel) => {
    sel.innerHTML = LOCATIONS.map((l) => `<option>${l}</option>`).join("");
  });
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const plus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
  $$('input[name="pickupDate"]').forEach((i) => { i.min = iso(today); i.value = plus(1); });
  $$('input[name="returnDate"]').forEach((i) => { i.min = iso(today); i.value = plus(4); });

  // ---------- Cars ----------
  let filter = "all";
  const form = $("#bookingForm");

  function renderCars() {
    const d = t();
    const list = CARS.filter((c) => filter === "all" || c.category === filter);
    $("#carGrid").innerHTML = list.map((c, i) => `
      <article class="car" style="animation-delay:${i * 60}ms">
        <div class="car__img">
          <img src="${c.image}" alt="${c.name}" loading="lazy">
          <span class="car__tag">${d.cat[c.category]}</span>
        </div>
        <div class="car__body">
          <h3>${c.name}</h3>
          <div class="specs">
            <span>👤 ${c.seats} ${d.seats}</span>
            <span>⚙️ ${d[c.gearbox]}</span>
            <span>⛽ ${d[c.fuel]}</span>
            ${c.ac ? `<span>❄️ ${d.ac}</span>` : ""}
          </div>
          <div class="car__foot">
            <div class="price"><b>${c.price} ${AGENCY.currency}</b> <span>${d.perDay}</span></div>
            <button class="btn btn--primary btn--sm" data-book="${c.id}">${d.book}</button>
          </div>
        </div>
      </article>`).join("");
  }

  $("#filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
    filter = chip.dataset.filter;
    renderCars();
  });

  $("#carGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-book]");
    if (!btn) return;
    form.car.value = btn.dataset.book;
    updateSummary();
    $("#booking").scrollIntoView({ behavior: "smooth" });
  });

  function fillCarSelect() {
    const current = form.car.value;
    form.car.innerHTML = `<option value="">${t().select}</option>` +
      CARS.map((c) => `<option value="${c.id}">${c.name} — ${c.price} ${AGENCY.currency}${t().perDay}</option>`).join("");
    form.car.value = current;
  }

  // ---------- Quick search -> booking ----------
  $("#quickSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = e.target;
    form.pickupLoc.value = q.pickupLoc.value;
    form.returnLoc.value = q.pickupLoc.value;
    form.pickupDate.value = q.pickupDate.value;
    form.returnDate.value = q.returnDate.value;
    updateSummary();
    $("#fleet").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- Summary ----------
  function getDays() {
    const a = new Date(`${form.pickupDate.value}T${form.pickupTime.value || "10:00"}`);
    const b = new Date(`${form.returnDate.value}T${form.returnTime.value || "10:00"}`);
    const h = (b - a) / 36e5;
    return h > 0 ? Math.max(1, Math.ceil(h / 24)) : 0;
  }

  function updateSummary() {
    const car = CARS.find((c) => c.id === form.car.value);
    const days = getDays();
    const d = t();
    $("#summaryCar").innerHTML = car
      ? `<img src="${car.image}" alt=""><span>${car.name}</span>`
      : `<span>${lang === "en" ? EN["book.noCar"] : "Aucune voiture sélectionnée"}</span>`;
    $("#sumDays").textContent = days ? `${days} ${days > 1 ? d.days : d.day}` : "—";
    $("#sumPrice").textContent = car ? `${car.price} ${AGENCY.currency}` : "—";
    $("#sumTotal").textContent = car && days ? `${car.price * days} ${AGENCY.currency}` : "—";
  }
  form.addEventListener("input", updateSummary);
  form.addEventListener("change", updateSummary);

  // ---------- Submit ----------
  function buildMessage() {
    const d = t();
    const car = CARS.find((c) => c.id === form.car.value);
    const days = getDays();
    const f = form;
    return [
      `🚗 *${d.msgTitle} — ${AGENCY.name}*`,
      `${d.msgCar}: ${car.name}`,
      `${d.msgFrom}: ${f.pickupDate.value} ${f.pickupTime.value} — ${f.pickupLoc.value}`,
      `${d.msgTo}: ${f.returnDate.value} ${f.returnTime.value} — ${f.returnLoc.value}`,
      `${d.msgTotal}: ${car.price * days} ${AGENCY.currency} (${days} ${days > 1 ? d.days : d.day})`,
      `${d.msgName}: ${f.name.value}`,
      `${d.msgPhone}: ${f.phone.value}`,
      f.email.value && `${d.msgEmail}: ${f.email.value}`,
      f.notes.value && `${d.msgNotes}: ${f.notes.value}`,
    ].filter(Boolean).join("\n");
  }

  function validate() {
    const err = $("#formError");
    let ok = true;
    $$("[required]", form).forEach((el) => {
      const bad = !el.value.trim();
      el.classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    if (!ok) { err.textContent = t().errRequired; err.hidden = false; return false; }
    if (!getDays()) { err.textContent = t().errDates; err.hidden = false; form.returnDate.classList.add("invalid"); return false; }
    err.hidden = true;
    return true;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    window.open(waLink(buildMessage()), "_blank");
  });

  $("#mailFallback").addEventListener("click", (e) => {
    e.preventDefault();
    if (!validate()) return;
    const subject = `${t().msgTitle} — ${AGENCY.name}`;
    location.href = `mailto:${AGENCY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage().replace(/\*/g, ""))}`;
  });

  // ---------- Header, menu, reveal ----------
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 30);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger"), nav = $("#nav");
  const toggleMenu = (open) => {
    nav.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
  };
  burger.addEventListener("click", () => toggleMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  applyLang();
})();
