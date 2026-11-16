/* Pomost v2: rzeczy z prawdziwych stron deweloperów.
   Lista mieszkań piętra w panelu, tabela mieszkań z filtrami i statusami,
   karta mieszkania z rzutem, historią cen (jawność cen od 11.09.2025) i wydrukiem do PDF.
   Dane mieszkań liczone z pięter w app.js (window.POMOST), więc liczby wolnych zgadzają się wszędzie. */
(() => {
  "use strict";
  if (!window.POMOST) return;
  const { FLOORS, ZONES } = window.POMOST;

  const ROOMS = { a: 2, b: 3, c: 4 };
  const EXPO = {
    a: ["W", "S, W", "W", "S, W", "W", "S, W", "W", "S, W"],
    b: ["E, S", "E", "E, N", "E", "E, S"],
    c: ["N, E, S", "E, S, W"],
  };
  const PRICE_DATE = "16.11.2026";
  const PARKING = 65000;
  const STORAGE = 22000;

  const num = new Intl.NumberFormat("pl-PL");
  const dec = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const zl = (v) => `${num.format(v)} zł`;
  const m2 = (v) => `${dec.format(v)} m²`;
  const round1000 = (v) => Math.round(v / 1000) * 1000;
  const seeded = (n) => {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* ---------- dane mieszkań ---------- */
  const APTS = [];
  for (const f of FLOORS) {
    const t = f.total;
    // Najmniejsze mieszkanie piętra zawsze wolne, żeby „cena od” była ceną mieszkania, które da się kupić.
    const rest = [...Array(t).keys()].slice(1).sort((i, j) => seeded(f.n * 31 + i) - seeded(f.n * 31 + j));
    const order = [0, ...rest];
    const status = Array(t).fill("sprzedane");
    order.slice(0, f.free).forEach((i) => (status[i] = "wolne"));
    if (t > f.free) status[order[f.free]] = "rezerwacja";
    const ppm0 = f.from / f.area[0];
    for (let i = 0; i < t; i++) {
      const frac = t > 1 ? i / (t - 1) : 0;
      let area = f.area[0] + (f.area[1] - f.area[0]) * frac;
      if (i > 0 && i < t - 1) area += (seeded(f.n * 7 + i) - 0.5) * 2.4;
      area = Math.round(area * 10) / 10;
      const terrace = Math.round((f.terrace[0] + (f.terrace[1] - f.terrace[0]) * ((i * 3) % t) / Math.max(1, t - 1)) * 10) / 10;
      const price = i === 0 ? f.from : round1000(ppm0 * (1 + 0.015 * frac) * area);
      APTS.push({
        id: `M ${f.n}.${String(i + 1).padStart(2, "0")}`,
        floor: f.n,
        zone: f.zone,
        rooms: ROOMS[f.zone],
        type: ZONES[f.zone].type,
        area,
        terrace,
        expo: EXPO[f.zone][i % EXPO[f.zone].length],
        price,
        ppm: Math.round(price / area),
        status: status[i],
      });
    }
  }

  // Historia ceny ofertowej: start sprzedaży i późniejsze zmiany (penthouse'y po obniżce).
  function history(a) {
    const rows = a.zone === "c"
      ? [
          { d: "15.09.2025", p: round1000(a.price * 1.05) },
          { d: "01.06.2026", p: a.price },
        ]
      : [
          { d: "15.09.2025", p: round1000(a.price * 0.94) },
          { d: "02.03.2026", p: round1000(a.price * 0.972) },
          { d: "01.09.2026", p: a.price },
        ];
    return rows.map((row, i) => ({
      ...row,
      ppm: Math.round(row.p / a.area),
      change: i === 0 ? null : ((row.p - rows[i - 1].p) / rows[i - 1].p) * 100,
    }));
  }

  const STATUS_LABEL = { wolne: "Wolne", rezerwacja: "Rezerwacja", sprzedane: "Sprzedane" };
  const statusPill = (s) => el("span", `dv-pill dv-pill--${s}`, STATUS_LABEL[s]);
  const freeOn = (n) => APTS.filter((a) => a.floor === n && a.status === "wolne");

  /* ---------- rzut mieszkania (SVG) ---------- */
  const PLANS = {
    a: { w: 100, h: 56, terr: 16, rooms: [
      ["Salon z aneksem", 0, 0, 60, 36], ["Sypialnia", 60, 0, 40, 32], ["Łazienka", 72, 32, 28, 24],
      ["Przedpokój", 24, 36, 48, 20], ["Garderoba", 0, 36, 24, 20],
    ] },
    b: { w: 120, h: 64, terr: 17, rooms: [
      ["Salon z kuchnią", 0, 0, 70, 36], ["Sypialnia", 70, 0, 50, 36], ["Sypialnia", 0, 36, 34, 28],
      ["Garderoba", 34, 36, 14, 28], ["Przedpokój", 48, 36, 38, 28], ["Łazienka", 86, 36, 20, 28], ["WC", 106, 36, 14, 28],
    ] },
    c: { w: 140, h: 72, terr: 19, rooms: [
      ["Salon z kuchnią", 0, 0, 80, 40], ["Sypialnia", 80, 0, 60, 40], ["Sypialnia", 0, 40, 30, 32],
      ["Sypialnia", 30, 40, 28, 32], ["Przedpokój", 58, 40, 32, 32], ["Łazienka", 90, 40, 22, 32],
      ["Sauna", 112, 40, 12, 32], ["Garderoba", 124, 40, 16, 32],
    ] },
  };

  function roomAreas(a) {
    const plan = PLANS[a.zone];
    const units = plan.rooms.reduce((sum, r) => sum + r[3] * r[4], 0);
    const areas = plan.rooms.map((r) => Math.round(((r[3] * r[4]) / units) * a.area * 10) / 10);
    const diff = Math.round((a.area - areas.reduce((x, y) => x + y, 0)) * 10) / 10;
    areas[0] = Math.round((areas[0] + diff) * 10) / 10;
    return plan.rooms.map((r, i) => ({ name: r[0], x: r[1], y: r[2], w: r[3], h: r[4], area: areas[i] }));
  }

  function planSvg(a) {
    const ns = "http://www.w3.org/2000/svg";
    const plan = PLANS[a.zone];
    const T = plan.terr;
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `-6 ${-T - 6} ${plan.w + 12} ${plan.h + T + 16}`);
    svg.setAttribute("class", "dv-plan");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Rzut mieszkania ${a.id}`);
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (text !== undefined) node.textContent = text;
      svg.appendChild(node);
      return node;
    };
    // Taras od strony zatoki
    add("rect", { x: 0, y: -T, width: plan.w, height: T, class: "dv-plan-terr" });
    for (let x = 4; x < plan.w; x += 4) add("line", { x1: x, y1: -T, x2: x, y2: 0, class: "dv-plan-deck" });
    add("text", { x: plan.w / 2, y: -T / 2 + 1.6, class: "dv-plan-tlabel" }, `Taras ${dec.format(a.terrace)} m²`);
    // Pomieszczenia
    for (const r of roomAreas(a)) {
      add("rect", { x: r.x, y: r.y, width: r.w, height: r.h, class: "dv-plan-room" });
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      if (r.w < 18) {
        const g = add("g", { transform: `translate(${cx} ${cy}) rotate(-90)` });
        const t1 = document.createElementNS(ns, "text");
        t1.setAttribute("class", "dv-plan-name dv-plan-small");
        t1.setAttribute("y", "-0.6");
        t1.textContent = r.name;
        const t2 = document.createElementNS(ns, "text");
        t2.setAttribute("class", "dv-plan-area dv-plan-small");
        t2.setAttribute("y", "3.2");
        t2.textContent = `${dec.format(r.area)} m²`;
        g.append(t1, t2);
      } else {
        add("text", { x: cx, y: cy - 0.8, class: "dv-plan-name" }, r.name);
        add("text", { x: cx, y: cy + 4, class: "dv-plan-area" }, `${dec.format(r.area)} m²`);
      }
      // Okna w ścianie od tarasu
      if (r.y === 0) {
        const len = Math.min(r.w * 0.6, 30);
        add("rect", { x: cx - len / 2, y: -0.9, width: len, height: 1.8, class: "dv-plan-win" });
      }
    }
    // Ściany zewnętrzne, drzwi wejściowe, północ
    add("rect", { x: 0, y: 0, width: plan.w, height: plan.h, class: "dv-plan-wall" });
    const door = plan.rooms.find((r) => r[0] === "Przedpokój");
    const dx = door[1] + door[3] / 2 - 4;
    add("rect", { x: dx, y: plan.h - 1, width: 8, height: 2, class: "dv-plan-gap" });
    add("path", { d: `M ${dx} ${plan.h} A 8 8 0 0 1 ${dx + 8} ${plan.h - 8} L ${dx} ${plan.h - 8}`, class: "dv-plan-door" });
    add("text", { x: dx + 4, y: plan.h + 7, class: "dv-plan-entry" }, "wejście");
    const nx = plan.w - 2;
    const ny = plan.h + 6;
    add("path", { d: `M ${nx} ${ny - 6} l 2 5 l -2 -1.4 l -2 1.4 z`, class: "dv-plan-north" });
    add("text", { x: nx, y: ny + 3.6, class: "dv-plan-n" }, "N");
    return svg;
  }

  /* ---------- karta mieszkania (okno) ---------- */
  const dialog = el("dialog", "dv-modal");
  dialog.setAttribute("aria-labelledby", "dv-modal-title");
  document.body.appendChild(dialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  function historyTable(a) {
    const table = el("table", "dv-hist");
    const head = el("tr");
    ["Data zmiany", "Cena", "Cena za m²", "Zmiana"].forEach((h) => head.appendChild(el("th", "", h)));
    const thead = el("thead");
    thead.appendChild(head);
    const tbody = el("tbody");
    for (const row of history(a)) {
      const tr = el("tr");
      tr.append(el("td", "", row.d), el("td", "", zl(row.p)), el("td", "", zl(row.ppm)));
      const change = row.change === null ? "start sprzedaży" : `${row.change > 0 ? "+" : "−"}${dec.format(Math.abs(row.change))}%`;
      tr.appendChild(el("td", row.change === null ? "" : row.change > 0 ? "dv-up" : "dv-down", change));
      tbody.appendChild(tr);
    }
    table.append(thead, tbody);
    return table;
  }

  function openCard(a, focusHistory = false) {
    dialog.replaceChildren();
    const close = el("button", "dv-modal-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Zamknij kartę mieszkania");
    close.addEventListener("click", () => dialog.close());

    const head = el("div", "dv-modal-head");
    const title = el("h3", "", `Mieszkanie ${a.id}`);
    title.id = "dv-modal-title";
    head.append(title, statusPill(a.status));
    const sub = el("p", "dv-modal-sub", `Piętro ${a.floor} · ${a.type} · ${m2(a.area)} · taras ${m2(a.terrace)} · ekspozycja ${a.expo}`);

    const body = el("div", "dv-modal-body");
    const planBox = el("figure", "dv-plan-box");
    planBox.appendChild(planSvg(a));
    planBox.appendChild(el("figcaption", "", "Rzut ma charakter poglądowy. Metraże według projektu budowlanego."));

    const side = el("div", "dv-modal-side");
    const spec = el("dl", "dv-modal-spec");
    const addSpec = (k, v, cls) => {
      const box = el("div", cls || "");
      box.append(el("dt", "", k), el("dd", "", v));
      spec.appendChild(box);
    };
    if (a.status === "sprzedane") {
      addSpec("Cena", "Mieszkanie sprzedane", "dv-wide");
    } else {
      addSpec("Cena", zl(a.price), "dv-big");
      addSpec("Cena za m²", zl(a.ppm));
    }
    addSpec("Pokoje", String(a.rooms));
    addSpec("Metraż", m2(a.area));
    addSpec("Taras", m2(a.terrace));
    addSpec("Miejsce postojowe", `${zl(PARKING)}, opcjonalnie`, "dv-wide");
    addSpec("Komórka lokatorska", `od ${zl(STORAGE)}, opcjonalnie`, "dv-wide");
    side.appendChild(spec);

    if (a.status !== "sprzedane") {
      const histBtn = el("button", "dv-link-btn", "Historia cen ▾");
      histBtn.type = "button";
      histBtn.setAttribute("aria-expanded", "false");
      const hist = el("div", "dv-hist-box");
      hist.hidden = true;
      hist.append(historyTable(a), el("p", "dv-note", `Ceny ofertowe publikujemy zgodnie z przepisami o jawności cen mieszkań. Stan na ${PRICE_DATE}.`));
      histBtn.addEventListener("click", () => {
        hist.hidden = !hist.hidden;
        histBtn.setAttribute("aria-expanded", String(!hist.hidden));
        histBtn.textContent = hist.hidden ? "Historia cen ▾" : "Historia cen ▴";
      });
      side.append(histBtn, hist);
      if (focusHistory) {
        hist.hidden = false;
        histBtn.setAttribute("aria-expanded", "true");
        histBtn.textContent = "Historia cen ▴";
      }
    }

    const actions = el("div", "dv-modal-actions");
    if (a.status !== "sprzedane") {
      const ask = el("a", "dv-btn", a.status === "rezerwacja" ? "Zapytaj, czy się zwolni" : "Umów prezentację");
      ask.href = "#zapisz";
      ask.addEventListener("click", () => {
        dialog.close();
        const select = document.getElementById("f-floor");
        if (select) select.value = a.id;
        const message = document.getElementById("f-message");
        if (message && !message.value) message.value = `Dzień dobry, proszę o prezentację mieszkania ${a.id}.`;
      });
      actions.appendChild(ask);
    }
    const inside = el("button", "dv-btn-2", "Wejdź do środka");
    inside.type = "button";
    inside.addEventListener("click", () => {
      dialog.close();
      if (window.pomostEnter) window.pomostEnter(a.floor);
    });
    const print = el("button", "dv-link-btn", "Pobierz kartę mieszkania (PDF)");
    print.type = "button";
    print.addEventListener("click", () => printCard(a));
    actions.append(inside, print);
    side.appendChild(actions);

    body.append(planBox, side);
    dialog.append(close, head, sub, body);
    if (!dialog.open) dialog.showModal();
    // Fokus na tytule zamiast na „×”, żeby po kliknięciu nie świeciła obwódka przycisku.
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  // Wydruk karty: przeglądarka zapisuje go jako PDF.
  function printCard(a) {
    const sheet = el("div", "dv-print");
    sheet.append(
      el("p", "dv-print-brand", "POMOST · Gdynia Orłowo"),
      el("h1", "", `Karta mieszkania ${a.id}`),
      el("p", "", `Piętro ${a.floor} · ${a.type} · ${m2(a.area)} · taras ${m2(a.terrace)} · ekspozycja ${a.expo}`),
    );
    sheet.appendChild(planSvg(a));
    const list = el("ul");
    for (const r of roomAreas(a)) list.appendChild(el("li", "", `${r.name}: ${m2(r.area)}`));
    sheet.appendChild(list);
    if (a.status !== "sprzedane") {
      sheet.appendChild(el("p", "dv-print-price", `Cena: ${zl(a.price)} (${zl(a.ppm)}/m²), stan na ${PRICE_DATE}`));
      sheet.appendChild(historyTable(a));
    }
    sheet.appendChild(el("p", "dv-note", "Biuro sprzedaży: pawilon przy budowie, Gdynia Orłowo · tel. 600 000 000 · sprzedaz@twojadomena.pl. Rzut ma charakter poglądowy. Projekt koncepcyjny."));
    document.body.appendChild(sheet);
    document.body.classList.add("dv-druk");
    const done = () => {
      document.body.classList.remove("dv-druk");
      sheet.remove();
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }

  /* ---------- lista mieszkań piętra w panelu ---------- */
  const panel = document.querySelector(".pk-panel");
  const floorList = el("div", "dv-fl");
  floorList.hidden = true;
  if (panel) panel.appendChild(floorList);

  function openFloor(n) {
    if (!panel) return;
    const f = FLOORS[n - 1];
    floorList.replaceChildren();
    const back = el("button", "dv-fl-back", "← Wszystkie piętra");
    back.type = "button";
    back.addEventListener("click", closeFloor);
    const title = el("h2", "dv-fl-title", `Piętro ${n}`);
    const meta = el("p", "dv-fl-meta", `${ZONES[f.zone].type} · wolne ${f.free} z ${f.total}`);
    const list = el("ul", "dv-fl-list");
    for (const a of APTS.filter((x) => x.floor === n)) {
      const li = el("li");
      const row = el("button", `dv-fl-row dv-fl-row--${a.status}`);
      row.type = "button";
      row.append(
        el("b", "", a.id),
        el("span", "", m2(a.area)),
        el("span", "dv-fl-price", a.status === "sprzedane" ? "—" : zl(a.price)),
        statusPill(a.status),
      );
      row.addEventListener("click", () => openCard(a));
      li.appendChild(row);
      list.appendChild(li);
    }
    const foot = el("div", "dv-fl-foot");
    const inside = el("button", "pk-enter dv-fl-enter", "Wejdź do środka");
    inside.type = "button";
    inside.addEventListener("click", () => window.pomostEnter && window.pomostEnter(n));
    const all = el("a", "dv-fl-all", "Wszystkie mieszkania w tabeli ↓");
    all.href = "#lista";
    all.addEventListener("click", () => setFilter({ floor: String(n) }));
    foot.append(inside, all);
    floorList.append(back, title, meta, list, foot);
    floorList.hidden = false;
    panel.dataset.mode = "lista";
    if (window.pomostSelect) window.pomostSelect(n);
  }

  function closeFloor() {
    floorList.hidden = true;
    if (panel) panel.dataset.mode = "";
  }

  document.addEventListener("pm:pietro", (event) => openFloor(event.detail));
  const listLink = document.querySelector("[data-list]");
  if (listLink) {
    listLink.addEventListener("click", (event) => {
      event.preventDefault();
      openFloor(Number(listLink.dataset.floor || 6));
    });
  }

  /* ---------- tabela mieszkań ---------- */
  const root = document.querySelector("[data-apts]");
  const filter = { rooms: "", floor: "", free: false, sort: "id", dir: 1, all: false };
  const FIRST_ROWS = 12;

  function setFilter(patch) {
    Object.assign(filter, patch);
    syncControls();
    renderTable();
  }

  let controls = null;
  function buildTable() {
    if (!root) return;
    const bar = el("div", "dv-filters");
    const chips = el("div", "dv-chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Liczba pokoi");
    for (const [value, label] of [["", "Wszystkie"], ["2", "2 pokoje"], ["3", "3 pokoje"], ["4", "4 pokoje"]]) {
      const chip = el("button", "dv-chip", label);
      chip.type = "button";
      chip.dataset.rooms = value;
      chip.addEventListener("click", () => setFilter({ rooms: value }));
      chips.appendChild(chip);
    }
    const floorLabel = el("label", "dv-select");
    floorLabel.appendChild(el("span", "", "Piętro"));
    const floorSel = el("select");
    floorSel.appendChild(new Option("Wszystkie", ""));
    for (const f of FLOORS) floorSel.appendChild(new Option(String(f.n), String(f.n)));
    floorSel.addEventListener("change", () => setFilter({ floor: floorSel.value }));
    floorLabel.appendChild(floorSel);
    const freeLabel = el("label", "dv-check");
    const freeBox = el("input");
    freeBox.type = "checkbox";
    freeBox.addEventListener("change", () => setFilter({ free: freeBox.checked }));
    freeLabel.append(freeBox, el("span", "", "Tylko wolne"));
    const count = el("p", "dv-count");
    bar.append(chips, floorLabel, freeLabel, count);

    const wrap = el("div", "dv-table-wrap");
    const table = el("table", "dv-table");
    const head = el("tr");
    const cols = [
      ["id", "Mieszkanie"], ["floor", "Piętro"], ["rooms", "Pokoje"], ["area", "Metraż"], ["terrace", "Taras"],
      ["expo", "Ekspozycja"], ["price", "Cena"], ["ppm", "Cena za m²"], ["status", "Status"], ["", ""],
    ];
    for (const [key, label] of cols) {
      const th = el("th");
      th.scope = "col";
      if (["floor", "area", "price", "ppm"].includes(key)) {
        const sortBtn = el("button", "dv-sort", label);
        sortBtn.type = "button";
        sortBtn.dataset.sort = key;
        sortBtn.addEventListener("click", () =>
          setFilter({ sort: key, dir: filter.sort === key ? -filter.dir : 1 }),
        );
        th.appendChild(sortBtn);
      } else th.textContent = label;
      head.appendChild(th);
    }
    const thead = el("thead");
    thead.appendChild(head);
    const tbody = el("tbody");
    table.append(thead, tbody);
    wrap.appendChild(table);
    const more = el("button", "dv-more");
    more.type = "button";
    more.addEventListener("click", () => setFilter({ all: true }));
    root.append(bar, wrap, more);
    controls = { chips, floorSel, freeBox, count, tbody, table, more };
    syncControls();
    renderTable();
  }

  function syncControls() {
    if (!controls) return;
    controls.chips.querySelectorAll(".dv-chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.rooms === filter.rooms)));
    controls.floorSel.value = filter.floor;
    controls.freeBox.checked = filter.free;
    controls.table.querySelectorAll(".dv-sort").forEach((b) => {
      b.dataset.dir = b.dataset.sort === filter.sort ? (filter.dir > 0 ? "asc" : "desc") : "";
    });
  }

  function renderTable() {
    if (!controls) return;
    let rows = APTS.filter(
      (a) =>
        (!filter.rooms || String(a.rooms) === filter.rooms) &&
        (!filter.floor || String(a.floor) === filter.floor) &&
        (!filter.free || a.status === "wolne"),
    );
    if (filter.sort !== "id") {
      const key = filter.sort;
      rows = [...rows].sort((x, y) => (x[key] - y[key]) * filter.dir);
    }
    const free = rows.filter((a) => a.status === "wolne").length;
    controls.count.textContent = `${rows.length} ${rows.length === 1 ? "mieszkanie" : rows.length % 10 >= 2 && rows.length % 10 <= 4 && (rows.length % 100 < 10 || rows.length % 100 >= 20) ? "mieszkania" : "mieszkań"}, wolne: ${free}`;
    const cut = !filter.all && rows.length > FIRST_ROWS;
    controls.more.hidden = !cut;
    controls.more.textContent = `Pokaż wszystkie mieszkania (${rows.length})`;
    if (cut) rows = rows.slice(0, FIRST_ROWS);
    controls.tbody.replaceChildren(
      ...rows.map((a) => {
        const tr = el("tr", `dv-row dv-row--${a.status}`);
        const sold = a.status === "sprzedane";
        const idCell = el("td", "dv-c-id");
        idCell.appendChild(el("b", "", a.id));
        tr.append(
          idCell,
          el("td", "dv-c-floor", String(a.floor)),
          el("td", "dv-c-rooms", String(a.rooms)),
          el("td", "dv-c-area", m2(a.area)),
          el("td", "dv-c-terr", m2(a.terrace)),
          el("td", "dv-c-expo", a.expo),
          el("td", "dv-c-price", sold ? "—" : zl(a.price)),
          el("td", "dv-c-ppm", sold ? "—" : zl(a.ppm)),
        );
        const st = el("td", "dv-c-status");
        st.appendChild(statusPill(a.status));
        tr.appendChild(st);
        const act = el("td", "dv-c-act");
        const card = el("button", "dv-mini", "Karta i rzut");
        card.type = "button";
        card.addEventListener("click", (event) => {
          event.stopPropagation();
          openCard(a);
        });
        act.appendChild(card);
        if (!sold) {
          const hist = el("button", "dv-mini dv-mini--ghost", "Historia cen");
          hist.type = "button";
          hist.addEventListener("click", (event) => {
            event.stopPropagation();
            openCard(a, true);
          });
          act.appendChild(hist);
        }
        tr.appendChild(act);
        tr.addEventListener("click", () => openCard(a));
        return tr;
      }),
    );
  }

  /* ---------- formularz: mieszkania do wyboru, liczba wolnych ---------- */
  const select = document.getElementById("f-floor");
  if (select) {
    select.replaceChildren(new Option("Jeszcze nie wiem", ""));
    for (const f of FLOORS) {
      const free = APTS.filter((a) => a.floor === f.n && a.status !== "sprzedane");
      if (!free.length) continue;
      const group = document.createElement("optgroup");
      group.label = `Piętro ${f.n}`;
      for (const a of free) {
        const option = new Option(`${a.id} · ${a.rooms} pok. · ${m2(a.area)}${a.status === "rezerwacja" ? " · rezerwacja" : ""}`, a.id);
        option.dataset.floor = String(f.n);
        group.appendChild(option);
      }
      select.appendChild(group);
    }
  }
  const freeTotal = document.querySelector("[data-free-total]");
  if (freeTotal) freeTotal.textContent = String(APTS.filter((a) => a.status === "wolne").length);

  buildTable();
})();
