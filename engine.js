// מנוע ההתאמה: תנאי סף ← ניקוד משוקלל ← חלופות.
// עקרונות:
//  1. תנאי סף נבדקים בנפרד; ציון גבוה לא עוקף פסילה.
//  2. פרט שלא נשאל או לא ידוע לא מוריד ציון — רכיב בלי מידע לא נכנס לממוצע.
//  3. תכונות שמשתנות בין תקנים (שבת, דיור) מסומנות "לבדיקה" ולא נפסלות סתם.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const WEIGHTS = { interests: 25, style: 20, population: 15, conditions: 20, location: 10, skills: 10 };
  const RATING = [0, 0.55, 1]; // לא בשבילי / אולי / מאוד
  const UNRATED = 0.3; // פריט שלא דורג, כשהמועמדת דירגה פריטים אחרים באותה שאלה

  // דירוג פריט בשאלת grid3; null = השאלה כולה לא נענתה
  function rating(map, k) {
    if (!map || Object.keys(map).length < 3) return map && map[k] !== undefined ? RATING[map[k]] : null;
    return map[k] !== undefined ? RATING[map[k]] : UNRATED;
  }

  const has = (a, x) => Array.isArray(a) && a.includes(x);
  const answered = (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // ---------- תנאי סף ----------
  // מחזיר { conflicts: [...], checks: [...], excluded: string|null }
  function hardFilter(role, a, V) {
    const conflicts = []; // דורש פשרה של המועמדת
    const checks = []; // תלוי בתקן — לברר בסיירת
    let excluded = null; // לא רלוונטי בכלל

    if (role.gender === "men") excluded = "התפקיד מוגדר באתר הרשות לגברים בלבד";

    if (a.year === "y1" && a.kenan === "yes" && answered(a.kenan_roles) && !has(a.kenan_roles, role.id))
      excluded = excluded || "לא מופיע ברשימת 6 התפקידים שקיבלת מקינן שפי";

    // שבת
    const shabLimit = { none: 0, rare: 1, some: 2, any: 3 }[a.shabbat];
    if (shabLimit !== undefined && role.shab) {
      if (role.shab === 2 && shabLimit === 0) conflicts.push("התפקיד כולל שבתות במקום השירות");
      else if (role.shab === 2 && shabLimit === 1) checks.push("שבתות: בתפקיד הזה נשארים לרוב אחת לשבועיים. לבדוק אם יש תקן עם פחות שבתות");
      else if (role.shab === 1 && shabLimit < 3) checks.push("שבתות: בחלק מהמקומות יש שבתות. לוודא בתקן הספציפי");
    }

    // מגורים
    const allowed = {
      home_only: ["home"], apt_near: ["home", "apt"], apt_any: ["home", "apt"], onsite_ok: ["home", "apt", "onsite"],
    }[a.housing];
    if (allowed) {
      const ok = role.house.filter((h) => allowed.includes(h));
      if (!ok.length) {
        const what = role.house.includes("onsite") ? "מגורים בפנימייה או בדירת שירות" : "מגורים בדירת שירות";
        conflicts.push(`התפקיד דורש ${what}`);
      } else if (a.housing === "home_only" && !role.house.includes("home")) {
        conflicts.push("התפקיד לא מתבצע מהבית");
      }
    }
    // אזור — תפקיד שקיים רק באזורים מסוימים
    if (role.regions && a.region && !role.regions.includes(a.region)) {
      const regionNames = role.regions.map((r) => V.regions[r]).join(", ");
      if (a.housing === "home_only") conflicts.push(`התפקיד קיים רק ב: ${regionNames}`);
      else checks.push(`התפקיד קיים רק ב: ${regionNames}`);
    }

    // משמרות
    if (a.shifts === "day_only") {
      if (role.shifts === 2) conflicts.push("התפקיד מתבצע במשמרות");
      else if (role.shifts === 1) checks.push("בחלק מהמקומות עובדים במשמרות");
    }
    if (a.shifts !== "nights_ok" && answered(a.shifts)) {
      if (role.nights === 2) conflicts.push("כולל משמרות לילה");
      else if (role.nights === 1) checks.push("בחלק מהמקומות יש משמרות לילה");
    }

    // סיווג ביטחוני
    const clearanceNo = a.security === "no" || a.clearance === "no";
    if (role.clr === 2) {
      if (clearanceNo) conflicts.push("נדרש סיווג ביטחוני");
      else if (a.clearance === "unsure") checks.push("נדרש סיווג ביטחוני");
    } else if (role.clr === 1 && (clearanceNo || a.clearance === "unsure")) {
      checks.push("בחלק מהמקומות נדרש סיווג ביטחוני. לחפש תקן בלי סיווג");
    }

    // משך שירות
    const oneYear = a.years === "one" || a.age === "23";
    if (role.y2 === 2 && oneYear)
      conflicts.push(a.age === "23" ? "דורש שנתיים, ומגיל 23 אפשר לשרת שנה אחת" : "דורש התחייבות לשנתיים");
    else if (role.y2 === 1 && oneYear) checks.push("בחלק מהמקומות נדרשת או מועדפת התחייבות לשנתיים");

    // הסתייגויות משפחה/רב
    for (const e of role.env) {
      if (has(a.env_restrict, e)) conflicts.push(`סוג מקום שסימנת שלא מתאים: ${V.env[e]}`);
      if (e === "police" && has(a.env_restrict, "security_body")) conflicts.push(`סוג מקום שסימנת שלא מתאים: ${V.env.security_body}`);
    }
    if (role.env.includes("uniform") && a.security === "no") conflicts.push("תפקיד ביטחוני-מבצעי");
    if (role.clr === 2 && a.security === "no" && !conflicts.some((c) => c.includes("ביטחוני")))
      conflicts.push("תפקיד ביטחוני");

    // תנאי סף לימודיים וגיל
    for (const p of role.pre) {
      const r = prereq(p, a);
      if (r === false) conflicts.push(`תנאי סף: ${V.prereq[p]}`);
      else if (r === null) checks.push(`תנאי סף: ${V.prereq[p]}`);
    }
    for (const p of role.pre_p) {
      if (prereq(p, a) !== true) checks.push(`בחלק מהמקומות: ${V.prereq[p]}`);
    }
    if (role.train && a.course === "no") conflicts.push(`כולל ${role.train}`);

    return { conflicts: [...new Set(conflicts)], checks: [...new Set(checks)], excluded };
  }

  // true = עומדת, false = לא עומדת, null = לא ידוע
  function prereq(p, a) {
    const n = (x) => (x === "unknown" || !answered(x) ? null : Number(x));
    const math = n(a.math), eng = n(a.english);
    const sci = a.science || [];
    switch (p) {
      case "math4": return math === null ? null : math >= 4;
      case "eng_high": return eng === null ? null : eng >= 5;
      case "eng4_80":
      case "eng5_80": {
        const need = p === "eng5_80" ? 5 : 4;
        if (eng === null) return null;
        if (eng < need) return false;
        return a.english80 === "yes" ? true : a.english80 === "no" ? false : null;
      }
      case "sci5": return answered(a.science) ? has(sci, "sci5") : null;
      case "sci4": return answered(a.science) ? has(sci, "sci5") || has(sci, "sci4") : null;
      case "real_track": return answered(a.science) ? has(sci, "real_track") || has(sci, "sci5") : null;
      case "bagrut_full": return a.bagrut === "yes" ? true : a.bagrut === "no" ? false : null;
      case "age18": return a.age === "17" ? false : answered(a.age) ? true : null;
      case "age17_5": return a.age === "17" ? null : answered(a.age) ? true : null;
      case "lang_extra": return answered(a.langs) ? true : null;
      case "guiding_exp": return has(a.experience, "guiding") ? true : null;
      case "writing": return has(a.experience, "writing") ? true : null;
      default: return null;
    }
  }

  // ---------- ניקוד ----------
  function scoreInterests(role, a) {
    if (!a.interests || !Object.keys(a.interests).length || !role.i.length) return null;
    let sum = 0, w = 0, primaryVeto = false;
    role.i.forEach((k, idx) => {
      const r = rating(a.interests, k);
      if (r === null) return;
      const weight = idx === 0 ? 1.4 : idx === 1 ? 1 : 0.6;
      sum += r * weight;
      w += weight;
      if (idx === 0 && a.interests[k] === 0) primaryVeto = true;
    });
    if (!w) return null;
    const s = sum / w;
    return primaryVeto ? s * 0.5 : s;
  }

  function scorePopulation(role, a) {
    if (!a.pops || !Object.keys(a.pops).length || !role.p.length) return null;
    const vals = role.p.map((k) => rating(a.pops, k)).filter((x) => x !== null);
    if (!vals.length) return null;
    // אוכלוסייה מרכזית (הראשונה) נחשבת יותר
    const first = rating(a.pops, role.p[0]);
    const best = Math.max(...vals);
    return first !== null ? 0.6 * first + 0.4 * best : best;
  }

  function scoreStyle(role, a) {
    const s = role.s || {};
    const parts = [];
    const lvl = (x) => (x || 0) / 2;
    if (answered(a.people_computer)) {
      const peopleness = (lvl(s.people) + (1 - lvl(s.computer))) / 2;
      const want = { people: 1, mix: 0.5, computer: 0 }[a.people_computer];
      parts.push(1 - Math.abs(peopleness - want));
    }
    if (answered(a.group_indiv) && (s.group || s.indiv)) {
      const groupness = (lvl(s.group) + (1 - lvl(s.indiv))) / 2;
      const want = { group: 1, mix: 0.5, indiv: 0 }[a.group_indiv];
      parts.push(a.group_indiv === "mix" ? 0.85 : 1 - Math.abs(groupness - want));
    }
    if (answered(a.outdoor)) {
      const f = lvl(s.field);
      parts.push({ outdoor: 0.4 + 0.6 * f, mix: 0.85, indoor: 1 - 0.7 * f }[a.outdoor]);
    }
    if (answered(a.physical)) {
      const ph = lvl(s.physical);
      parts.push({ yes: 0.6 + 0.4 * ph, ok: 1 - 0.2 * ph, no: 1 - 0.8 * ph }[a.physical]);
    }
    if (answered(a.emo)) {
      const e = (role.emo || 0) / 2;
      parts.push({ high: 0.5 + 0.5 * e, some: 1 - 0.4 * e, low: 1 - 0.9 * e }[a.emo]);
    }
    return avg(parts);
  }

  function scoreConditions(role, a) {
    const parts = [];
    if (answered(a.evenings)) {
      const e = (role.eve || 0) / 2;
      parts.push({ no: 1 - 0.8 * e, some: 1 - 0.35 * e, yes: 1 }[a.evenings]);
    }
    if (answered(a.intensity)) {
      const i = (role.int || 0) / 2;
      parts.push(a.intensity === "yes" ? 0.7 + 0.3 * i : 1 - 0.7 * i);
    }
    if (answered(a.shabbat) && role.shab) {
      const lim = { none: 0, rare: 1, some: 2, any: 3 }[a.shabbat];
      parts.push(lim >= 2 ? 1 : role.shab === 1 ? 0.6 : 0.3);
    }
    if (answered(a.shifts) && role.shifts) {
      parts.push(a.shifts === "day_only" ? (role.shifts === 1 ? 0.6 : 0.2) : 1);
    }
    if (answered(a.years) && role.y2) {
      parts.push(a.years === "two" ? 1 : a.years === "open" ? 0.85 : 0.5);
    }
    return avg(parts);
  }

  function scoreLocation(role, a) {
    const parts = [];
    if (answered(a.housing)) {
      const home = role.house.includes("home");
      parts.push({ home_only: home ? 1 : 0.2, apt_near: home ? 1 : 0.6, apt_any: 1, onsite_ok: 1 }[a.housing]);
    }
    if (answered(a.garin)) {
      parts.push(role.garin ? { yes: 1, maybe: 0.85, no: 0.75 }[a.garin] : { yes: 0.55, maybe: 0.75, no: 0.8 }[a.garin]);
    }
    if (role.regions && a.region) parts.push(role.regions.includes(a.region) ? 1 : 0.4);
    return avg(parts);
  }

  function scoreSkills(role, a) {
    const parts = [];
    const exp = a.experience || [];
    if (role.i.includes("guiding")) parts.push(has(exp, "guiding") ? 1 : 0.6);
    if (role.i.includes("tech") || role.i.includes("data")) {
      const m = Number(a.math) || 0, e = Number(a.english) || 0;
      parts.push(Math.min(1, 0.3 + (has(exp, "computers") ? 0.35 : 0) + (m >= 5 ? 0.2 : m >= 4 ? 0.1 : 0) + (e >= 5 ? 0.15 : 0)));
    }
    if (role.i.includes("olim")) parts.push(answered(a.langs) ? 1 : 0.4);
    if (role.i.includes("media") || role.pre.includes("writing")) parts.push(has(exp, "writing") ? 1 : 0.6);
    if (role.i.includes("design")) parts.push(has(exp, "design") ? 1 : 0.5);
    if (role.i.includes("emergency") || role.i.includes("medicine")) if (has(exp, "firstaid")) parts.push(1);
    if (role.p.includes("atrisk") || role.i.includes("community")) if (has(exp, "volunteer")) parts.push(1);
    return avg(parts);
  }

  // התאמות לפי סדרי עדיפויות — שינוי משקלות ובונוס קטן
  function priorityAdjust(role, a) {
    const pr = a.priorities || [];
    const w = { ...WEIGHTS };
    let bonus = 0;
    const reasons = [];
    if (pr.includes("near_home")) w.location += 10;
    if (pr.includes("hours")) w.conditions += 10;
    if (pr.includes("career") && (role.train || role.arrays.includes("tech") || role.pre.length >= 2)) {
      bonus += 4; reasons.push("נותן ניסיון מקצועי או הכשרה");
    }
    if (pr.includes("social") && role.garin) { bonus += 3; reasons.push("אפשרות לגרעין"); }
    if (pr.includes("meaning") && (role.emo >= 1 || role.arrays.includes("welfare"))) { bonus += 3; reasons.push("תפקיד עם נתינה ישירה"); }
    if (pr.includes("challenge") && (role.int >= 2 || role.clr === 2 || role.emo >= 2)) { bonus += 3; reasons.push("תפקיד מאתגר עם אחריות"); }
    if (pr.includes("religious") && (role.i.includes("jewish") || role.arrays.includes("education"))) { bonus += 3; reasons.push("סביבה חינוכית-תורנית אפשרית"); }
    if ((a.explore || []).some((x) => role.arrays.includes(x))) { bonus += 4; reasons.push("בתחום שרצית להכיר"); }
    return { w, bonus, reasons };
  }

  function explain(role, a, V, comps) {
    const pros = [];
    const topI = role.i.filter((k) => a.interests && a.interests[k] === 2).map((k) => V.interests[k]);
    if (topI.length) pros.push(`מתאים למה שמעניין אותך: ${topI.slice(0, 3).join(", ")}`);
    const topP = role.p.filter((k) => a.pops && a.pops[k] === 2).map((k) => V.populations[k]);
    if (topP.length) pros.push(`עבודה עם ${topP.slice(0, 2).join(", ")}`);
    if (comps.style !== null && comps.style >= 0.8) pros.push("אופי העבודה מתאים להעדפות שלך");
    if (a.housing === "home_only" && role.house.includes("home")) pros.push("אפשר לשרת מהבית");
    if (role.garin && a.garin === "yes") pros.push("יש אפשרות לגרעין");
    const cons = [];
    const lowI = role.i.slice(0, 1).filter((k) => a.interests && a.interests[k] === 0).map((k) => V.interests[k]);
    if (lowI.length) cons.push(`התחום המרכזי (${lowI[0]}) סומן אצלך כ"לא בשבילי"`);
    if (a.emo === "low" && role.emo === 2) cons.push("כולל עומס רגשי גבוה");
    if (a.evenings === "no" && role.eve === 2) cons.push("כולל פעילות אחר הצהריים וערב");
    if (a.physical === "no" && (role.s.physical || 0) === 2) cons.push("עבודה פיזית");
    return { pros, cons };
  }

  function scoreRole(role, a, V) {
    const comps = {
      interests: scoreInterests(role, a),
      style: scoreStyle(role, a),
      population: scorePopulation(role, a),
      conditions: scoreConditions(role, a),
      location: scoreLocation(role, a),
      skills: scoreSkills(role, a),
    };
    const { w, bonus, reasons } = priorityAdjust(role, a);
    let sum = 0, wsum = 0;
    for (const [k, v] of Object.entries(comps)) {
      if (v === null) continue;
      sum += v * w[k];
      wsum += w[k];
    }
    const base = wsum ? (sum / wsum) * 100 : 50;
    const score = Math.max(0, Math.min(100, Math.round(base + bonus)));
    const ex = explain(role, a, V, comps);
    return { score, comps, pros: [...ex.pros, ...reasons], cons: ex.cons };
  }

  // ---------- תקנים ----------
  function placementsFor(role, a, V, placements) {
    const regionOk = (p) => {
      if (!a.region || !p.region) return true;
      if (p.region === a.region) return true;
      if (a.housing === "home_only") return false;
      if (a.housing === "apt_near") return (V.near[a.region] || []).includes(p.region);
      return true;
    };
    const housingOk = (p) => !(a.housing === "home_only" && p.housing === "apt_only");
    const shabOk = (p) => !(a.shabbat === "none" && p.shabbat_per_month > 0);
    return placements
      .filter((p) => p.role_id === role.id)
      .map((p) => ({ ...p, _fit: (regionOk(p) ? 2 : 0) + (housingOk(p) ? 1 : 0) + (shabOk(p) ? 1 : 0) }))
      .filter((p) => p._fit >= 3)
      .sort((x, y) => y._fit - x._fit || (x.region === a.region ? -1 : 1));
  }

  // ---------- ראשי ----------
  function match(answers, data) {
    const { roles, vocab: V, placements = [] } = data;
    const results = roles.map((role) => {
      const hard = hardFilter(role, answers, V);
      const sc = scoreRole(role, answers, V);
      let status = "match";
      if (hard.excluded) status = "excluded";
      else if (hard.conflicts.length) status = "alternative";
      else if (hard.checks.length) status = "conditional";
      return { role, status, ...sc, ...hard, placements: placementsFor(role, answers, V, placements) };
    });

    const byScore = (x, y) => y.score - x.score;
    const main = results.filter((r) => r.status === "match" || r.status === "conditional").sort(byScore);
    // חלופה = ציון גבוה אבל דורשת פשרה אחת או שתיים
    const alternatives = results
      .filter((r) => r.status === "alternative" && r.conflicts.length <= 2)
      .sort((x, y) => x.conflicts.length - y.conflicts.length || byScore(x, y))
      .filter((r) => r.score >= 60)
      .slice(0, 6);
    const excluded = results.filter((r) => r.status === "excluded");

    // ציון תחום = ממוצע 3 התפקידים הטובים בתחום (מתוך הרלוונטיים)
    const arrays = Object.keys(V.arrays).map((k) => {
      const top = main.filter((r) => r.role.arrays.includes(k)).slice(0, 3);
      return { key: k, label: V.arrays[k], score: top.length ? Math.round(avg(top.map((r) => r.score))) : 0, count: main.filter((r) => r.role.arrays.includes(k)).length };
    }).sort((x, y) => y.score - x.score);

    // מועדים רלוונטיים לתפקידים המובילים
    const top = main.slice(0, 10);
    const early = [...new Set(top.map((r) => r.role.early).filter(Boolean))];
    const timeline = [...early, "general"].map((k) => ({ key: k, ...V.timeline[k], roles: top.filter((r) => r.role.early === k).map((r) => r.role.name) }));

    const notes = [];
    if (answers.year === "y2") notes.push("בשנה ב׳ אין צורך במיוני קינן שפי ואין חובה להשתבץ לפי רשימת התפקידים. אפשר גם לשקול שליחות בחו״ל, שפתוחה רק אחרי שנה בארץ.");
    if (answers.year === "y1" && answers.kenan === "no") notes.push("בשנה א׳ במסלול הכללי אפשר להגיש מועמדות רק ל-6 התפקידים שתקבלי במיוני קינן שפי. בשאלון ההעדפות של המיונים כדאי לבחור את התפקידים המובילים כאן.");
    if (answers.shabbat === "none") notes.push("שבתות נקבעות ברמת התקן, לא ברמת התפקיד. גם בתפקיד שמוצג כאן כדאי לשאול בסיירת כמה שבתות יש.");
    if (answers.age === "23") notes.push("לפי עמותת שילה, מגיל 23 אפשר לשרת 12 חודשים בלבד. יש מקורות שכותבים גיל אחר, לכן כדאי לוודא מול העמותה.");

    return { main, alternatives, excluded, arrays, timeline, notes };
  }

  return { match, hardFilter, scoreRole, prereq, WEIGHTS };
});
