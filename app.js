// ממשק השאלון והתוצאות
(function () {
  const V = window.VOCAB;
  const ROLES = window.ROLES.roles;
  const CH = window.QUESTIONS;
  const DATA = { roles: ROLES, vocab: V, placements: (window.PLACEMENTS || {}).placements || [] };
  const KEY = "sherut-compass-v1";
  const app = document.getElementById("app");

  // דוגמה מסומנת — בת שאוהבת נוער והדרכה, גרה בירושלים, רוצה לחזור הביתה ובלי שבתות
  const EXAMPLE = {
    year: "y1", age: "18", region: "jerusalem", kenan: "no",
    interests: { youth: 2, guiding: 2, tutoring: 2, kids: 1, emotional: 1, jewish: 1, community: 1, medicine: 0, tech: 0, security: 0, data: 0, admin: 0, media: 1, design: 0, outdoors: 1, animals: 0, emergency: 0, olim: 1, elderly: 0, special: 1 },
    pops: { teens: 2, atrisk: 1, elem: 1, early: 0, sn_kids: 1, sn_adults: 0, elderly: 0, patients: 0, olim: 1, families: 0, public: 0, none: 0 },
    people_computer: "people", group_indiv: "group", outdoor: "mix", physical: "ok", emo: "some",
    shabbat: "none", housing: "apt_near", evenings: "some", shifts: "day_only", intensity: "yes", garin: "yes",
    bagrut: "yes", math: "4", english: "4", english80: "no", science: [], langs: [], experience: ["guiding"],
    security: "no", years: "open", course: "yes", env_restrict: [], priorities: ["meaning", "social", "religious"],
  };

  let state = load() || { screen: "home", chapter: 0, answers: {}, example: false };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* אחסון חסום */ } }
  function go(patch) { state = { ...state, ...patch }; save(); render(); window.scrollTo({ top: 0 }); }

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const visible = (q, a) => !q.showIf || q.showIf.in.includes(a[q.showIf.q]);

  const COMPASS = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent)" stroke-width="2.5"/><path d="M20 7 L24 20 L20 33 L16 20 Z" fill="var(--sun)"/><path d="M20 7 L24 20 L16 20 Z" fill="var(--accent)"/></svg>`;

  // ---------- מסך פתיחה ----------
  function home() {
    const has = Object.keys(state.answers).length > 0 && !state.example;
    return `
      <header class="masthead">
        <span class="compass">${COMPASS}<span class="eyebrow">שירות לאומי · מחזור תשפ״ז</span></span>
        <h1>מצפן השירות</h1>
        <p>שאלון קצר שעוזר לבנות דתיות למצוא תחומים ותפקידים מתאימים בשירות הלאומי, לפי מה שמעניין אותך ולפי התנאים שחשובים לך: שבתות, דירה, משמרות, סיווג ביטחוני ועוד.</p>
      </header>
      <section class="panel">
        <div class="steps">
          <div><b>שבעה פרקים קצרים</b><span class="muted small">תחומי עניין, אנשים, תנאים, יכולות, דרישות מיוחדות וסדרי עדיפויות. כ-7 דקות.</span></div>
          <div><b>${ROLES.length} תפקידים מהקטלוג הרשמי</b><span class="muted small">כל התפקידים שמפרסמת רשות השירות הלאומי-אזרחי, ב-8 מערכים.</span></div>
          <div><b>תוצאה עם הסבר</b><span class="muted small">למה התפקיד מתאים, מה לברר בסיירת, ועל מה צריך להתפשר בחלופות.</span></div>
        </div>
        <div class="row">
          <button class="btn" id="start">${has ? "להמשיך מאיפה שעצרתי" : "להתחיל את השאלון"}</button>
          ${has ? `<button class="btn ghost" id="restart">להתחיל מחדש</button>` : ""}
          <button class="btn link" id="example">לראות תוצאות לדוגמה</button>
        </div>
      </section>
      ${footer()}`;
  }

  // ---------- שאלון ----------
  function quiz() {
    const ch = CH[state.chapter];
    const a = state.answers;
    const qs = ch.questions.filter((q) => visible(q, a));
    return `
      <div class="rail" aria-label="התקדמות">${CH.map((_, i) => `<span class="${i < state.chapter ? "done" : i === state.chapter ? "now" : ""}"></span>`).join("")}</div>
      <section class="panel">
        <div class="chapter-head">
          <span class="eyebrow">פרק ${state.chapter + 1} מתוך ${CH.length}</span>
          <h2>${esc(ch.title)}</h2>
          ${ch.intro ? `<p class="muted">${esc(ch.intro)}</p>` : ""}
        </div>
        ${qs.map((q) => question(q, a)).join("")}
      </section>
      <div class="nav">
        <button class="btn ghost" id="back">${state.chapter === 0 ? "למסך הפתיחה" : "הקודם"}</button>
        <button class="btn" id="next">${state.chapter === CH.length - 1 ? "לתוצאות" : "הבא"}</button>
      </div>
      <p class="help">אפשר לדלג על כל שאלה. שאלה שלא ענית עליה לא מורידה ניקוד לאף תפקיד. <span class="hard-tag">תנאי סף</span> מסמן שאלה שהתשובה עליה יכולה להוציא תפקיד מההתאמה הרגילה.</p>`;
  }

  function question(q, a) {
    const v = a[q.id];
    const hard = q.hard ? `<span class="hard-tag">תנאי סף</span>` : "";
    let body = "";
    if (q.type === "single" || q.type === "multi") {
      const multi = q.type === "multi";
      body = `<div class="opts" role="group">${q.options.map((o) => {
        const on = multi ? (v || []).includes(o.v) : v === o.v;
        return `<button class="opt" aria-pressed="${on}" data-q="${q.id}" data-v="${o.v}" data-multi="${multi}" data-max="${q.max || ""}">${esc(o.label)}</button>`;
      }).join("")}</div>`;
    } else if (q.type === "grid3") {
      const m = v || {};
      body = `<div class="grid3">${q.items.map((it) => `
        <div class="g-row"><span>${esc(it.label)}</span>
          <span class="seg" role="group" aria-label="${esc(it.label)}">${["לא בשבילי", "אולי", "מאוד"].map((l, i) =>
            `<button aria-pressed="${m[it.v] === i}" data-grid="${q.id}" data-item="${it.v}" data-v="${i}">${l}</button>`).join("")}</span>
        </div>`).join("")}</div>`;
    } else if (q.type === "roles") {
      const sel = v || [];
      body = `<div class="role-pick">${ROLES.filter((r) => r.gender !== "men").map((r) => `
        <label><input type="checkbox" id="kr-${r.id}" data-roles="${q.id}" value="${r.id}" ${sel.includes(r.id) ? "checked" : ""}>
        <span>${esc(r.name)} <span class="muted small">· ${r.arrays.map((k) => V.arrays[k]).join(" / ")}</span></span></label>`).join("")}</div>
        <span class="help">נבחרו ${sel.length} מתוך ${q.max}</span>`;
    }
    return `<div class="q"><div class="q-text">${esc(q.text)}${hard}</div>${body}${q.help ? `<p class="help">${esc(q.help)}</p>` : ""}</div>`;
  }

  // ---------- תוצאות ----------
  function results() {
    const a = state.example ? EXAMPLE : state.answers;
    const r = Engine.match(a, DATA);
    const topArrays = r.arrays.filter((x) => x.score > 0).slice(0, 5);
    const main = r.main.slice(0, 12);
    return `
      <header class="masthead">
        <span class="compass">${COMPASS}<span class="eyebrow">${state.example ? "תוצאות לדוגמה" : "התוצאות שלך"}</span></span>
        <h1>${state.example ? "כך נראות תוצאות" : "התפקידים שהכי מתאימים לך"}</h1>
        ${state.example ? `<p class="banner">זו דוגמה למועמדת מירושלים שאוהבת נוער והדרכה, מעדיפה לגור קרוב לבית, לא רוצה שבתות ולא מתעניינת בביטחון. אלה לא התשובות שלך.</p>` : ""}
      </header>

      <section class="summary">
        <div class="panel">
          <h3>התחומים המובילים</h3>
          <div class="bars">${topArrays.map((x) => `
            <div class="bar"><span>${esc(x.label)}</span><span class="track"><span class="fill" style="width:${x.score}%"></span></span><span class="num">${x.score}</span></div>`).join("")}
          </div>
          <p class="help">ציון תחום הוא ממוצע שלושת התפקידים המתאימים ביותר בו.</p>
        </div>
        <div class="panel">
          <h3>מועדים שחשוב לדעת</h3>
          <div class="timeline">${r.timeline.map((t) => `
            <div class="tl"><span class="date">${esc(t.date)}</span><span><b>${esc(t.label)}</b><br><span class="muted small">${esc(t.note)}${t.roles.length ? ` רלוונטי ל: ${t.roles.map(esc).join(", ")}.` : ""}</span></span></div>`).join("")}
          </div>
        </div>
      </section>

      ${r.notes.length ? `<section class="panel"><h3>לפני שממשיכים</h3><ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section>` : ""}

      <section class="cards">
        <div class="section-head"><h2>התאמות</h2><p class="muted small">${r.main.length} תפקידים עומדים בתנאי הסף שלך. מוצגים ${main.length} המובילים.</p></div>
        ${main.map((x) => card(x, false)).join("") || `<p class="muted">לא נמצאו תפקידים שעומדים בכל תנאי הסף. כדאי לעבור לחלופות למטה.</p>`}
      </section>

      ${r.alternatives.length ? `
      <section class="cards">
        <div class="section-head"><h2>חלופות שדורשות פשרה</h2><p class="muted small">תפקידים שמתאימים לך בתחום ובאופי, אבל לא עומדים באחד או שניים מהתנאים שסימנת. כדאי לשקול אם אפשר להתגמש.</p></div>
        ${r.alternatives.map((x) => card(x, true)).join("")}
      </section>` : ""}

      <div class="nav">
        <button class="btn ghost" id="edit">${state.example ? "חזרה" : "לשנות תשובות"}</button>
        <button class="btn" id="${state.example ? "start-real" : "restart"}">${state.example ? "למלא את השאלון בעצמי" : "להתחיל מחדש"}</button>
      </div>
      ${footer()}`;
  }

  function card(x, alt) {
    const role = x.role;
    const chips = [
      ...role.arrays.map((k) => `<span class="chip">${esc(V.arrays[k])}</span>`),
      x.status === "conditional" ? `<span class="chip warn">לבדוק ${x.checks.length} ${x.checks.length === 1 ? "דבר" : "דברים"}</span>` : "",
      x.status === "match" ? `<span class="chip good">עומד בתנאים שסימנת</span>` : "",
      alt ? `<span class="chip bad">דורש פשרה</span>` : "",
      role.house.includes("home") ? `<span class="chip">אפשר מהבית</span>` : `<span class="chip">דירת שירות${role.house.includes("onsite") ? " / פנימייה" : ""}</span>`,
      role.clr === 2 ? `<span class="chip">סיווג ביטחוני</span>` : "",
      role.y2 === 2 ? `<span class="chip">שנתיים</span>` : "",
    ].join("");
    const places = x.placements.slice(0, 3);
    return `
      <article class="card">
        <div class="card-head">
          <span class="score ${alt ? "alt" : ""}" aria-label="ציון התאמה ${x.score}">${x.score}</span>
          <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
            <h3>${esc(role.name)}</h3>
            <div class="chips">${chips}</div>
          </div>
        </div>
        <p class="small">${esc(role.summary)}</p>
        ${alt ? `<ul class="list cons">${x.conflicts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
        ${x.pros.length ? `<ul class="list pros">${x.pros.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
        ${x.cons.length ? `<ul class="list cons">${x.cons.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
        ${x.checks.length ? `<ul class="list checks">${x.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
        <details>
          <summary>פרטים על התפקיד${places.length ? " ומקומות לדוגמה" : ""}</summary>
          <div class="detail">
            ${role.locations ? `<p><b>איפה משרתים:</b> ${esc(role.locations)}</p>` : ""}
            ${role.duties.length ? `<div><b>מה עושים:</b><ul class="list">${role.duties.slice(0, 6).map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}
            ${role.hours_text.length ? `<p><b>שעות:</b> ${esc(role.hours_text[0])}</p>` : ""}
            ${role.shabbat_text.length ? `<p><b>שבת:</b> ${esc(role.shabbat_text[0])}</p>` : ""}
            ${role.housing_text.length ? `<p><b>מגורים:</b> ${esc(role.housing_text[role.housing_text.length - 1])}</p>` : ""}
            ${role.threshold.length ? `<p><b>תנאי סף:</b> ${esc(role.threshold.join(" "))}</p>` : ""}
            ${role.train ? `<p><b>הכשרה:</b> ${esc(role.train)}</p>` : ""}
            ${role.note ? `<p><b>לתשומת לב:</b> ${esc(role.note)}</p>` : ""}
            <p><a href="${esc(role.url)}" target="_blank" rel="noopener">דף התפקיד באתר הרשות</a></p>
            ${places.length ? `<div><b>מקומות שירות לדוגמה</b> <span class="muted small">(לא אומתה זמינות. יש לבדוק מול העמותה)</span>
              ${places.map((p) => `<div class="place"><span><b>${esc(p.site)}</b>${p.city ? ` · ${esc(p.city)}` : ""}</span>
                <span class="muted">${esc(p.organization)}${p.housing_label ? ` · ${esc(p.housing_label)}` : ""}</span>
                ${p.source_url ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">מקור</a>` : ""}</div>`).join("")}
            </div>` : ""}
          </div>
        </details>
      </article>`;
  }

  function footer() {
    return `<footer class="footer">
      <span>הנתונים: קטלוג התפקידים של רשות השירות הלאומי-אזרחי (ncs.gov.il), נבדק ב-${esc(window.ROLES.checked_at)}. מועדים: לוחות הזמנים שפרסמו עמותות השירות למחזור תשפ״ז.</span>
      <span>הכלי מכוון ולא משבץ. השיבוץ בפועל נעשה דרך הגופים המוכרים, ובשנה א׳ במסלול הכללי לפי רשימת התפקידים שמתקבלת במיוני קינן שפי.</span>
    </footer>`;
  }

  // ---------- אירועים ----------
  function bind() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    on("start", () => go({ screen: "quiz", example: false }));
    on("start-real", () => go({ screen: "quiz", chapter: 0, example: false }));
    on("restart", () => go({ screen: "quiz", chapter: 0, answers: {}, example: false }));
    on("example", () => go({ screen: "results", example: true }));
    on("edit", () => go(state.example ? { screen: "home", example: false } : { screen: "quiz", chapter: 0 }));
    on("back", () => go(state.chapter === 0 ? { screen: "home" } : { chapter: state.chapter - 1 }));
    on("next", () => go(state.chapter === CH.length - 1 ? { screen: "results" } : { chapter: state.chapter + 1 }));

    app.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
      const { q, v, multi, max } = b.dataset;
      const a = { ...state.answers };
      if (multi === "true") {
        const cur = new Set(a[q] || []);
        if (cur.has(v)) cur.delete(v);
        else { if (max && cur.size >= Number(max)) return; cur.add(v); }
        a[q] = [...cur];
      } else a[q] = a[q] === v ? undefined : v;
      state.answers = a; save(); rerenderKeepScroll();
    }));
    app.querySelectorAll("[data-grid]").forEach((b) => b.addEventListener("click", () => {
      const { grid, item, v } = b.dataset;
      const m = { ...(state.answers[grid] || {}) };
      if (m[item] === Number(v)) delete m[item]; else m[item] = Number(v);
      state.answers = { ...state.answers, [grid]: m }; save(); rerenderKeepScroll();
    }));
    app.querySelectorAll("[data-roles]").forEach((c) => c.addEventListener("change", () => {
      const q = c.dataset.roles;
      const cur = new Set(state.answers[q] || []);
      if (c.checked) { if (cur.size >= 6) { c.checked = false; return; } cur.add(c.value); } else cur.delete(c.value);
      state.answers = { ...state.answers, [q]: [...cur] }; save(); rerenderKeepScroll();
    }));
  }

  function rerenderKeepScroll() {
    const y = window.scrollY;
    const pick = app.querySelector(".role-pick");
    const py = pick ? pick.scrollTop : 0;
    const f = document.activeElement && document.activeElement.dataset;
    const sel = f && (f.q ? `[data-q="${f.q}"][data-v="${f.v}"]` : f.grid ? `[data-grid="${f.grid}"][data-item="${f.item}"][data-v="${f.v}"]` : f.roles ? `#${document.activeElement.id}` : null);
    render();
    if (sel) { const el = app.querySelector(sel); if (el) el.focus({ preventScroll: true }); }
    window.scrollTo({ top: y });
    const pick2 = app.querySelector(".role-pick");
    if (pick2) pick2.scrollTop = py;
  }

  function render() {
    app.innerHTML = state.screen === "quiz" ? quiz() : state.screen === "results" ? results() : home();
    bind();
  }
  render();
})();
