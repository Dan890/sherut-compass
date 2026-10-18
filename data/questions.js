// השאלון. סוגי שאלות:
//   single  — בחירה אחת          multi — בחירה מרובה (max אופציונלי)
//   grid3   — דירוג כל פריט: 0 לא בשבילי / 1 אולי / 2 מאוד
//   roles   — בחירת תפקידים מהקטלוג (רשימת 6 התפקידים מקינן שפי)
// hard: true  → התשובה משמשת כתנאי סף (פוסלת או מתנה), לא רק לניקוד.
// showIf: { q, in: [...] } → השאלה מוצגת רק אם התשובה לשאלה q היא אחת מהערכים.
(function () {
  const V = window.VOCAB;
  const toItems = (obj) => Object.entries(obj).map(([v, label]) => ({ v, label }));

  window.QUESTIONS = [
    {
      id: "intro",
      title: "נתחיל מהבסיס",
      intro: "כמה פרטים שקובעים אילו מסלולים פתוחים בפנייך.",
      questions: [
        { id: "year", type: "single", hard: true, text: "לאיזו שנת שירות את מחפשת מקום?",
          options: [{ v: "y1", label: "שנה א׳" }, { v: "y2", label: "שנה ב׳" }] },
        { id: "age", type: "single", hard: true, text: "מה יהיה גילך בתחילת השירות?",
          options: [{ v: "17", label: "17" }, { v: "18", label: "18-22" }, { v: "23", label: "23" }],
          help: "חלק מתפקידי הבריאות פתוחים רק מגיל 18. מגיל 23 אפשר לשרת שנה אחת בלבד." },
        { id: "region", type: "single", hard: true, text: "איפה את גרה?", options: toItems(V.regions) },
        { id: "kenan", type: "single", text: "כבר עשית את מיוני קינן שפי וקיבלת רשימה של 6 תפקידים?",
          showIf: { q: "year", in: ["y1"] },
          options: [{ v: "yes", label: "כן, יש לי רשימה" }, { v: "no", label: "עוד לא" }, { v: "exempt", label: "אני פטורה (עולה, מסלול מיוחד)" }],
          help: "בשנה א׳ במסלול הכללי אפשר להגיש מועמדות רק לתפקידים שברשימה. אם אין לך רשימה עדיין, השאלון יעזור לך לדעת מה לבקש." },
        { id: "kenan_roles", type: "roles", hard: true, max: 6, text: "סמני את התפקידים שקיבלת ברשימה",
          showIf: { q: "kenan", in: ["yes"] } },
      ],
    },
    {
      id: "interests",
      title: "פרק א׳ — מה מושך אותך",
      intro: "אין צורך לדעת שמות של תפקידים. דרגי כל כיוון לפי התחושה.",
      questions: [
        { id: "interests", type: "grid3", text: "כמה כל אחד מהכיוונים האלה מעניין אותך?", items: toItems(V.interests) },
        { id: "explore", type: "multi", text: "יש תחום שאת לא בטוחה לגביו אבל רוצה להכיר? (לא חובה)",
          options: toItems(V.arrays) },
      ],
    },
    {
      id: "people",
      title: "פרק ב׳ — אנשים וסביבת עבודה",
      questions: [
        { id: "pops", type: "grid3", text: "עם מי היית רוצה לעבוד?", items: toItems(V.populations) },
        { id: "people_computer", type: "single", text: "מה מתאים לך יותר?",
          options: [{ v: "people", label: "רוב היום עם אנשים" }, { v: "mix", label: "שילוב" }, { v: "computer", label: "רוב היום מול מחשב או מסמכים" }] },
        { id: "group_indiv", type: "single", text: "ובעבודה עם אנשים?",
          options: [{ v: "group", label: "להדריך ולהוביל קבוצה" }, { v: "mix", label: "גם וגם" }, { v: "indiv", label: "קשר אישי עם אדם אחד או שניים" }] },
        { id: "outdoor", type: "single", text: "איפה נוח לך לעבוד?",
          options: [{ v: "outdoor", label: "בשטח, בתנועה, בחוץ" }, { v: "mix", label: "לא משנה" }, { v: "indoor", label: "במקום קבוע: כיתה, משרד, מחלקה" }] },
        { id: "physical", type: "single", text: "עבודה פיזית (הרמה, עמידה ממושכת, טיפול גופני)?",
          options: [{ v: "yes", label: "אוהבת" }, { v: "ok", label: "בסדר" }, { v: "no", label: "מעדיפה שלא" }] },
        { id: "emo", type: "single", text: "איך את עם תכנים רגשיים קשים (מחלה, משבר, נוער בסיכון)?",
          options: [{ v: "high", label: "זה בדיוק המקום שלי" }, { v: "some", label: "במידה" }, { v: "low", label: "מעדיפה להימנע" }] },
      ],
    },
    {
      id: "conditions",
      title: "פרק ג׳ — תנאים ואורח חיים",
      intro: "כאן חשוב להבדיל בין מה שבאמת לא אפשרי לבין מה שפחות נוח.",
      questions: [
        { id: "shabbat", type: "single", hard: true, text: "שבתות במקום השירות: מה המקסימום שמתאים לך?",
          options: [{ v: "none", label: "אף שבת" }, { v: "rare", label: "עד שבת בחודש" }, { v: "some", label: "עד שבת בשבועיים" }, { v: "any", label: "לא מגביל אותי" }],
          help: "אין כלל רשמי לפי סוג מקום. מספר השבתות נקבע בכל תקן, ובודקים אותו בסיירת." },
        { id: "housing", type: "single", hard: true, text: "איפה תגורי בשנת השירות?",
          options: [{ v: "home_only", label: "רק בבית" }, { v: "apt_near", label: "בבית או בדירת שירות קרובה" },
                    { v: "apt_any", label: "גם בדירת שירות רחוקה" }, { v: "onsite_ok", label: "גם במקום השירות (פנימייה)" }],
          help: "דירת שירות מגיעה בדרך כלל למי שמשרתת רחוק מהבית (לפי עמותת שילה, מ-60 ק\"מ ומעלה)." },
        { id: "evenings", type: "single", text: "פעילות אחר הצהריים וערב?",
          options: [{ v: "no", label: "מעדיפה לסיים בצהריים" }, { v: "some", label: "לפעמים זה בסדר" }, { v: "yes", label: "אין בעיה" }] },
        { id: "shifts", type: "single", hard: true, text: "משמרות?",
          options: [{ v: "day_only", label: "רק שעות קבועות" }, { v: "shifts_ok", label: "משמרות בוקר וערב" }, { v: "nights_ok", label: "גם לילות" }] },
        { id: "intensity", type: "single", text: "שירות אינטנסיבי עם שעות מרובות?",
          options: [{ v: "yes", label: "מתאים לי" }, { v: "no", label: "מעדיפה מסגרת רגועה" }] },
        { id: "garin", type: "single", text: "גרעין (קבוצת בנות שירות שגרות ופועלות יחד ביישוב)?",
          options: [{ v: "yes", label: "מאוד רוצה" }, { v: "maybe", label: "אולי" }, { v: "no", label: "לא חשוב לי" }] },
      ],
    },
    {
      id: "skills",
      title: "פרק ד׳ — יכולות וניסיון",
      intro: "לחלק מהתפקידים יש תנאי סף לימודיים. אם את לא בטוחה, אפשר לסמן \"לא יודעת\".",
      questions: [
        { id: "bagrut", type: "single", hard: true, text: "צפויה לך תעודת בגרות מלאה?",
          options: [{ v: "yes", label: "כן" }, { v: "no", label: "לא" }, { v: "unknown", label: "לא יודעת" }] },
        { id: "math", type: "single", hard: true, text: "רמת מתמטיקה?",
          options: [{ v: "3", label: "3 יח\"ל או פחות" }, { v: "4", label: "4 יח\"ל" }, { v: "5", label: "5 יח\"ל" }, { v: "unknown", label: "לא יודעת" }] },
        { id: "english", type: "single", hard: true, text: "רמת אנגלית?",
          options: [{ v: "3", label: "3 יח\"ל או פחות" }, { v: "4", label: "4 יח\"ל" }, { v: "5", label: "5 יח\"ל" }, { v: "unknown", label: "לא יודעת" }] },
        { id: "english80", type: "single", hard: true, text: "ציון האנגלית צפוי להיות 80 ומעלה?",
          showIf: { q: "english", in: ["4", "5"] },
          options: [{ v: "yes", label: "כן" }, { v: "no", label: "לא" }, { v: "unknown", label: "לא יודעת" }] },
        { id: "science", type: "multi", hard: true, text: "מה מתאים לך? (אפשר לבחור כמה)",
          options: [{ v: "sci5", label: "פיזיקה, כימיה או מחשבים ב-5 יח\"ל" }, { v: "sci4", label: "מקצוע מדעי ב-4 יח\"ל ומעלה" },
                    { v: "real_track", label: "אני במגמה ריאלית או טכנולוגית" }] },
        { id: "langs", type: "multi", text: "שפות נוספות ברמה טובה",
          options: [{ v: "en", label: "אנגלית (ברמת שפת אם)" }, { v: "fr", label: "צרפתית" }, { v: "ru", label: "רוסית" },
                    { v: "am", label: "אמהרית" }, { v: "es", label: "ספרדית" }, { v: "other", label: "אחרת" }] },
        { id: "experience", type: "multi", text: "ניסיון שכבר יש לך",
          options: [{ v: "guiding", label: "הדרכה בתנועת נוער או בקייטנה" }, { v: "volunteer", label: "התנדבות קבועה" },
                    { v: "computers", label: "תכנות או עבודה מתקדמת עם מחשב" }, { v: "writing", label: "כתיבה (עיתון, בלוג, עבודות)" },
                    { v: "firstaid", label: "עזרה ראשונה (מד\"א נוער וכדומה)" }, { v: "design", label: "עיצוב או גרפיקה" }] },
      ],
    },
    {
      id: "special",
      title: "פרק ה׳ — תפקידים עם דרישות מיוחדות",
      questions: [
        { id: "security", type: "single", text: "תפקידים ביטחוניים (משטרה, מודיעין, כבאות, משרד הביטחון)?",
          options: [{ v: "yes", label: "מעניין אותי מאוד" }, { v: "open", label: "פתוחה לבדוק" }, { v: "no", label: "לא בשבילי" }] },
        { id: "clearance", type: "single", hard: true, text: "את מוכנה לעבור תהליך סיווג ביטחוני (כולל פרטים על בני המשפחה)?",
          showIf: { q: "security", in: ["yes", "open"] },
          options: [{ v: "yes", label: "כן" }, { v: "unsure", label: "לא בטוחה" }, { v: "no", label: "לא" }],
          help: "בחלק מתפקידי הטכנולוגיה והמשרד נדרש סיווג רק בחלק מהמקומות." },
        { id: "years", type: "single", hard: true, text: "לכמה זמן את מוכנה להתחייב?",
          options: [{ v: "one", label: "שנה אחת בלבד" }, { v: "open", label: "פתוחה לשנתיים אם התפקיד מתאים" }, { v: "two", label: "רוצה שנתיים" }],
          help: "חלק מהתפקידים (מודיעין, פראמדיקית, הדרכת שטח, מחקר טכנולוגי) דורשים התחייבות לשנתיים." },
        { id: "course", type: "single", text: "קורס או הכשרה בקיץ שלפני השירות (למשל קורס חובשות)?",
          options: [{ v: "yes", label: "מתאים לי" }, { v: "no", label: "לא מתאים" }] },
        { id: "env_restrict", type: "multi", hard: true, text: "יש סוגי מקומות שאת, המשפחה או הרב לא מאשרים?",
          options: toItems(V.env), help: "התפקידים האלה לא יוצגו כהתאמה רגילה." },
      ],
    },
    {
      id: "priorities",
      title: "פרק ו׳ — סדרי עדיפויות",
      questions: [
        { id: "priorities", type: "multi", max: 3, text: "מה הכי חשוב לך בשנת השירות? (עד 3)",
          options: [{ v: "meaning", label: "תחושת שליחות ונתינה" }, { v: "career", label: "ניסיון מקצועי או הכשרה לעתיד" },
                    { v: "social", label: "חברה ומסגרת חברתית" }, { v: "near_home", label: "קרוב לבית" },
                    { v: "hours", label: "שעות נוחות" }, { v: "religious", label: "סביבה דתית ותורנית" },
                    { v: "challenge", label: "אתגר ואחריות גדולה" }] },
      ],
    },
  ];
})();
