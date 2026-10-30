/* Pomost: floor picker, amenities rail and register form. Plain JavaScript, no build step. */
(() => {
  "use strict";

  // Where the register form sends its data. "/" works on Netlify, which picks the form up
  // automatically (Forms tab). On other hosting paste a form endpoint, e.g. from Formspree.
  const FORM_ENDPOINT = "/";

  const IMG_W = 2752;
  const IMG_H = 1536;
  const CLIP_WAIT_MS = 9000;
  const CLIP_WATCHDOG_MS = 11000;
  const STILL_SIZES = "(max-width: 1023px) 130vw, 100vw";
  const INTRO_POINTER =
    "Najedź na piętro, a jego okna się rozjaśnią. Kliknij je albo ustaw suwak i wejdź przez szybę do środka.";
  const INTRO_TOUCH = "Dotknij piętra albo przesuń suwak, a potem wejdź przez szybę do środka.";

  const clip = (name) => ({
    desktop: `assets/video/${name}.mp4`,
    mobile: `assets/video/${name}-m.mp4`,
    poster: `assets/video/${name}.webp`,
  });

  // Apartment types. Hotspot x and y are fractions of the interior photo.
  const ZONES = {
    a: {
      id: "a",
      type: "2 pokoje",
      insideName: "dwa pokoje",
      view: "Z salonu widać wydmy i sosny.",
      insideText: "Salon z aneksem otwiera się na taras nad wydmami. Sypialnia jest tuż obok.",
      interior: "assets/picker/inside-a",
      roomImage: "assets/picker/room-a",
      room: { title: "Sypialnia", text: "Łóżko stoi naprzeciw okna. Rano widać korony sosen i pasek morza." },
      fly: clip("fly-a"),
      move: clip("move-a"),
      hotspots: [
        { id: "room", label: "Sypialnia", x: 0.875, y: 0.45, move: true },
        { id: "kitchen", label: "Aneks kuchenny", x: 0.66, y: 0.36, note: "Zabudowa z dębu, blat z konglomeratu i sprzęty w zabudowie w cenie mieszkania." },
        { id: "terrace", label: "Taras", x: 0.1, y: 0.44, note: "Od 9 do 14 m², szklana balustrada bez słupków, gniazdo i kran na zewnątrz." },
      ],
    },
    b: {
      id: "b",
      type: "3 pokoje, narożne",
      insideName: "trzy pokoje",
      view: "Prosto na zatokę i molo.",
      insideText: "Narożny salon ma szkło z dwóch stron. Z kuchni widać molo, a taras biegnie wzdłuż całego mieszkania.",
      interior: "assets/picker/inside-b",
      roomImage: "assets/picker/room-b",
      room: { title: "Taras nad zatoką", text: "Dębowy pokład i szklana balustrada bez słupków. Molo masz prosto przed sobą." },
      fly: clip("fly-b"),
      move: clip("move-b"),
      hotspots: [
        { id: "room", label: "Taras", x: 0.8, y: 0.48, move: true },
        { id: "kitchen", label: "Kuchnia", x: 0.24, y: 0.48, note: "Wyspa z lastryko ma 2,8 m długości, a okap jest schowany w suficie." },
        { id: "bedrooms", label: "Sypialnie", x: 0.51, y: 0.41, note: "Dwie sypialnie od strony lasu, każda z własną garderobą." },
      ],
    },
    c: {
      id: "c",
      type: "4 pokoje z sauną",
      insideName: "cztery pokoje z sauną",
      view: "Na wprost tylko otwarte morze.",
      insideText: "Salon ma 3,4 m wysokości. Schody prowadzą na dach, a za drzwiami po prawej jest prywatna sauna.",
      interior: "assets/picker/inside-c",
      roomImage: "assets/picker/room-c",
      room: { title: "Sauna z widokiem", text: "Szklana ściana od podłogi do sufitu. Na wprost jest tylko horyzont." },
      fly: clip("fly-c"),
      move: clip("move-c"),
      hotspots: [
        { id: "room", label: "Sauna", x: 0.915, y: 0.5, move: true },
        { id: "fire", label: "Kominek", x: 0.635, y: 0.6, note: "Biokominek w gipsowej obudowie. Bez komina i bez dymu." },
        { id: "stairs", label: "Schody na dach", x: 0.49, y: 0.43, note: "Prowadzą do prywatnej części dachu z ogrodem i prysznicem." },
      ],
    },
  };

  // Floors: area and terrace ranges in m², starting price in zł, free and total flats.
  const FLOORS = [
    { n: 1, zone: "a", area: [46, 58], terrace: [9, 14], from: 1090000, free: 6, total: 8 },
    { n: 2, zone: "a", area: [46, 58], terrace: [9, 14], from: 1120000, free: 5, total: 8 },
    { n: 3, zone: "a", area: [46, 58], terrace: [9, 14], from: 1150000, free: 7, total: 8 },
    { n: 4, zone: "b", area: [68, 84], terrace: [16, 24], from: 1690000, free: 4, total: 5 },
    { n: 5, zone: "b", area: [68, 84], terrace: [16, 24], from: 1740000, free: 3, total: 5 },
    { n: 6, zone: "b", area: [68, 84], terrace: [16, 24], from: 1790000, free: 4, total: 5 },
    { n: 7, zone: "b", area: [68, 84], terrace: [16, 24], from: 1840000, free: 2, total: 5 },
    { n: 8, zone: "c", area: [112, 126], terrace: [32, 36], from: 3450000, free: 1, total: 2 },
    { n: 9, zone: "c", area: [128, 138], terrace: [34, 38], from: 3790000, free: 2, total: 2 },
  ];

  // Slab edges traced on the exterior photo (left end, nearest corner, right end), from the
  // roof canopy down to the slab above the glazed ground floor. Floor n sits between
  // SLABS[9 - n] and SLABS[10 - n].
  const SLABS = [
    [[1739, 248], [2227, 169], [2490, 376]],
    [[1702, 340], [2215, 272], [2490, 447]],
    [[1656, 431], [2210, 370], [2490, 515]],
    [[1609, 529], [2205, 474], [2490, 587]],
    [[1562, 615], [2200, 581], [2490, 662]],
    [[1511, 728], [2190, 718], [2490, 757]],
    [[1465, 828], [2175, 830], [2490, 834]],
    [[1418, 925], [2160, 938], [2490, 909]],
    [[1373, 1022], [2140, 1048], [2490, 985]],
    [[1334, 1128], [2110, 1165], [2490, 1070]],
  ];

  const ZONE_IDS = ["a", "b", "c"];

  function floorPolygon(n) {
    const up = SLABS[9 - n];
    const lo = SLABS[10 - n];
    const rail = Math.round((lo[0][1] - up[0][1]) * 0.38);
    return [up[0], up[1], up[2], lo[2], lo[1], lo[0], [lo[0][0], lo[0][1] - rail], [up[0][0], lo[0][1] - rail]]
      .map((point) => point.join(","))
      .join(" ");
  }

  // Where the floor number sits: just right of the building, level with the floor.
  function floorTag(n) {
    const up = SLABS[9 - n];
    const lo = SLABS[10 - n];
    return { x: ((up[2][0] + 36) / IMG_W) * 100, y: ((up[2][1] + lo[2][1]) / 2 / IMG_H) * 100 };
  }

  const areaText = (f) => `Od ${f.area[0]} do ${f.area[1]} m², taras od ${f.terrace[0]} do ${f.terrace[1]} m².`;
  const formatPrice = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const still = (base) => ({ src: `${base}-2752.webp`, srcset: `${base}-1440.webp 1440w, ${base}-2752.webp 2752w` });

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactQuery = window.matchMedia("(max-width: 1023px)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const motionOk = () => !reducedQuery.matches;

  // Start buffering a clip that was created with preload="none".
  function warm(video) {
    if (!video || !video.getAttribute("src")) return;
    if (video.preload !== "auto") video.preload = "auto";
    if (video.readyState === 0 && video.networkState !== HTMLMediaElement.NETWORK_LOADING) video.load();
  }

  // Resolves when the clip can play through, or with whatever is buffered at the deadline.
  function waitReady(video, ms) {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 4) {
        resolve();
        return;
      }
      const finish = (ok) => {
        window.clearTimeout(timer);
        video.removeEventListener("canplaythrough", onReady);
        video.removeEventListener("error", onError);
        if (ok) resolve();
        else reject(new Error("clip unavailable"));
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timer = window.setTimeout(() => finish(video.readyState >= 3), ms);
      video.addEventListener("canplaythrough", onReady);
      video.addEventListener("error", onError);
    });
  }

  // outside: the building and the panel. flying and moving: a film is playing.
  // inside: the living room with hotspots. room: the second room after the camera move.
  function initPicker() {
    const section = document.getElementById("mieszkania");
    if (!section) return;
    const pick = (selector) => section.querySelector(selector);
    const scene = pick(".pk-scene");
    const svg = pick(".pk-floors");
    const tag = pick(".pk-tag");
    const scrim = pick(".pk-scrim");
    const spots = pick(".pk-spots");
    const panel = pick(".pk-panel");
    const caption = pick(".pk-caption");
    const range = pick("[data-range]");
    const ticks = Array.from(pick(".pk-ticks").children);
    const numEl = pick("[data-num]");
    const enterButton = pick("[data-enter]");
    const backButton = pick("[data-back]");
    const backLabel = pick("[data-back-label]");
    const capTitle = pick("[data-cap-title]");
    const capText = pick("[data-cap-text]");
    const spotList = pick("[data-spot-list]");
    const floorSelect = document.getElementById("f-floor");

    const state = { selected: 6, hover: null, phase: "outside", entered: 6, note: null, loading: false };
    const primed = new Set();
    let busy = false;
    let warmedOnce = false;
    let warmTimer = 0;
    let watchdog = 0;
    let shownActive = 6;
    let warmZone = null;
    let spotsKey = "";

    const svgNs = "http://www.w3.org/2000/svg";
    const polygons = FLOORS.map((floor) => {
      const shape = document.createElementNS(svgNs, "polygon");
      shape.setAttribute("class", "pk-floor");
      shape.setAttribute("points", floorPolygon(floor.n));
      shape.addEventListener("pointerenter", () => {
        if (fineQuery.matches && state.phase === "outside" && state.hover !== floor.n) update({ hover: floor.n });
      });
      shape.addEventListener("click", () => onFloorClick(floor.n));
      svg.appendChild(shape);
      return shape;
    });
    svg.addEventListener("pointerleave", () => {
      if (state.hover !== null) update({ hover: null });
    });

    function makeVideo(className, onEnded) {
      const video = document.createElement("video");
      video.className = `pk-layer ${className}`;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("disablepictureinpicture", "");
      video.setAttribute("aria-hidden", "true");
      video.preload = "none";
      video.tabIndex = -1;
      video.addEventListener("ended", onEnded);
      return video;
    }

    function makeStill(className, alt) {
      const img = document.createElement("img");
      img.className = `pk-layer ${className}`;
      img.alt = alt;
      img.width = IMG_W;
      img.height = IMG_H;
      img.decoding = "async";
      img.sizes = STILL_SIZES;
      return img;
    }

    // Layers per apartment type, stacked: film in, living room, film to the room, room.
    const layers = {};
    for (const id of ZONE_IDS) {
      const zone = ZONES[id];
      const group = {
        fly: makeVideo("pk-fly", () => {
          if (state.phase === "flying") setPhase("inside");
        }),
        inside: makeStill("pk-inside", `Salon w mieszkaniu: ${zone.type}`),
        move: makeVideo("pk-move", () => {
          if (state.phase === "moving") setPhase("room");
        }),
        room: makeStill("pk-room", zone.room.title),
      };
      for (const el of [group.fly, group.inside, group.move, group.room]) scene.insertBefore(el, scrim);
      layers[id] = group;
    }

    function applySources() {
      const compact = compactQuery.matches;
      for (const id of ZONE_IDS) {
        const zone = ZONES[id];
        const flySrc = compact ? zone.fly.mobile : zone.fly.desktop;
        const moveSrc = compact ? zone.move.mobile : zone.move.desktop;
        if (layers[id].fly.getAttribute("src") !== flySrc) layers[id].fly.setAttribute("src", flySrc);
        if (layers[id].move.getAttribute("src") !== moveSrc) layers[id].move.setAttribute("src", moveSrc);
      }
    }

    // Stills and posters load only once a visitor looks at that apartment type.
    function prime(id) {
      if (primed.has(id)) return;
      primed.add(id);
      const zone = ZONES[id];
      const inside = still(zone.interior);
      const room = still(zone.roomImage);
      layers[id].inside.srcset = inside.srcset;
      layers[id].inside.src = inside.src;
      layers[id].room.srcset = room.srcset;
      layers[id].room.src = room.src;
      layers[id].fly.poster = zone.fly.poster;
      layers[id].move.poster = zone.move.poster;
    }

    const activeFloor = () => (state.phase === "outside" ? (state.hover ?? state.selected) : state.entered);
    const enteredZone = () => ZONES[FLOORS[state.entered - 1].zone];

    function update(patch) {
      Object.assign(state, patch);
      render();
    }

    function restartAnimation(el, text) {
      el.textContent = text;
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }

    function render() {
      const phase = state.phase;
      const active = activeFloor();
      const floor = FLOORS[active - 1];
      const activeZone = ZONES[floor.zone];
      const zone = enteredZone();
      const inView = phase === "inside" || phase === "moving" || phase === "room";
      const captionOn = phase === "inside" || phase === "room";

      section.dataset.phase = phase;
      scene.style.setProperty("--fx", phase === "outside" ? "0.7" : "0.5");
      polygons.forEach((shape, index) => shape.setAttribute("data-on", String(phase === "outside" && active === index + 1)));

      const place = floorTag(active);
      tag.style.left = `${place.x}%`;
      tag.style.top = `${place.y}%`;

      if (active !== shownActive) {
        shownActive = active;
        restartAnimation(numEl, String(active));
        restartAnimation(tag.firstElementChild, String(active));
        pick("[data-type]").textContent = activeZone.type;
        pick("[data-desc]").textContent = `${areaText(floor)} ${activeZone.view}`;
        pick("[data-price]").textContent = `od ${formatPrice(floor.from)} zł`;
        pick("[data-free]").textContent = `${floor.free} z ${floor.total}`;
        range.setAttribute("aria-valuetext", `Piętro ${active}, ${activeZone.type}`);
        ticks.forEach((tick, index) => tick.setAttribute("data-on", String(index + 1 === active)));
      }
      if (range.value !== String(active)) range.value = String(active);

      panel.dataset.on = String(phase === "outside");
      panel.inert = phase !== "outside";
      pick("[data-intro]").textContent = fineQuery.matches ? INTRO_POINTER : INTRO_TOUCH;
      enterButton.dataset.loading = String(state.loading);
      enterButton.setAttribute("aria-busy", String(state.loading));
      pick("[data-enter-label]").textContent = state.loading ? "Wczytuję" : "Wejdź";
      pick("[data-enter-sr]").textContent = ` na piętro ${state.selected}`;

      for (const id of ZONE_IDS) {
        const here = zone.id === id;
        layers[id].fly.dataset.on = String(here && phase !== "outside");
        layers[id].inside.dataset.on = String(here && inView);
        layers[id].move.dataset.on = String(here && (phase === "moving" || phase === "room"));
        layers[id].room.dataset.on = String(here && phase === "room");
      }

      backLabel.textContent = phase === "room" ? "Wróć do salonu" : "Wróć do budynku";

      caption.dataset.on = String(captionOn);
      caption.inert = !captionOn;
      if (phase === "room") {
        capTitle.textContent = zone.room.title;
        capText.textContent = zone.room.text;
      } else {
        capTitle.textContent = `Piętro ${state.entered}, ${zone.insideName}`;
        capText.textContent = zone.insideText;
      }
      spotList.hidden = phase === "room";
      spots.dataset.on = String(phase === "inside");
      renderSpots(zone);

      if (phase === "outside" && activeZone.id !== warmZone) {
        warmZone = activeZone.id;
        scheduleWarm(activeZone.id);
      }
    }

    function renderSpots(zone) {
      const key = `${zone.id}|${state.note}|${state.phase === "inside"}`;
      if (key === spotsKey) return;
      spotsKey = key;
      const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.spot : undefined;
      spots.replaceChildren(...zone.hotspots.map(hotspot));
      spotList.replaceChildren(...zone.hotspots.map(listItem));
      if (focused) {
        const again = section.querySelector(`[data-spot="${focused}"]`);
        if (again) again.focus({ preventScroll: true });
      }
    }

    function noteEl(text, className) {
      const note = document.createElement("p");
      if (className) note.className = className;
      note.textContent = text;
      return note;
    }

    function hotspot(h) {
      const wrap = document.createElement("div");
      wrap.className = "pk-spot";
      wrap.dataset.side = h.x > 0.7 ? "left" : "right";
      wrap.style.left = `${h.x * 100}%`;
      wrap.style.top = `${h.y * 100}%`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pk-spot-btn";
      button.dataset.kind = h.move ? "move" : "info";
      button.dataset.spot = `spot-${h.id}`;
      button.tabIndex = state.phase === "inside" ? 0 : -1;
      if (!h.move) button.setAttribute("aria-expanded", String(state.note === h.id));
      const ring = document.createElement("span");
      ring.className = "pk-spot-ring";
      ring.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "pk-spot-label";
      label.textContent = h.label;
      if (h.move) {
        const go = document.createElement("span");
        go.className = "pk-spot-go";
        go.setAttribute("aria-hidden", "true");
        go.textContent = "→";
        label.appendChild(go);
      }
      button.append(ring, label);
      button.addEventListener("click", () => (h.move ? goRoom() : toggleNote(h.id)));
      wrap.appendChild(button);
      if (!h.move && state.note === h.id) wrap.appendChild(noteEl(h.note, "pk-note"));
      return wrap;
    }

    function listItem(h) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.kind = h.move ? "move" : "info";
      button.dataset.spot = `list-${h.id}`;
      if (!h.move) button.setAttribute("aria-expanded", String(state.note === h.id));
      button.textContent = h.label;
      if (h.move) {
        const go = document.createElement("span");
        go.setAttribute("aria-hidden", "true");
        go.textContent = " →";
        button.appendChild(go);
      }
      button.addEventListener("click", () => (h.move ? goRoom() : toggleNote(h.id)));
      item.appendChild(button);
      if (!h.move && state.note === h.id) item.appendChild(noteEl(h.note));
      return item;
    }

    function setPhase(phase) {
      state.phase = phase;
      if (phase === "outside" || phase === "inside" || phase === "room") busy = false;
      window.clearTimeout(watchdog);
      // A stalled film never traps the visitor: move on after a generous deadline.
      if (phase === "flying" || phase === "moving") {
        const next = phase === "flying" ? "inside" : "room";
        watchdog = window.setTimeout(() => {
          if (state.phase === phase) setPhase(next);
        }, CLIP_WATCHDOG_MS);
      }
      render();
      if (phase === "inside" || phase === "room") capTitle.focus({ preventScroll: true });
      if (phase === "inside" && motionOk()) warm(layers[enteredZone().id].move);
      if (phase === "outside") applySources();
    }

    // Buffer the film and stills of whatever floor the visitor is looking at.
    function scheduleWarm(id) {
      window.clearTimeout(warmTimer);
      warmTimer = window.setTimeout(
        () => {
          warmedOnce = true;
          prime(id);
          if (motionOk()) warm(layers[id].fly);
        },
        warmedOnce ? 350 : 1600,
      );
    }

    async function playClip(video, during, after) {
      if (!motionOk() || !video) {
        setPhase(after);
        return;
      }
      update({ loading: true });
      try {
        warm(video);
        await waitReady(video, CLIP_WAIT_MS);
        video.currentTime = 0;
        state.loading = false;
        setPhase(during);
        await video.play();
      } catch {
        state.loading = false;
        setPhase(after);
      }
    }

    function enter(n) {
      if (busy || state.phase !== "outside") return;
      busy = true;
      const id = FLOORS[n - 1].zone;
      Object.assign(state, { selected: n, hover: null, entered: n, note: null });
      if (floorSelect) floorSelect.value = String(n);
      prime(id);
      if (Math.abs(section.getBoundingClientRect().top) > 2) {
        section.scrollIntoView({ behavior: motionOk() ? "smooth" : "auto", block: "start" });
      }
      render();
      playClip(layers[id].fly, "flying", "inside");
    }

    function goRoom() {
      if (busy || state.phase !== "inside") return;
      busy = true;
      state.note = null;
      playClip(layers[enteredZone().id].move, "moving", "room");
    }

    function rewind(videos) {
      window.setTimeout(() => {
        for (const video of videos) {
          video.pause();
          if (video.readyState > 0) video.currentTime = 0;
        }
      }, 700);
    }

    function backToLiving() {
      if (state.phase !== "room") return;
      setPhase("inside");
      rewind([layers[enteredZone().id].move]);
    }

    function backToBuilding() {
      if (state.phase !== "inside" && state.phase !== "room") return;
      state.note = null;
      if (motionOk()) {
        section.dataset.settling = "true";
        window.setTimeout(() => {
          section.dataset.settling = "false";
        }, 1000);
      }
      setPhase("outside");
      rewind(ZONE_IDS.flatMap((id) => [layers[id].fly, layers[id].move]));
      window.setTimeout(() => enterButton.focus({ preventScroll: true }), 80);
    }

    function toggleNote(id) {
      update({ note: state.note === id ? null : id });
    }

    // Mouse: a click goes straight in. Touch: the first tap picks the floor, the second enters.
    function onFloorClick(n) {
      if (state.phase !== "outside") return;
      if (fineQuery.matches || state.selected === n) enter(n);
      else update({ selected: n });
    }

    range.addEventListener("input", () => update({ hover: null, selected: Number(range.value) }));
    range.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        enter(state.selected);
      }
    });
    enterButton.addEventListener("click", () => enter(state.selected));
    backButton.addEventListener("click", () => (state.phase === "room" ? backToLiving() : backToBuilding()));
    scene.addEventListener("pointerdown", (event) => {
      if (state.note && !event.target.closest(".pk-spot")) update({ note: null });
    });
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || (state.phase !== "inside" && state.phase !== "room")) return;
      if (state.note) update({ note: null });
      else if (state.phase === "room") backToLiving();
      else backToBuilding();
    });
    compactQuery.addEventListener("change", () => {
      if (state.phase === "outside") applySources();
    });
    fineQuery.addEventListener("change", render);

    applySources();
    render();
  }

  // The coral marker tracks how far the amenities rail has been scrolled.
  function initRail() {
    const rail = document.querySelector("[data-rail]");
    const marker = document.querySelector("[data-rail-marker]");
    if (!rail || !marker) return;
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      marker.style.setProperty("--p", (max > 0 ? rail.scrollLeft / max : 0).toFixed(3));
    };
    update();
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.querySelectorAll("[data-rail-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = rail.querySelector(".am-card");
        const distance = (card ? card.offsetWidth : rail.clientWidth * 0.8) + 24;
        rail.scrollBy({ left: Number(button.dataset.railStep) * distance, behavior: motionOk() ? "smooth" : "auto" });
      });
    });
  }

  function initForm() {
    const form = document.querySelector("[data-form]");
    const done = document.querySelector("[data-form-done]");
    if (!form || !done) return;
    const fail = form.querySelector("[data-form-fail]");
    const submit = form.querySelector('button[type="submit"]');
    const submitLabel = form.querySelector("[data-submit-label]");
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const PHONE = /^[+\d\s()-]{9,20}$/;
    const CHECKED = ["name", "email", "phone", "consent"];
    const field = (name) => form.elements.namedItem(name);
    const value = (name) => (field(name).value || "").trim();
    let sending = false;

    function check() {
      const errors = {};
      if (value("name").length < 2) errors.name = "Wpisz imię i nazwisko.";
      if (!EMAIL.test(value("email"))) errors.email = "Wpisz poprawny adres e-mail.";
      if (value("phone") && !PHONE.test(value("phone"))) errors.phone = "Numer może mieć cyfry, spacje i znak +.";
      if (!field("consent").checked) errors.consent = "Bez tej zgody nie możemy odpowiedzieć.";
      return errors;
    }

    function showError(name, message) {
      const wrap = form.querySelector(`[data-field="${name}"]`);
      const input = field(name);
      const error = document.getElementById(`f-${name}-error`);
      wrap.dataset.invalid = String(Boolean(message));
      input.setAttribute("aria-invalid", String(Boolean(message)));
      if (message) {
        error.textContent = message;
        error.hidden = false;
        input.setAttribute("aria-describedby", error.id);
      } else {
        error.hidden = true;
        input.removeAttribute("aria-describedby");
      }
    }

    for (const name of CHECKED) {
      field(name).addEventListener(name === "consent" ? "change" : "input", () => showError(name, ""));
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (sending) return;
      const errors = check();
      for (const name of CHECKED) showError(name, errors[name] || "");
      const first = CHECKED.find((name) => errors[name]);
      if (first) {
        field(first).focus();
        return;
      }

      const finish = () => {
        const firstName = value("name").split(/\s+/)[0];
        const floor = field("floor").value;
        done.querySelector("[data-done-title]").textContent = `Dziękujemy, ${firstName}.`;
        done.querySelector("[data-done-text]").textContent =
          `Odezwiemy się w ciągu jednego dnia roboczego, żeby ustalić termin prezentacji${floor ? ` na piętrze ${floor}` : ""}.`;
        form.hidden = true;
        done.hidden = false;
      };

      // Bots fill the hidden field; people never see it.
      if (value("firma")) {
        finish();
        return;
      }

      sending = true;
      submit.disabled = true;
      submitLabel.textContent = "Wysyłam";
      fail.hidden = true;
      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        finish();
      } catch {
        fail.textContent = "Nie udało się wysłać zgłoszenia. Spróbuj ponownie za chwilę.";
        fail.hidden = false;
      } finally {
        sending = false;
        submit.disabled = false;
        submitLabel.textContent = "Wyślij zgłoszenie";
      }
    });
  }

  initPicker();
  initRail();
  initForm();
})();
