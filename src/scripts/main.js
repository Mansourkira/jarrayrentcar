import { AGENCY, LOCATIONS, CARS } from "../data/config.js";
import { EN, DYN } from "../data/i18n.js";

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let lang = "fr";
  try { lang = localStorage.getItem("lang") || "fr"; } catch {}
  const t = () => DYN[lang];
  const carById = (id) => CARS.find((c) => c.id === id);

  // ---------- i18n ----------
  const original = new Map();
  $$("[data-i18n]").forEach((el) => original.set(el, el.innerHTML));

  function applyLang() {
    document.documentElement.lang = lang;
    $("#langToggle").textContent = lang === "fr" ? "EN" : "FR";
    original.forEach((html, el) => {
      const key = el.dataset.i18n;
      el.innerHTML = lang === "en" && EN[key] ? EN[key] : html;
    });
    renderCars();
    fillCarSelect();
    updateSummary();
    showCar(frontCar);
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
    $("#carCount").textContent = `${list.length} ${d.cars}`;
    $("#carGrid").innerHTML = list.map((c, i) => {
      const on = c.id === form.car.value;
      return `
      <article class="car${on ? " is-selected" : ""}" style="animation-delay:${i * 50}ms">
        <div class="car__img">
          <img src="${c.image}" alt="${c.name}" loading="lazy">
          <span class="car__tag">${d.cat[c.category]}</span>
        </div>
        <div class="car__body">
          <h3>${c.name}</h3>
          <div class="specs">
            <span>${c.seats} ${d.seats}</span><span>${d[c.gearbox]}</span><span>${d[c.fuel]}</span>${c.ac ? `<span>${d.ac}</span>` : ""}
          </div>
          <div class="car__foot">
            <div class="price"><b>${c.price}</b> <span>${AGENCY.currency} ${d.perDay}</span></div>
            <button class="pick" data-book="${c.id}">${on ? d.selected : d.choose}</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  $("#filters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $$(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
    filter = chip.dataset.filter;
    renderCars();
  });

  function selectCar(id) {
    form.car.value = id;
    renderCars();
    updateSummary();
    const panel = $("#booking");
    const r = panel.getBoundingClientRect();
    // Only scroll when the panel isn't already visible (mobile / showroom)
    if (r.top > innerHeight - 120 || r.bottom < 120) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.classList.remove("flash");
    void panel.offsetWidth;
    panel.classList.add("flash");
  }

  $("#carGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-book]");
    if (btn) selectCar(btn.dataset.book);
  });

  function fillCarSelect() {
    const current = form.car.value;
    form.car.innerHTML = `<option value="">${t().select}</option>` +
      CARS.map((c) => `<option value="${c.id}">${c.name} — ${c.price} ${AGENCY.currency}</option>`).join("");
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
    const car = carById(form.car.value);
    const days = getDays();
    const d = t();
    const cur = AGENCY.currency;
    $("#sumName").textContent = car ? car.name : d.noCar;
    $("#sumMeta").textContent = car ? `${d.cat[car.category]} · ${d[car.gearbox]} · ${d[car.fuel]}` : "";
    $("#sumLine").textContent = car && days ? `${car.price} ${cur} × ${days} ${days > 1 ? d.days : d.day}` : "—";
    $("#sumSub").textContent = car && days ? `${car.price * days} ${cur}` : "—";
    $("#sumTotal").textContent = car && days ? `${car.price * days} ${cur}` : "—";
  }
  form.addEventListener("input", updateSummary);
  form.addEventListener("change", (e) => {
    updateSummary();
    if (e.target === form.car) renderCars();
  });

  // ---------- Submit ----------
  function buildMessage() {
    const d = t();
    const car = carById(form.car.value);
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

  // ---------- 3D showroom (three.js loaded only when it nears the screen) ----------
  let showroom = null;
  let frontCar = CARS[0];
  const showEl = $("#showroom");

  function showCar(car) {
    frontCar = car;
    $("#showCat").textContent = t().cat[car.category];
    $("#showName").textContent = car.name;
    $("#showPrice").textContent = car.price;
  }
  showCar(frontCar);
  $("#showPick").addEventListener("click", () => selectCar(frontCar.id));

  const showIO = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting || showroom) return;
    showIO.disconnect();
    try {
      const { createShowroom } = await import("./showroom.js");
      showroom = createShowroom($("#stage"), CARS, {
        onChange: showCar,
        onPick: (car) => selectCar(car.id),
        onTouch: () => showEl.classList.add("is-touched"),
      });
      $("#showPrev").addEventListener("click", () => showroom.step(-1));
      $("#showNext").addEventListener("click", () => showroom.step(1));
    } catch (err) {
      console.warn("3D showroom disabled:", err);
      showEl.classList.add("no-webgl");
      // Without WebGL the arrows still cycle through the cars
      let i = 0;
      const cycle = (n) => { i = (i + n + CARS.length) % CARS.length; showCar(CARS[i]); };
      $("#showPrev").addEventListener("click", () => cycle(-1));
      $("#showNext").addEventListener("click", () => cycle(1));
    }
  }, { rootMargin: "300px" });
  showIO.observe(showEl);

  // ---------- Header, menu ----------
  const bar = $("#bar");
  const onScroll = () => bar.classList.toggle("is-scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger"), nav = $("#nav");
  const toggleMenu = (open) => {
    nav.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
  };
  burger.addEventListener("click", () => toggleMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  applyLang();
})();
