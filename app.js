/* ========= Utilities ========= */
const FOOD_URL = "data/food_log.json";
const SUPP_URL = "data/supplements.json";

/* ========= Check state (meals + supplements) ========= */
const CHECKS_KEY = "foodlog_checks_v1";
function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveChecks(obj) {
  try {
    localStorage.setItem(CHECKS_KEY, JSON.stringify(obj));
  } catch {}
}
function makeCheckKey(kind, day, id) {
  return `${kind}|${day || ""}|${id || ""}`;
}
function createCheck(kind, day, id) {
  const key = makeCheckKey(kind, day, id);
  const checks = loadChecks();

  const wrap = document.createElement("label");
  wrap.className = "check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!checks[key];

  const box = document.createElement("span");
  box.className = "check__box";
  box.setAttribute("aria-hidden", "true");

  input.addEventListener("change", () => {
    const next = loadChecks();
    next[key] = input.checked;
    saveChecks(next);
  });

  wrap.append(input, box);
  return wrap;
}

function infoIconSvg() {
  // lightweight inline SVG, avoids emoji rendering differences
  return `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M12 10.5v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>`;
}
const THEME_KEY = "foodlog_theme"; // 'dark' | 'light'

function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const x = Number(n);
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

function weekdayNameNow() {
  // Use the browser's local time zone.
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date());
}

function normalizeDay(s) {
  return String(s || "").trim().toLowerCase();
}

function pill(label, value) {
  const span = document.createElement("span");
  span.className = "pill";
  span.innerHTML = `<span class="muted">${label}</span><strong>${value}</strong>`;
  return span;
}

/* ========= Theme ========= */
function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const icon = document.querySelector("#themeToggle .icon");
  if (icon) icon.textContent = theme === "light" ? "☀️" : "🌙";
}

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function setupThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  applyTheme(getInitialTheme());
  btn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

/* ========= Modal ========= */
function setupModal() {
  const modal = document.getElementById("modal");
  if (!modal) return null;

  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");

  function open({ title, body }) {
    if (titleEl) titleEl.textContent = title || "Description";
    if (bodyEl) bodyEl.textContent = body || "—";
    modal.setAttribute("aria-hidden", "false");
    // basic focus
    const closeBtn = modal.querySelector("[data-close]");
    closeBtn && closeBtn.focus();
  }

  function close() {
    modal.setAttribute("aria-hidden", "true");
  }

  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close") === "true") close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") close();
  });

  return { open, close };
}

/* ========= Data ========= */
async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return await res.json();
}

/* ========= Render: Today ========= */
function renderToday(food, supp) {
  const modal = setupModal();

  const nowDay = weekdayNameNow();
  const title = document.getElementById("todayTitle");
  if (title) title.textContent = nowDay;

  const dayObj = (food.days || []).find(d => normalizeDay(d.day) === normalizeDay(nowDay));
  const subtitle = document.getElementById("todaySubtitle");

  if (!dayObj) {
    if (subtitle) subtitle.textContent = "No data found for today in the JSON.";
    return;
  }

  if (subtitle) subtitle.textContent = "Meals + totals (tap for description)";

  const totals = document.getElementById("todayTotals");
  if (totals) {
    totals.replaceChildren(
      pill("kcal", fmtNum(dayObj.daily_total_calories)),
      pill("protein g", fmtNum(dayObj.daily_total_protein_g))
    );
  }

  const mealsList = document.getElementById("mealsList");
  if (mealsList) {
    mealsList.replaceChildren();
    for (const m of (dayObj.meals || [])) {
      const item = document.createElement("div");
      item.className = "item";

      const check = createCheck("meal", dayObj.day, m.meal || m.name);

      const main = document.createElement("div");
      main.className = "item__main";

      const h = document.createElement("h3");
      h.className = "item__title";
      h.textContent = m.name || m.meal || "Meal";

      const meta = document.createElement("div");
      meta.className = "item__meta";
      meta.innerHTML = `
        <span>🍽️ ${m.meal || ""}</span>
        <span>🔥 ${fmtNum(m.calories)} kcal</span>
        <span>💪 ${fmtNum(m.protein_g)} g</span>
      `;

      main.append(h, meta);

      const btn = document.createElement("button");
      btn.className = "icon-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Show description");
      btn.innerHTML = infoIconSvg();

      btn.addEventListener("click", () => {
        if (!modal) return;
        modal.open({
          title: m.name || "Meal description",
          body: m.description || "No description."
        });
      });

      item.append(check, main, btn);
      mealsList.append(item);
    }
  }

  // Supplements
  const suppList = document.getElementById("suppList");
  if (suppList) {
    suppList.replaceChildren();
    const arr = (supp && supp.supplements) ? supp.supplements : [];
    if (!arr.length) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.innerHTML = `<div class="item__main"><h3 class="item__title">No supplements found</h3><div class="item__meta">Check supplements JSON</div></div>`;
      suppList.append(empty);
    } else {
      for (const s of arr) {
        const item = document.createElement("div");
        item.className = "item";

        const check = createCheck("supp", "today", s.name);

        const main = document.createElement("div");
        main.className = "item__main";

        const h = document.createElement("h3");
        h.className = "item__title";
        h.textContent = s.name || "Supplement";

        const meta = document.createElement("div");
        meta.className = "item__meta";

        const servingParts = [];
        if (s.serving?.count) servingParts.push(`${s.serving.count} ${s.serving.unit || ""}`.trim());
        if (s.serving?.amount_g) servingParts.push(`${fmtNum(s.serving.amount_g)} ${s.serving.unit || "g"}`.trim());
        if (servingParts.length) meta.innerHTML += `<span>🧾 ${servingParts.join(" / ")}</span>`;
        if (s.form) meta.innerHTML += `<span>📦 ${s.form}</span>`;

        const desc = document.createElement("p");
        desc.className = "item__desc";
        desc.textContent = supplementDoseText(s);

        const btn = document.createElement("button");
        btn.className = "icon-btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Show supplement details");
        btn.innerHTML = infoIconSvg();

        btn.addEventListener("click", () => {
          if (!modal) return;
          const body = [
            s.form ? `Form: ${s.form}` : null,
            s.serving ? `Serving: ${formatServing(s.serving)}` : null,
            supplementDoseText(s)
          ].filter(Boolean).join("\n");
          modal.open({
            title: s.name || "Supplement",
            body
          });
        });

        main.append(h, meta, desc);
        item.append(check, main, btn);
        suppList.append(item);
      }
    }
  }
}

function supplementDoseText(s) {
  // tries to turn the dose object into readable text
  if (!s) return "—";
  const parts = [];
  if (typeof s.daily_dose_mg === "number") parts.push(`Daily dose: ${fmtNum(s.daily_dose_mg)} mg`);
  if (s.daily_dose && typeof s.daily_dose === "object") {
    for (const [k, v] of Object.entries(s.daily_dose)) {
      if (v === null || v === undefined) continue;
      const label = k.replaceAll("_", " ").replace(/\bmg\b/i, "mg").replace(/\biu\b/i, "IU");
      parts.push(`${label}: ${fmtNum(v)}`);
    }
  }
  if (!parts.length && s.serving?.amount_g) parts.push(`Serving: ${fmtNum(s.serving.amount_g)} ${s.serving.unit || "g"}`);
  return parts.join(" • ") || "—";
}

function formatServing(serving) {
  if (!serving) return "—";
  if (serving.count) return `${serving.count} ${serving.unit || ""}`.trim();
  if (serving.amount_g) return `${fmtNum(serving.amount_g)} ${serving.unit || "g"}`.trim();
  return "—";
}

/* ========= Render: Week ========= */
function renderWeek(food) {
  const subtitle = document.getElementById("weekSubtitle");
  if (subtitle) subtitle.textContent = "Overview + full details";

  // Weekly summary pills
  const sum = food.weekly_summary || {};
  const days = food.days || [];
  const weeklyCalories = (sum.weekly_total_calories_calculated ?? sum.weekly_total_calories_reported ?? sum.weekly_total_calories);
  const avgDayCalories = (sum.average_daily_calories_calculated ?? sum.average_daily_calories_reported ?? sum.average_daily_calories);
  const weeklyProtein = days.reduce((acc, d) => acc + (Number(d.daily_total_protein_g) || 0), 0);
  const avgDayProtein = (sum.average_daily_protein_g_calculated ?? (weeklyProtein / Math.max(days.length, 1)));
  const weekSummary = document.getElementById("weekSummary");
  if (weekSummary) {
    weekSummary.replaceChildren(
      pill("weekly kcal", fmtNum(weeklyCalories)),
      pill("avg/day kcal", fmtNum(avgDayCalories)),
      pill("weekly protein g", fmtNum(weeklyProtein)),
      pill("avg/day protein g", fmtNum(avgDayProtein))
    );
  }

  // Overview
  const ov = document.getElementById("weekOverview");
  if (ov) {
    ov.replaceChildren();
    for (const d of (food.days || [])) {
      const card = document.createElement("div");
      card.className = "day-card";

      const head = document.createElement("div");
      head.className = "day-card__head";

      const day = document.createElement("h3");
      day.className = "day-card__day";
      day.textContent = d.day || "Day";

      const pills = document.createElement("div");
      pills.className = "pill-row";
      pills.append(
        pill("kcal", fmtNum(d.daily_total_calories)),
        pill("protein g", fmtNum(d.daily_total_protein_g))
      );

      head.append(day, pills);

      const names = (d.meals || []).map(m => m.name).filter(Boolean);
      const list = document.createElement("ul");
      list.className = "day-card__list";
      if (!names.length) {
        const li = document.createElement("li");
        li.className = "muted";
        li.textContent = "No meals.";
        list.append(li);
      } else {
        for (const n of names) {
          const li = document.createElement("li");
          li.textContent = n;
          list.append(li);
        }
      }

      card.append(head, list);
      ov.append(card);
    }
  }

  // Details
  const details = document.getElementById("weekDetails");
  if (details) {
    details.replaceChildren();
    for (const d of (food.days || [])) {
      const block = document.createElement("div");
      block.className = "day-block";

      const head = document.createElement("div");
      head.className = "day-block__head";

      const h = document.createElement("h3");
      h.className = "day-block__title";
      h.textContent = d.day || "Day";

      const pills = document.createElement("div");
      pills.className = "pill-row";
      pills.append(
        pill("kcal", fmtNum(d.daily_total_calories)),
        pill("protein g", fmtNum(d.daily_total_protein_g))
      );

      head.append(h, pills);

      const list = document.createElement("div");
      list.className = "list";

      for (const m of (d.meals || [])) {
        const item = document.createElement("div");
        item.className = "item";

        const check = createCheck("meal", d.day, m.meal || m.name);

        const main = document.createElement("div");
        main.className = "item__main";

        const title = document.createElement("h4");
        title.className = "item__title";
        title.textContent = m.name || m.meal || "Meal";

        const meta = document.createElement("div");
        meta.className = "item__meta";
        meta.innerHTML = `
          <span>🍽️ ${m.meal || ""}</span>
          <span>🔥 ${fmtNum(m.calories)} kcal</span>
          <span>💪 ${fmtNum(m.protein_g)} g</span>
        `;

        const desc = document.createElement("p");
        desc.className = "item__desc";
        desc.textContent = m.description || "—";

        main.append(title, meta, desc);
        item.append(check, main);
        list.append(item);
      }

      block.append(head, list);
      details.append(block);
    }
  }
}

/* ========= Boot ========= */
async function main() {
  setupThemeToggle();

  const note = document.getElementById("dataSourceNote");
  try {
    const food = await loadJson(FOOD_URL);

    if (note) note.textContent = `Data: ${food.source || "JSON"} • Units: ${food.units?.energy || "kcal"} / ${food.units?.protein || "g"}`;

    if (window.APP_PAGE === "today") {
      const supp = await loadJson(SUPP_URL);
      renderToday(food, supp);
    } else if (window.APP_PAGE === "week") {
      renderWeek(food);
    }
  } catch (err) {
    console.error(err);
    if (note) note.textContent = String(err?.message || err);
    const sub = document.getElementById(window.APP_PAGE === "week" ? "weekSubtitle" : "todaySubtitle");
    if (sub) sub.textContent = "Failed to load data. If you opened this file directly, use a local server (or GitHub Pages).";
  }
}

document.addEventListener("DOMContentLoaded", main);
