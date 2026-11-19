// Replaces native <select> dropdowns with a styled, keyboard-accessible listbox.
// The real <select> stays in the DOM (hidden), so form values, validation and the code that
// sets `select.value` or rebuilds its <option>s keep working: the custom UI follows along.

const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
let uid = 0;

function enhance(select) {
  if (select.dataset.cs) return;
  select.dataset.cs = "1";

  const id = `cs-${++uid}`;
  const wrap = document.createElement("div");
  wrap.className = "cs";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cs__btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", id);
  const list = document.createElement("ul");
  list.className = "cs__list";
  list.id = id;
  list.setAttribute("role", "listbox");
  list.hidden = true;

  select.classList.add("cs__native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.after(wrap);
  wrap.append(btn, list);

  let active = -1;
  const options = () => [...select.options];

  function render() {
    const cur = select.selectedOptions[0];
    btn.textContent = cur ? cur.textContent : "";
    btn.classList.toggle("is-placeholder", !select.value);
    list.innerHTML = "";
    options().forEach((o, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.dataset.i = i;
      li.textContent = o.textContent;
      if (o.selected) li.setAttribute("aria-selected", "true");
      if (!o.value) li.classList.add("is-empty");
      list.append(li);
    });
  }

  function highlight(i) {
    const items = [...list.children];
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, k) => li.classList.toggle("is-active", k === active));
    items[active].scrollIntoView({ block: "nearest" });
  }

  function open() {
    if (!list.hidden) return;
    document.dispatchEvent(new CustomEvent("cs-open", { detail: wrap }));
    list.hidden = false;
    wrap.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
    highlight(select.selectedIndex);
  }
  function close() {
    list.hidden = true;
    wrap.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  }
  function choose(i) {
    if (i < 0 || !select.options[i]) return;
    if (select.selectedIndex !== i) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    render();
    close();
    btn.focus();
  }

  btn.addEventListener("click", () => (list.hidden ? open() : close()));
  list.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus on the button
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) choose(+li.dataset.i);
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li");
    if (li && +li.dataset.i !== active) highlight(+li.dataset.i);
  });
  btn.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) open(); else highlight(active + (k === "ArrowDown" ? 1 : -1));
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      if (list.hidden) open(); else choose(active);
    } else if (k === "Escape" && !list.hidden) {
      e.preventDefault();
      close();
    } else if (k === "Tab") {
      close();
    } else if (k.length === 1 && /\S/.test(k)) {
      // type-ahead
      const i = options().findIndex((o, n) => n > active && o.textContent.trim().toLowerCase().startsWith(k.toLowerCase()));
      const j = i >= 0 ? i : options().findIndex((o) => o.textContent.trim().toLowerCase().startsWith(k.toLowerCase()));
      if (j >= 0) { if (list.hidden) open(); highlight(j); }
    }
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener("cs-open", (e) => { if (e.detail !== wrap) close(); });

  // Follow programmatic changes: `select.value = x` and rebuilt <option>s
  Object.defineProperty(select, "value", {
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); render(); },
    configurable: true,
  });
  new MutationObserver(render).observe(select, { childList: true, subtree: true, characterData: true });
  select.addEventListener("change", render);
  select.form?.addEventListener("reset", () => setTimeout(render));

  // Invalid state (set by validate()) is shown on the custom button too
  new MutationObserver(() => btn.classList.toggle("invalid", select.classList.contains("invalid")))
    .observe(select, { attributes: true, attributeFilter: ["class"] });

  render();
}

export function enhanceSelects(root = document) {
  root.querySelectorAll("select").forEach(enhance);
}
