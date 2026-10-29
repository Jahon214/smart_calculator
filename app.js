"use strict";

/**
 * Voice Calculator Pro
 * Aqlli Ovozli Kalkulyator Dvigateli
 */

// DOM elementlari
const $ = id => document.getElementById(id);

const DOM = {
  expression: $("expression"),
  result: $("result"),
  manualInput: $("manualInput"),
  calculateBtn: $("calculateButton"),
  micBtn: $("micButton"),
  micLabel: $("micLabel"),
  micSubLabel: $("micSubLabel"),
  micIcon: $("micIcon"),
  waveVisualizer: $("waveVisualizer"),
  status: $("status"),
  statusDot: $("statusDot"),
  keypad: $("keypad"),
  backspaceKey: $("backspaceKey"),
  clearHistoryBtn: $("clearHistory"),
  historyList: $("history"),
  toast: $("toast"),
  ttsToggle: $("ttsToggle"),
  langSelect: $("langSelect"),
  copyBtn: $("copyBtn"),
  speakResultBtn: $("speakResultButton"),
  stopVoiceBtn: $("stopVoiceButton")
};

// Ilova holati
let state = {
  currentExpression: "",
  lastResult: 0,
  history: [],
  isListening: false,
  ttsEnabled: true,
  currentLang: "uz-UZ",
  recognition: null,
  toastTimeout: null
};

/* ==========================================================
   1. KIRILL-LOTIN VA SO'ZLARNI NORMALIZATSIYA QILISH
   ========================================================== */
const CYRILLIC_TO_LATIN = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh',
  'ъ':"'",'ы':'i','ь':'','э':'e','ю':'yu','я':'ya',
  'ў':"o'",'ғ':"g'",'қ':'q','ҳ':'h'
};

function cyrillicToLatin(text) {
  return text.toLowerCase().split('').map(c => CYRILLIC_TO_LATIN[c] || c).join('');
}

// Son so'zlari lug'ati (O'zbek, Rus va Ingliz tillarida)
const NUM_WORDS = {
  // O'zbekcha
  'nol':0, 'noll':0, 'bir':1, 'ikki':2, 'uch':3, "to'rt":4, 'tort':4,
  'besh':5, 'olti':6, 'yetti':7, 'eti':7, 'sakkiz':8, "to'qqiz":9, 'toqqiz':9,
  "o'n":10, 'on':10, 'yigirma':20, "o'ttiz":30, 'ottiz':30,
  'qirq':40, 'ellik':50, 'oltmish':60, 'otmish':60, 'yetmish':70,
  'sakson':80, "to'qson":90, 'toqson':90,
  'yuz':100, 'ming':1000, 'million':1000000, 'milliard':1000000000,
  'yarim':0.5, 'chorak':0.25,

  // Ruscha
  'ноль':0, 'нуль':0, 'один':1, 'одна':1, 'раз':1, 'два':2, 'две':2, 'три':3, 'четыре':4,
  'пять':5, 'шесть':6, 'семь':7, 'восемь':8, 'девять':9, 'десять':10,
  'одиннадцать':11, 'двенадцать':12, 'тринадцать':13, 'четырнадцать':14, 'пятнадцать':15,
  'шестнадцать':16, 'семнадцать':17, 'восемнадцать':18, 'девятнадцать':19,
  'двадцать':20, 'тридцать':30, 'сорок':40, 'пятьдесят':50, 'шестьдесят':60,
  'семьдесят':70, 'восемьдесят':80, 'девяносто':90,
  'сто':100, 'двести':200, 'триста':300, 'четыреста':400, 'пятьсот':500,
  'шестьсот':600, 'семьсот':700, 'восемьсот':800, 'девятьсот':900,
  'тысяча':1000, 'тысячи':1000, 'миллион':1000000,

  // Inglizcha
  'zero':0, 'one':1, 'two':2, 'three':3, 'four':4, 'five':5,
  'six':6, 'seven':7, 'eight':8, 'nine':9, 'ten':10,
  'eleven':11, 'twelve':12, 'thirteen':13, 'fourteen':14, 'fifteen':15,
  'sixteen':16, 'seventeen':17, 'eighteen':18, 'nineteen':19,
  'twenty':20, 'thirty':30, 'forty':40, 'fifty':50,
  'sixty':60, 'seventy':70, 'eighty':80, 'ninety':90,
  'hundred':100, 'thousand':1000, 'million':1000000, 'half':0.5
};

// Ruscha so'zlarning lotin transliteratsiyasini ham lug'atga qo'shamiz
Object.keys(NUM_WORDS).forEach(k => {
  const lat = cyrillicToLatin(k);
  if (NUM_WORDS[lat] === undefined) NUM_WORDS[lat] = NUM_WORDS[k];
});

/* Kelishik qo'shimchalarini ajratish:
   "yuzdan" -> "yuz dan", "yigirmaga" -> "yigirma ga", "beshni" -> "besh ni" */
function separateSuffixes(str) {
  const words = str.split(/\s+/);
  const result = [];

  for (const w of words) {
    // Raqam + qo'shimcha: masalan "100dan" -> "100 dan"
    const m = w.match(/^(\d+(?:[.,]\d+)?)(dan|ga|ka|qa|ge|ni|ning|da|ta)$/i);
    if (m) {
      result.push(m[1], m[2]);
      continue;
    }

    let separated = false;
    const suffixes = ["ning", "dan", "dagi", "ga", "ka", "qa", "ge", "ni", "da", "ta"];
    for (const s of suffixes) {
      if (w.endsWith(s) && w.length > s.length) {
        const stem = w.slice(0, -s.length);
        if (NUM_WORDS[stem] !== undefined) {
          result.push(stem, s);
          separated = true;
          break;
        }
      }
    }
    if (!separated) {
      result.push(w);
    }
  }

  return result.join(" ");
}

function normalizeInput(str) {
  let s = str.toLowerCase();
  s = s.replace(/[’‘`´ʻ]/g, "'");
  s = cyrillicToLatin(s);
  s = s.replace(/[?,!;_:"]/g, " ");
  s = separateSuffixes(s);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// So'zlar to'plamini son qiymatiga aylantirish: "yigirma besh" -> 25
function wordsToNumber(wordsArray) {
  if (!wordsArray || wordsArray.length === 0) return null;

  if (wordsArray.length === 1 && /^-?\d+(?:[.,]\d+)?$/.test(wordsArray[0])) {
    return Number(wordsArray[0].replace(",", "."));
  }

  // Kasr sonlar: "uch butun besh" -> 3.5, "uch nuqta besh" -> 3.5
  const butunIdx = wordsArray.findIndex(w => w === "butun" || w === "nuqta" || w === "tochka" || w === "point");
  if (butunIdx !== -1 && butunIdx > 0 && butunIdx < wordsArray.length - 1) {
    const intPart = wordsToNumber(wordsArray.slice(0, butunIdx));
    const decPart = wordsToNumber(wordsArray.slice(butunIdx + 1));
    if (intPart !== null && decPart !== null) {
      return Number(`${intPart}.${decPart}`);
    }
  }

  let total = 0;
  let current = 0;
  let seen = false;

  for (const w of wordsArray) {
    if (/^-?\d+(?:[.,]\d+)?$/.test(w)) {
      current += Number(w.replace(",", "."));
      seen = true;
      continue;
    }

    if (NUM_WORDS[w] !== undefined) {
      const val = NUM_WORDS[w];
      seen = true;
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else if (val === 1000) {
        total += (current === 0 ? 1 : current) * 1000;
        current = 0;
      } else if (val === 1000000) {
        total += (current === 0 ? 1 : current) * 1000000;
        current = 0;
      } else if (val === 1000000000) {
        total += (current === 0 ? 1 : current) * 1000000000;
        current = 0;
      } else if (val === 0.5 || val === 0.25) {
        current += val;
      } else {
        current += val;
      }
    } else {
      return null;
    }
  }

  return seen ? total + current : null;
}

function parseNumberPhrase(phrase) {
  if (!phrase) return null;
  const words = phrase.trim().split(/\s+/).filter(w => w !== "ta" && w !== "dona" && w !== "shtuk");
  const num = wordsToNumber(words);
  if (num !== null) return String(num);
  return parseSpokenToMath(phrase);
}

/* ==========================================================
   2. OVOZLI GAPLARNI MATEMATIK IFODAGA AYLANTIRISH
   ========================================================== */
function parseSpokenToMath(rawSpeech) {
  let s = normalizeInput(rawSpeech);

  // Buyruqlar: Tozalash
  if (/\b(tozala|tozalash|ochir|nolga tengla|sbros|clear|ac|reset)\b/i.test(s) && s.split(' ').length <= 4) {
    return { action: 'CLEAR' };
  }

  // Matematik belgilarni standartlashtirish
  s = s.replace(/[×✖]/g, " * ")
       .replace(/[÷:]/g, " / ")
       .replace(/[−–—]/g, " - ")
       .replace(/\+/g, " + ")
       .replace(/%/g, " foiz ");

  // 1. Kvadrat ildiz: "ildiz 64", "ildiz ostida 81", "64 ning ildizi", "koren 64"
  let sqrtMatch = s.match(/(?:ildiz\s+ostida|ildiz|koren|square root of|sqrt)\s+(.+)/);
  if (sqrtMatch) {
    const inner = parseNumberPhrase(sqrtMatch[1]);
    return `sqrt(${inner})`;
  }
  let sqrtOfMatch = s.match(/(.+?)\s+ning\s+ildizi/);
  if (sqrtOfMatch) {
    const inner = parseNumberPhrase(sqrtOfMatch[1]);
    return `sqrt(${inner})`;
  }

  // 2. Kvadrat va Kub: "5 ning kvadrati" -> (5) ^ 2, "4 ning kubi" -> (4) ^ 3
  let powMatch = s.match(/(.+?)\s*(?:ning\s+)?(?:kvadrati|kvadrat|v kvadrate|squared)$/);
  if (powMatch) {
    const base = parseNumberPhrase(powMatch[1]);
    return `(${base}) ^ 2`;
  }
  let cubeMatch = s.match(/(.+?)\s*(?:ning\s+)?(?:kubi|kub|v kube|cubed)$/);
  if (cubeMatch) {
    const base = parseNumberPhrase(cubeMatch[1]);
    return `(${base}) ^ 3`;
  }

  // 3. Foiz: "150 ning 20 foizi", "50 dan 10 foiz"
  let percMatch = s.match(/(.+?)\s*(?:ning|dan)\s+(.+?)\s*(?:foizi|foiz|protsent|protsentov|percent)$/);
  if (percMatch) {
    const a = parseNumberPhrase(percMatch[1]);
    const b = parseNumberPhrase(percMatch[2]);
    return `(${a}) * (${b}) / 100`;
  }

  // 4. Tabiiy O'zbek tili sintaksisi (SOV):
  // "A dan B ni ayir" -> A - B
  let subMatch = s.match(/^(.+?)\s+dan\s+(.+?)(?:\s+ni)?\s+(?:ayir|ayirish|ayirilsin|kamaytir|minus|otnyat|subtract)$/);
  if (subMatch) {
    const a = parseNumberPhrase(subMatch[1]);
    const b = parseNumberPhrase(subMatch[2]);
    return `${a} - ${b}`;
  }

  // "A ga B ni qo'sh" -> A + B
  let addMatch = s.match(/^(.+?)\s+(?:ga|ka|qa|ge)\s+(.+?)(?:\s+ni)?\s+(?:qo'sh|qosh|qo'shish|qo'shilsin|plus|plyus|pribavit|add)$/);
  if (addMatch) {
    const a = parseNumberPhrase(addMatch[1]);
    const b = parseNumberPhrase(addMatch[2]);
    return `${a} + ${b}`;
  }

  // "A ni B ga ko'paytir" -> A * B
  let mulMatch = s.match(/^(.+?)\s+ni\s+(.+?)(?:\s+(?:ga|ka|qa|ge))?\s*(?:ko'paytir|kopaytir|ko'paytirish|zarb qil|umnojit|multiply)$/);
  if (mulMatch) {
    const a = parseNumberPhrase(mulMatch[1]);
    const b = parseNumberPhrase(mulMatch[2]);
    return `${a} * ${b}`;
  }

  // "A ni B ga bo'l" -> A / B
  let divMatch = s.match(/^(.+?)\s+ni\s+(.+?)(?:\s+(?:ga|ka|qa|ge))?\s*(?:bo'l|bol|bo'lish|bo'linsin|razdelit|podelit|divide)$/);
  if (divMatch) {
    const a = parseNumberPhrase(divMatch[1]);
    const b = parseNumberPhrase(divMatch[2]);
    return `${a} / ${b}`;
  }

  // 5. Infix amallar lug'ati
  const opMap = [
    { pattern: /\b(qo'shuv|qoshuv|qo'sh|qosh|plyus|plus|qo'shilgan|jami|pribavit)\b/g, op: " + " },
    { pattern: /\b(ayir|ayirish|ayirilgan|ayiruv|minus|otnyat|kamaytir)\b/g, op: " - " },
    { pattern: /\b(ko'paytir|kopaytir|ko'paytirilgan|ko'paytiruv|marta|karra|zarb|times|umnojit|umnojennoe)\b/g, op: " * " },
    { pattern: /\b(bo'luv|boluv|bo'lingan|bo'lib|bo'l|bol|taqsim|divide|divided|razdelit|podelit)\b/g, op: " / " },
    { pattern: /\b(darajasi|daraja|stepen|stepeni|power|to the power of)\b/g, op: " ^ " },
    { pattern: /\b(modul|qoldiq|ostatoch|mod)\b/g, op: " % " },
    { pattern: /\b(ochuvchi qavs|qavs ochish|otkroy skobku|open bracket)\b/g, op: " ( " },
    { pattern: /\b(yopuvchi qavs|qavs yopish|zakroy skobku|close bracket)\b/g, op: " ) " }
  ];

  for (const { pattern, op } of opMap) {
    s = s.replace(pattern, op);
  }

  // Qo'shimcha so'zlarni tozalash
  s = s.replace(/\b(hisobla|hisoblab ber|necha bo'ladi|necha boladi|qancha bo'ladi|qancha boladi|qancha|javobini ayt|teng|ravno|rovno|equals|please|iltimos|dan|ga|ka|qa|ge|ni|ning|ta|dona)\b/g, " ");

  // Qismlarga ajratish va sonlarni aniqlash
  const tokens = s.split(/([+\-*/%^()])/).map(t => t.trim()).filter(Boolean);
  const resultParts = [];

  for (const token of tokens) {
    if (/^[+\-*/%^()]$/.test(token)) {
      resultParts.push(token);
      continue;
    }

    const words = token.split(/\s+/).filter(Boolean);
    const num = wordsToNumber(words);
    if (num !== null) {
      resultParts.push(num);
    } else {
      const joined = words.join('');
      if (/^-?\d+(?:[.,]\d+)?$/.test(joined)) {
        resultParts.push(joined.replace(',', '.'));
      } else {
        resultParts.push(token);
      }
    }
  }

  return resultParts.join(" ");
}

/* ==========================================================
   3. MATEMATIK HISOB-KITOB DVIGATELI (XAVFSIZ VA MUKAMMAL)
   ========================================================== */
function tokenize(input) {
  let s = String(input)
    .replace(/,/g, ".")
    .replace(/[×xX]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[−–—]/g, "-");

  const tokens = [];
  let i = 0;

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    const rest = s.slice(i);

    // Funksiyalar (masalan sqrt)
    const fnMatch = rest.match(/^(sqrt|abs)\b/i);
    if (fnMatch) {
      tokens.push({ type: "fn", value: fnMatch[1].toLowerCase() });
      i += fnMatch[0].length;
      continue;
    }

    // Sonlar
    const numMatch = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (numMatch) {
      const n = Number(numMatch[0]);
      if (!Number.isFinite(n)) throw Error("Son juda katta yoki noto‘g‘ri.");
      tokens.push({ type: "number", value: n });
      i += numMatch[0].length;
      continue;
    }

    // Operatorlar va qavslar
    if ("+-*/%^()".includes(s[i])) {
      tokens.push({ type: s[i], value: s[i] });
      i++;
      continue;
    }

    throw Error("Ifodada noma’lum belgi bor: " + s[i]);
  }

  if (!tokens.length) throw Error("Hisoblash uchun misol kiriting.");
  return tokens;
}

function calculateMath(input) {
  const tokens = tokenize(input);
  let pos = 0;

  function primary() {
    const t = tokens[pos];
    if (!t) throw Error("Misol tugallanmagan.");

    // Unar ishoralar: +5 yoki -5
    if (t.type === "+" || t.type === "-") {
      pos++;
      const v = primary();
      return t.type === "-" ? -v : v;
    }

    // Funksiya chaqiruvi: sqrt(...)
    if (t.type === "fn") {
      const fnName = t.value;
      pos++;
      if (!tokens[pos] || tokens[pos].type !== "(") {
        const arg = primary();
        if (fnName === "sqrt") {
          if (arg < 0) throw Error("Manfiy sonning kvadrat ildizi mavjud emas.");
          return Math.sqrt(arg);
        }
      } else {
        pos++; // '('
        const arg = addSub();
        if (!tokens[pos] || tokens[pos].type !== ")") {
          throw Error("Qavs yopilmagan: " + fnName);
        }
        pos++; // ')'
        if (fnName === "sqrt") {
          if (arg < 0) throw Error("Manfiy sonning kvadrat ildizi mavjud emas.");
          return Math.sqrt(arg);
        }
        return arg;
      }
    }

    if (t.type === "number") {
      pos++;
      return t.value;
    }

    if (t.type === "(") {
      pos++;
      const val = addSub();
      if (!tokens[pos] || tokens[pos].type !== ")") {
        throw Error("Qavslar to‘g‘ri yopilmagan.");
      }
      pos++;
      return val;
    }

    throw Error("Son yoki qavs kutilgan edi.");
  }

  function power() {
    let a = primary();
    if (tokens[pos] && tokens[pos].type === "^") {
      pos++;
      const b = unary();
      a = Math.pow(a, b);
      if (!Number.isFinite(a)) throw Error("Daraja natijasi hisoblab bo‘lmaydigan darajada katta.");
    }
    return a;
  }

  function unary() {
    if (tokens[pos] && (tokens[pos].type === "+" || tokens[pos].type === "-")) {
      const op = tokens[pos++].type;
      return op === "-" ? -unary() : unary();
    }
    return power();
  }

  function mulDiv() {
    let a = unary();
    while (tokens[pos] && ["*", "/", "%"].includes(tokens[pos].type)) {
      const op = tokens[pos++].type;
      const b = unary();

      if ((op === "/" || op === "%") && b === 0) {
        throw Error("Nolga bo‘lish mumkin emas!");
      }

      if (op === "*") a *= b;
      if (op === "/") a /= b;
      if (op === "%") a %= b;
      if (!Number.isFinite(a)) throw Error("Natija cheksiz darajada katta.");
    }
    return a;
  }

  function addSub() {
    let a = mulDiv();
    while (tokens[pos] && (tokens[pos].type === "+" || tokens[pos].type === "-")) {
      const op = tokens[pos++].type;
      const b = mulDiv();
      a = op === "+" ? a + b : a - b;
      if (!Number.isFinite(a)) throw Error("Natija juda katta.");
    }
    return a;
  }

  const res = addSub();
  if (pos !== tokens.length) throw Error("Ifodaning qolgan qismi tushunarsiz: " + tokens[pos].value);
  return res;
}

function formatResultNumber(n) {
  if (!Number.isFinite(n)) throw Error("Natija chekli son emas.");
  if (Object.is(n, -0)) n = 0;
  if (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-8)) {
    return n.toExponential(8).replace(/\.?0+e/, "e");
  }
  // 10 ta raqamgacha aniqlik va ortiqcha nollarni olib tashlash
  return String(Number(n.toPrecision(12)));
}

/* ==========================================================
   4. UI VA HISOBLASHNI BOSHQARISH
   ========================================================== */
function notifyToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add("show");
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => {
    DOM.toast.classList.remove("show");
  }, 2800);
}

function updateScreen(expression, result) {
  DOM.expression.textContent = expression || "Hisoblashni boshlang";
  DOM.result.textContent = String(result);
}

function executeCalculation(expressionStr, opts = { speak: false, source: "user" }) {
  try {
    const raw = String(expressionStr).trim();
    if (!raw) throw Error("Misolni kiriting yoki mikrofonga ayting.");

    const result = calculateMath(raw);
    const formatted = formatResultNumber(result);

    state.currentExpression = raw;
    state.lastResult = result;
    DOM.manualInput.value = raw;
    updateScreen(raw, formatted);

    // Tarixga qo'shish
    addToHistory(raw, formatted);

    if (opts.speak && state.ttsEnabled) {
      speakAudio("Natija: " + formatted);
    } else {
      notifyToast("Natija: " + formatted);
    }

    return result;
  } catch (err) {
    DOM.status.textContent = err.message || "Hisoblashda xatolik yuz berdi.";
    notifyToast(err.message || "Misolni hisoblab bo‘lmadi.");
    return null;
  }
}

/* ==========================================================
   5. TARIX (LOCALSTORAGE BILAN)
   ========================================================== */
function loadHistory() {
  try {
    const saved = localStorage.getItem("voice_calc_history");
    if (saved) {
      state.history = JSON.parse(saved);
      renderHistory();
    }
  } catch (e) {
    state.history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem("voice_calc_history", JSON.stringify(state.history));
  } catch (e) {}
}

function addToHistory(expression, result) {
  state.history.unshift({ expression, result, time: new Date().toLocaleTimeString() });
  state.history = state.history.slice(0, 30); // Oxirgi 30 ta
  saveHistory();
  renderHistory();
}

function renderHistory() {
  DOM.historyList.replaceChildren();

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<span class="empty-icon">📝</span><p>Hozircha hisoblashlar yo‘q.<br>Ovoz bilan yoki tugmalar orqali misol ayting!</p>`;
    DOM.historyList.appendChild(empty);
    return;
  }

  state.history.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.title = "Qayta hisoblash uchun bosing";

    const expEl = document.createElement("div");
    expEl.className = "history-card-exp";
    expEl.textContent = item.expression;

    const resEl = document.createElement("div");
    resEl.className = "history-card-res";
    resEl.textContent = "= " + item.result;

    card.append(expEl, resEl);

    card.addEventListener("click", () => {
      DOM.manualInput.value = item.expression;
      executeCalculation(item.expression, { speak: false });
    });

    DOM.historyList.appendChild(card);
  });
}

DOM.clearHistoryBtn.addEventListener("click", () => {
  state.history = [];
  saveHistory();
  renderHistory();
  notifyToast("Hisoblash tarixi tozalandi.");
});

/* ==========================================================
   6. OVOZ CHIQARISH (TEXT-TO-SPEECH)
   ========================================================== */
function speakAudio(text) {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Mavjud ovozlardan tanlash
  const voices = speechSynthesis.getVoices();
  const lang = state.currentLang;

  let selectedVoice = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
  if (!selectedVoice && lang === "uz-UZ") {
    // Agar o'zbekcha ovoz bo'lmasa, ruscha yoki standart ovozdan foydalanish
    selectedVoice = voices.find(v => v.lang.startsWith("ru")) || voices[0];
  }
  if (selectedVoice) utterance.voice = selectedVoice;

  speechSynthesis.speak(utterance);
}

// Ovozli javob tugmasi
DOM.ttsToggle.addEventListener("click", () => {
  state.ttsEnabled = !state.ttsEnabled;
  DOM.ttsToggle.classList.toggle("active", state.ttsEnabled);
  DOM.ttsToggle.querySelector(".btn-pill-label").textContent = state.ttsEnabled ? "Ovoz: Yoniq" : "Ovoz: O‘chiq";
  DOM.ttsToggle.querySelector(".icon").textContent = state.ttsEnabled ? "🔊" : "🔇";
  notifyToast(state.ttsEnabled ? "Ovozli natija aytish yoqildi" : "Ovozli natija aytish o‘chirildi");
});

DOM.speakResultBtn.addEventListener("click", () => {
  speakAudio("Natija " + formatResultNumber(state.lastResult));
});

DOM.stopVoiceBtn.addEventListener("click", () => {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (state.recognition && state.isListening) state.recognition.stop();
});

/* ==========================================================
   7. WEB SPEECH API (MIKROFON ORQALI OVOZNI TANISH)
   ========================================================== */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function setListeningState(isListening) {
  state.isListening = isListening;
  DOM.micBtn.classList.toggle("listening", isListening);
  DOM.statusDot.classList.toggle("active", isListening);

  if (isListening) {
    DOM.micLabel.textContent = "TINGLAYAPMAN...";
    DOM.micSubLabel.textContent = "To‘xtatish uchun bosing";
    DOM.micIcon.textContent = "🛑";
    DOM.status.textContent = "Mikrofon yoniq. Misolni aniq ayting...";
  } else {
    DOM.micLabel.textContent = "BOSING VA GAPIRING";
    DOM.micSubLabel.textContent = "Misolni og‘zaki ayting";
    DOM.micIcon.textContent = "🎙️";
  }
}

function initSpeechRecognition() {
  if (!SpeechRecognition) {
    DOM.status.textContent = "Brauzeringiz ovozli tanishni qo‘llab-quvvatlamaydi (Google Chrome tavsiya etiladi).";
    DOM.micBtn.addEventListener("click", () => {
      notifyToast("Ushbu brauzerda mikrofon tanish mavjud emas. Google Chrome'da oching.");
    });
    return;
  }

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.lang = state.currentLang;

  let finalTranscript = "";

  rec.onstart = () => {
    finalTranscript = "";
    setListeningState(true);
  };

  rec.onresult = event => {
    let interim = "";
    finalTranscript = "";

    for (let i = 0; i < event.results.length; i++) {
      const transcriptPiece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcriptPiece + " ";
      } else {
        interim += transcriptPiece;
      }
    }

    const currentText = (finalTranscript + interim).trim();
    if (currentText) {
      DOM.status.textContent = "Eshitilmoqda: " + currentText;
    }
  };

  rec.onerror = event => {
    setListeningState(false);
    const errorMessages = {
      "not-allowed": "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida mikrofonga ruxsat bering.",
      "service-not-allowed": "Brauzer ovozli xizmatga ruxsat bermadi.",
      "no-speech": "Ovoz eshitilmadi. Iltimos, qayta urinib ko‘ring.",
      "audio-capture": "Mikrofon topilmadi yoki ulangan emas.",
      "network": "Ovoz tanish xizmati tarmoq xatosi. Internet aloqasini tekshiring."
    };
    DOM.status.textContent = errorMessages[event.error] || ("Ovoz tanishda xatolik: " + event.error);
    notifyToast(errorMessages[event.error] || "Ovoz tanish xatosi");
  };

  rec.onend = () => {
    setListeningState(false);
    const spokenText = finalTranscript.trim();
    if (!spokenText) return;

    DOM.status.textContent = "Eshitildi: “" + spokenText + "”";

    try {
      const parsed = parseSpokenToMath(spokenText);

      // Agar 'tozala' buyrug'i bo'lsa
      if (parsed && parsed.action === 'CLEAR') {
        clearCalculator();
        notifyToast("Tozalandi");
        return;
      }

      if (!parsed) throw Error("Ovozdan matematik ifoda tushunilmadi.");

      DOM.manualInput.value = parsed;
      const calcResult = executeCalculation(parsed, { speak: true, source: "voice" });
      if (calcResult !== null) {
        DOM.status.textContent = `Siz aytdingiz: “${spokenText}” → Ifoda: ${parsed}`;
      }
    } catch (err) {
      DOM.expression.textContent = spokenText;
      DOM.status.textContent = err.message || "Misolni tushunib bo‘lmadi.";
      notifyToast(err.message || "Misolni tushunmadim. Qaytadan aniq ayting.");
    }
  };

  state.recognition = rec;

  DOM.micBtn.addEventListener("click", () => {
    if (state.isListening) {
      rec.stop();
      return;
    }
    try {
      rec.lang = state.currentLang;
      rec.start();
    } catch (e) {
      notifyToast("Mikrofon band. Bir ozdan so‘ng qayta urinib ko‘ring.");
    }
  });
}

// Tilni tanlash o'zgarganda
DOM.langSelect.addEventListener("change", (e) => {
  state.currentLang = e.target.value;
  if (state.recognition) {
    state.recognition.lang = state.currentLang;
  }
  notifyToast("Til o‘zgartirildi: " + e.target.options[e.target.selectedIndex].text);
});

/* ==========================================================
   8. KALKULYATOR VA INTERFEYS TUGMALARI
   ========================================================== */
function clearCalculator() {
  state.currentExpression = "";
  state.lastResult = 0;
  DOM.manualInput.value = "";
  updateScreen("", "0");
}

DOM.calculateBtn.addEventListener("click", () => {
  executeCalculation(DOM.manualInput.value, { speak: false });
});

DOM.manualInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    executeCalculation(DOM.manualInput.value, { speak: false });
  }
});

// Klaviatura tugmalari (Keypad)
DOM.keypad.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;

  const key = btn.dataset.key;
  const input = DOM.manualInput;

  if (key === "AC") {
    clearCalculator();
    return;
  }

  if (key === "=") {
    executeCalculation(input.value, { speak: false });
    return;
  }

  if (key === "BACKSPACE") {
    input.value = input.value.slice(0, -1);
    DOM.expression.textContent = input.value || "Hisoblashni boshlang";
    return;
  }

  // Operator va raqamlarni kiritish
  input.value += key;
  DOM.expression.textContent = input.value;
  input.focus();
});

// Natijani nusxalash (Clipboard)
DOM.copyBtn.addEventListener("click", async () => {
  const textToCopy = DOM.result.textContent;
  try {
    await navigator.clipboard.writeText(textToCopy);
    notifyToast("Nusxalandi: " + textToCopy);
  } catch (err) {
    notifyToast("Nusxalashda xatolik");
  }
});

// Namuna tugmalari (Examples)
document.querySelectorAll(".example-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const speech = chip.dataset.speech;
    DOM.status.textContent = "Sinov misoli: “" + speech + "”";
    try {
      const parsed = parseSpokenToMath(speech);
      if (parsed && parsed.action === 'CLEAR') {
        clearCalculator();
        return;
      }
      DOM.manualInput.value = parsed;
      executeCalculation(parsed, { speak: true });
    } catch (err) {
      notifyToast(err.message);
    }
  });
});

// Klaviaturadan to'g'ridan-to'g'ri boshqaruv
window.addEventListener("keydown", (e) => {
  // Agar manualInput ichida yozayotgan bo'lmasa
  if (document.activeElement === DOM.manualInput) return;

  if (e.key >= "0" && e.key <= "9") {
    DOM.manualInput.value += e.key;
    DOM.expression.textContent = DOM.manualInput.value;
  } else if ("+-*/%^().".includes(e.key)) {
    DOM.manualInput.value += e.key;
    DOM.expression.textContent = DOM.manualInput.value;
  } else if (e.key === "Enter") {
    e.preventDefault();
    executeCalculation(DOM.manualInput.value, { speak: false });
  } else if (e.key === "Backspace") {
    DOM.manualInput.value = DOM.manualInput.value.slice(0, -1);
    DOM.expression.textContent = DOM.manualInput.value || "Hisoblashni boshlang";
  } else if (e.key === "Escape") {
    clearCalculator();
  }
});

/* ==========================================================
   9. ISHGA TUSHIRISH (INITIALIZE)
   ========================================================== */
function init() {
  loadHistory();
  initSpeechRecognition();
  updateScreen("", "0");
}

document.addEventListener("DOMContentLoaded", init);
