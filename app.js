"use strict";

/**
 * Voice Calculator Pro AI - Core Engine 2.0
 * Multi-Alternative Speech-to-Math & Semantic AI Parser
 */

// DOM Selector helper
const $ = id => document.getElementById(id);

const DOM = {
  // Navigation & Controls
  langSelector: $("langSelector"),
  toggleSciBtn: $("toggleSciBtn"),
  toggleTtsBtn: $("toggleTtsBtn"),
  toggleSfxBtn: $("toggleSfxBtn"),
  ttsIcon: $("ttsIcon"),
  ttsLabel: $("ttsLabel"),
  sfxIcon: $("sfxIcon"),
  sciKeysRow: $("sciKeysRow"),

  // Screen
  statusLabel: $("statusLabel"),
  liveSpeechText: $("liveSpeechText"),
  expressionView: $("expressionView"),
  resultView: $("resultView"),
  engineStatusBadge: $("engineStatusBadge"),
  pulseRing: document.querySelector(".pulse-ring"),
  copyResultBtn: $("copyResultBtn"),
  speakResultBtn: $("speakResultBtn"),
  clearAllBtn: $("clearAllBtn"),

  // Voice Hero
  mainMicBtn: $("mainMicBtn"),
  mainMicIcon: $("mainMicIcon"),
  orbTitle: $("orbTitle"),
  orbDesc: $("orbDesc"),
  freqVisualizer: $("freqVisualizer"),

  // Keyboard input & Grid
  keyboardInput: $("keyboardInput"),
  evalBtn: $("evalBtn"),
  mainKeysGrid: document.querySelector(".main-keys-grid"),

  // Sidebar History
  clearHistoryBtn: $("clearHistoryBtn"),
  historyContainer: $("historyContainer"),
  toastPopup: $("toastPopup")
};

// Global State
const state = {
  currentExpression: "",
  lastResult: 0,
  history: [],
  isListening: false,
  ttsEnabled: true,
  sfxEnabled: true,
  scientificMode: false,
  currentLang: "uz-UZ",
  recognition: null,
  toastTimer: null,
  audioCtx: null
};

/* ==========================================================
   1. WEB AUDIO API SYNTHESIZER (Cyber Sound FX)
   ========================================================== */
function getAudioContext() {
  if (!state.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx && state.audioCtx.state === "suspended") {
    state.audioCtx.resume();
  }
  return state.audioCtx;
}

function playSound(type) {
  if (!state.sfxEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === "mic_start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "clear") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {}
}

/* ==========================================================
   2. ROBUST PHONETIC & SEMANTIC NATURAL LANGUAGE ENGINE
   ========================================================== */
const CYR_TO_LAT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh',
  'ъ':"'",'ы':'i','ь':'','э':'e','ю':'yu','я':'ya',
  'ў':"o'",'ғ':"g'",'қ':'q','ҳ':'h'
};

const NUM_LEXICON = {
  // 0-9
  'nol':0, 'noll':0, 'zero':0, 'no‘l':0, 'nul':0, 'ноль':0, 'нуль':0,
  'bir':1, 'bitta':1, 'one':1, 'один':1, 'одна':1, 'раз':1,
  'ikki':2, 'ikita':2, 'ikkita':2, 'two':2, 'два':2, 'две':2,
  'uch':3, 'uchta':3, 'three':3, 'три':3,
  'tort':4, "to'rt":4, "to‘rt":4, "to`rt":4, "to'rtta":4, 'four':4, 'четыре':4,
  'besh':5, 'beshta':5, 'bsh':5, 'vew':5, 'vesh':5, 'five':5, 'пять':5,
  'olti':6, 'oltita':6, 'six':6, 'шесть':6,
  'yetti':7, 'yettita':7, 'eti':7, 'yeti':7, 'seven':7, 'семь':7,
  'sakkiz':8, 'sakkizta':8, 'sakiz':8, 'eight':8, 'восемь':8,
  'toqqiz':9, 'toqqizta':9, "to'qqiz":9, "to‘qqiz":9, 'nine':9, 'девять':9,

  // 10-19
  'on':10, "o'n":10, "o‘n":10, 'onta':10, "o'nta":10, 'ten':10, 'десять':10,
  'onbir':11, "o'n bir":11, 'eleven':11, 'одиннадцать':11,
  'onikki':12, "o'n ikki":12, 'twelve':12, 'двенадцать':12,
  'onuch':13, "o'n uch":13, 'thirteen':13, 'тринадцать':13,
  'ontort':14, "o'n to'rt":14, 'fourteen':14, 'четырнадцать':14,
  'onbesh':15, "o'n besh":15, 'fifteen':15, 'пятнадцать':15,
  'onolti':16, "o'n olti":16, 'sixteen':16, 'шестнадцать':16,
  'onyetti':17, "o'n yetti":17, 'seventeen':17, 'семнадцать':17,
  'onsakkiz':18, "o'n sakkiz":18, 'eighteen':18, 'восемнадцать':18,
  'ontoqqiz':19, "o'n to'qqiz":19, 'nineteen':19, 'девятнадцать':19,

  // 20-90
  'yigirma':20, 'yegirma':20, 'twenty':20, 'двадцать':20,
  'ottiz':30, "o'ttiz":30, "o‘ttiz":30, 'thirty':30, 'тридцать':30,
  'qirq':40, 'kirk':40, 'forty':40, 'сорок':40,
  'ellik':50, 'elik':50, 'fifty':50, 'пятьдесят':50,
  'oltmish':60, 'otmish':60, 'sixty':60, 'шестьдесят':60,
  'yetmish':70, 'etmish':70, 'seventy':70, 'семьдесят':70,
  'sakson':80, 'eighty':80, 'восемьдесят':80,
  'toqson':90, "to'qson":90, 'ninety':90, 'девяносто':90,

  // Katta birliklar
  'yuz':100, 'yuzta':100, 'hundred':100, 'сто':100,
  'ming':1000, 'mingta':1000, 'thousand':1000, 'тысяча':1000,
  'million':1000000, 'миллион':1000000,
  'yarim':0.5, 'chorak':0.25
};

// Qo'shimchalarni ajratish
function separateSuffixes(str) {
  const words = str.split(/\s+/);
  const result = [];

  for (const w of words) {
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
        if (NUM_LEXICON[stem] !== undefined) {
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

function cleanInputText(raw) {
  let s = String(raw || "").toLowerCase();
  s = s.replace(/[’‘`´ʻ]/g, "'");
  // Kirillcha transliteratsiya
  s = s.split('').map(c => CYR_TO_LAT[c] || c).join('');
  // "o ' n" -> "o'n"
  s = s.replace(/([a-z])\s*'\s*([a-z])/g, "$1'$2");
  s = s.replace(/[?,!;_:"]/g, " ");
  s = separateSuffixes(s);
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function parseWordNumber(token) {
  if (/^-?\d+(?:[.,]\d+)?$/.test(token)) {
    return Number(token.replace(',', '.'));
  }
  const dm = token.match(/^(\d+(?:[.,]\d+)?)(dan|ga|ka|qa|ge|ni|ning|da|ta)$/i);
  if (dm) {
    return Number(dm[1].replace(',', '.'));
  }
  if (NUM_LEXICON[token] !== undefined) {
    return NUM_LEXICON[token];
  }
  const suffixes = ["ning", "dan", "dagi", "ga", "ka", "qa", "ge", "ni", "da", "ta"];
  for (const s of suffixes) {
    if (token.endsWith(s) && token.length > s.length) {
      const stem = token.slice(0, -s.length);
      if (NUM_LEXICON[stem] !== undefined) {
        return NUM_LEXICON[stem];
      }
    }
  }
  return null;
}

function wordsListToNumber(words) {
  if (!words || !words.length) return null;
  if (words.length === 1) return parseWordNumber(words[0]);

  const decIdx = words.findIndex(w => w === 'butun' || w === 'nuqta' || w === 'tochka' || w === 'point');
  if (decIdx > 0 && decIdx < words.length - 1) {
    const left = wordsListToNumber(words.slice(0, decIdx));
    const right = wordsListToNumber(words.slice(decIdx + 1));
    if (left !== null && right !== null) return Number(`${left}.${right}`);
  }

  let total = 0;
  let current = 0;
  let seen = false;

  for (const w of words) {
    const val = parseWordNumber(w);
    if (val === null) return null;
    seen = true;

    if (val === 100) {
      current = (current === 0 ? 1 : current) * 100;
    } else if (val === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (val === 1000000) {
      total += (current === 0 ? 1 : current) * 1000000;
      current = 0;
    } else {
      current += val;
    }
  }

  return seen ? total + current : null;
}

function parseNumberSubPhrase(phrase) {
  if (!phrase) return null;
  const words = phrase.trim().split(/\s+/).filter(w => w !== "ta" && w !== "dona" && w !== "shtuk");
  const num = wordsListToNumber(words);
  if (num !== null) return String(num);
  return speechToMathExpression(phrase);
}

// AI Speech to Math Transformer
function speechToMathExpression(rawText) {
  let s = cleanInputText(rawText);

  // Buyruqlar: Tozalash
  if (/\b(tozala|tozalash|ochir|nolga tengla|sbros|clear|ac|ochirib tashla|boshqatdan)\b/i.test(s) && s.split(' ').length <= 4) {
    return { type: 'COMMAND', command: 'CLEAR' };
  }

  // Matematik belgilar
  s = s.replace(/[×✖]/g, " * ")
       .replace(/[÷:]/g, " / ")
       .replace(/[−–—]/g, " - ")
       .replace(/\+/g, " + ")
       .replace(/%/g, " % ");

  // 1. Kvadrat ildiz: "ildiz 64", "64 ning ildizi", "ildiz ostida 81"
  let sqrtM = s.match(/(?:ildiz\s+ostida|ildiz|yulduz|koren|square root of|sqrt)\s+(.+)/i);
  if (sqrtM) {
    const sub = parseNumberSubPhrase(sqrtM[1]);
    return `sqrt(${sub})`;
  }
  let sqrtOfM = s.match(/(.+?)\s+ning\s+ildizi/i);
  if (sqrtOfM) {
    const sub = parseNumberSubPhrase(sqrtOfM[1]);
    return `sqrt(${sub})`;
  }

  // 2. Kvadrat va Kub: "5 ning kvadrati", "to'rtning kubi"
  let powM = s.match(/(.+?)\s*(?:ning\s+)?(?:kvadrati|kvadrat|v kvadrate|squared)$/i);
  if (powM) {
    const sub = parseNumberSubPhrase(powM[1]);
    return `(${sub}) ^ 2`;
  }
  let cubeM = s.match(/(.+?)\s*(?:ning\s+)?(?:kubi|kub|v kube|cubed)$/i);
  if (cubeM) {
    const sub = parseNumberSubPhrase(cubeM[1]);
    return `(${sub}) ^ 3`;
  }

  // 3. Foiz: "150 ning 20 foizi", "50 dan 10 foiz"
  let percM = s.match(/(.+?)\s*(?:ning|dan)\s+(.+?)\s*(?:foizi|foiz|protsent|protsentov|percent)$/i);
  if (percM) {
    const a = parseNumberSubPhrase(percM[1]);
    const b = parseNumberSubPhrase(percM[2]);
    return `(${a}) * (${b}) / 100`;
  }

  // 4. Tabiiy O'zbek tili sintaksisi (SOV):
  // "A dan B ni ayir" -> A - B
  let subM = s.match(/^(.+?)\s+dan\s+(.+?)(?:\s+ni)?\s+(?:ayir|ayirish|ayiruv|ayirib|kamaytir|minus|otnyat)$/i);
  if (subM) {
    const a = parseNumberSubPhrase(subM[1]);
    const b = parseNumberSubPhrase(subM[2]);
    return `${a} - ${b}`;
  }

  // "A ga B ni qo'sh" -> A + B
  let addM = s.match(/^(.+?)\s+(?:ga|ka|qa|ge)\s+(.+?)(?:\s+ni)?\s+(?:qo'sh|qosh|qo'shish|qoshish|plyus|plus|qo'shilsin|pribavit)$/i);
  if (addM) {
    const a = parseNumberSubPhrase(addM[1]);
    const b = parseNumberSubPhrase(addM[2]);
    return `${a} + ${b}`;
  }

  // "A ni B ga ko'paytir" -> A * B
  let mulM = s.match(/^(.+?)\s+ni\s+(.+?)(?:\s+(?:ga|ka|qa|ge))?\s*(?:ko'paytir|kopaytir|ko'paytirish|kopaytirish|karra|zarb qil|umnojit)$/i);
  if (mulM) {
    const a = parseNumberSubPhrase(mulM[1]);
    const b = parseNumberSubPhrase(mulM[2]);
    return `${a} * ${b}`;
  }

  // "A ni B ga bo'l" -> A / B
  let divM = s.match(/^(.+?)\s+ni\s+(.+?)(?:\s+(?:ga|ka|qa|ge))?\s*(?:bo'l|bol|bo'luv|boluv|bo'lish|bolish|taqsim|razdelit|podelit)$/i);
  if (divM) {
    const a = parseNumberSubPhrase(divM[1]);
    const b = parseNumberSubPhrase(divM[2]);
    return `${a} / ${b}`;
  }

  // Amallar almashtiruvi
  const OP_MAP = [
    { pattern: /\b(qo'shuv|qoshuv|koshuv|qo'sh|qosh|qo'shish|qoshish|plyus|plus|qo'shilgan|jami|pribavit|add)\b/gi, op: " + " },
    { pattern: /\b(ayir|ayirish|ayiruv|ayirib|minus|kamaytir|ayirilsin|otnyat|subtract)\b/gi, op: " - " },
    { pattern: /\b(ko'paytir|kopaytir|ko'paytirish|kopaytirish|karra|kara|marta|zarb|times|umnojit|umnojennoe|multiply)\b/gi, op: " * " },
    { pattern: /\b(bo'luv|boluv|bo'lish|bolish|bo'lingan|bolingan|bo'lib|bolib|bo'l|bol|taqsim|divide|divided|razdelit|podelit)\b/gi, op: " / " },
    { pattern: /\b(darajasi|daraja|stepen|stepeni|power)\b/gi, op: " ^ " },
    { pattern: /\b(modul|qoldiq|mod)\b/gi, op: " % " },
    { pattern: /\b(qavs ochish|ochuvchi qavs|open bracket)\b/gi, op: " ( " },
    { pattern: /\b(qavs yopish|yopuvchi qavs|close bracket)\b/gi, op: " ) " }
  ];

  for (const { pattern, op } of OP_MAP) {
    s = s.replace(pattern, op);
  }

  // Ortiqcha so'zlarni tozalash
  s = s.replace(/\b(hisobla|hisoblab ber|necha bo'ladi|necha boladi|qancha bo'ladi|qancha boladi|qancha|javobini ayt|teng|ravno|rovno|equals|please|iltimos|dan|ga|ka|qa|ge|ni|ning|ta|dona|aka|uka)\b/gi, " ");

  const tokens = s.split(/([+\-*/%^()])/).map(t => t.trim()).filter(Boolean);
  const resultParts = [];

  for (const t of tokens) {
    if (/^[+\-*/%^()]$/.test(t)) {
      resultParts.push(t);
      continue;
    }

    const words = t.split(/\s+/).filter(Boolean);
    const num = wordsListToNumber(words);
    if (num !== null) {
      resultParts.push(num);
    } else {
      const cleanNum = t.replace(/[^\d.-]/g, '');
      if (cleanNum && !isNaN(cleanNum)) {
        resultParts.push(cleanNum);
      } else {
        resultParts.push(t);
      }
    }
  }

  return resultParts.join(" ");
}

/* ==========================================================
   3. MATEMATIK HISOB-KITOB DVIGATELI (XAVFSIZ VA ILMIY)
   ========================================================== */
function tokenizeMath(input) {
  let s = String(input)
    .replace(/,/g, ".")
    .replace(/[×xX]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/π/g, "Math.PI")
    .replace(/\be\b/g, "Math.E");

  const tokens = [];
  let i = 0;

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    const rest = s.slice(i);

    // Funksiyalar
    const fnMatch = rest.match(/^(sqrt|sin|cos|tan|log|ln|abs)\b/i);
    if (fnMatch) {
      tokens.push({ type: "fn", value: fnMatch[1].toLowerCase() });
      i += fnMatch[0].length;
      continue;
    }

    // Matematik doimiylar
    if (rest.startsWith("Math.PI")) {
      tokens.push({ type: "number", value: Math.PI });
      i += 7;
      continue;
    }
    if (rest.startsWith("Math.E")) {
      tokens.push({ type: "number", value: Math.E });
      i += 6;
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

    // Operatorlar
    if ("+-*/%^()".includes(s[i])) {
      tokens.push({ type: s[i], value: s[i] });
      i++;
      continue;
    }

    throw Error("Noma’lum belgi: " + s[i]);
  }

  if (!tokens.length) throw Error("Misol kiriting.");
  return tokens;
}

function evaluateTokens(tokens) {
  let pos = 0;

  function primary() {
    const t = tokens[pos];
    if (!t) throw Error("Misol tugallanmagan.");

    if (t.type === "+" || t.type === "-") {
      pos++;
      const v = primary();
      return t.type === "-" ? -v : v;
    }

    if (t.type === "fn") {
      const fnName = t.value;
      pos++;
      let arg;
      if (tokens[pos] && tokens[pos].type === "(") {
        pos++; // '('
        arg = addSub();
        if (!tokens[pos] || tokens[pos].type !== ")") throw Error("Qavs yopilmadi.");
        pos++; // ')'
      } else {
        arg = primary();
      }

      if (fnName === "sqrt") {
        if (arg < 0) throw Error("Manfiy sondan ildiz chiqmaydi.");
        return Math.sqrt(arg);
      }
      if (fnName === "sin") return Math.sin(arg * Math.PI / 180);
      if (fnName === "cos") return Math.cos(arg * Math.PI / 180);
      if (fnName === "tan") return Math.tan(arg * Math.PI / 180);
      if (fnName === "log") return Math.log10(arg);
      if (fnName === "ln") return Math.log(arg);
      if (fnName === "abs") return Math.abs(arg);
      return arg;
    }

    if (t.type === "number") {
      pos++;
      return t.value;
    }

    if (t.type === "(") {
      pos++;
      const val = addSub();
      if (!tokens[pos] || tokens[pos].type !== ")") throw Error("Qavslar mos emas.");
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
      if (!Number.isFinite(a)) throw Error("Natija cheksiz darajada katta.");
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
      if (!Number.isFinite(a)) throw Error("Natija juda katta.");
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

  const result = addSub();
  if (pos !== tokens.length) throw Error("Tushunarsiz qism: " + tokens[pos].value);
  return result;
}

function calculateExpression(input) {
  const tokens = tokenizeMath(input);
  return evaluateTokens(tokens);
}

function formatResult(n) {
  if (!Number.isFinite(n)) throw Error("Natija chekli son emas.");
  if (Object.is(n, -0)) n = 0;
  if (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-8)) {
    return n.toExponential(8).replace(/\.?0+e/, "e");
  }
  return String(Number(n.toPrecision(12)));
}

/* ==========================================================
   4. UI DISPLAY & EXECUTION
   ========================================================== */
function notify(msg) {
  DOM.toastPopup.textContent = msg;
  DOM.toastPopup.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    DOM.toastPopup.classList.remove("show");
  }, 2600);
}

function execute(expr, opts = { speak: false, source: "user" }) {
  try {
    const raw = String(expr).trim();
    if (!raw) throw Error("Misolni ayting yoki kiriting.");

    const res = calculateExpression(raw);
    const formatted = formatResult(res);

    state.currentExpression = raw;
    state.lastResult = res;

    DOM.expressionView.textContent = raw;
    DOM.resultView.textContent = formatted;
    DOM.keyboardInput.value = raw;
    DOM.engineStatusBadge.textContent = "HISOBLANDI ✓";
    DOM.engineStatusBadge.style.color = "var(--neon-emerald)";

    playSound("success");
    addHistoryItem(raw, formatted);

    if (opts.speak && state.ttsEnabled) {
      speakText("Natija " + formatted);
    } else {
      notify("Natija: " + formatted);
    }

    return res;
  } catch (err) {
    DOM.engineStatusBadge.textContent = "XATOLIK ✕";
    DOM.engineStatusBadge.style.color = "var(--neon-rose)";
    notify(err.message || "Misolni hisoblab bo‘lmadi.");
    return null;
  }
}

function clearScreen() {
  state.currentExpression = "";
  state.lastResult = 0;
  DOM.expressionView.textContent = "Misolni ayting yoki yozing";
  DOM.resultView.textContent = "0";
  DOM.keyboardInput.value = "";
  DOM.liveSpeechText.textContent = "Ovozingiz real vaqtda shu yerda aks etadi...";
  DOM.engineStatusBadge.textContent = "AI ENGINE TAYYOR";
  DOM.engineStatusBadge.style.color = "var(--neon-emerald)";
  playSound("clear");
}

/* ==========================================================
   5. LOCALSTORAGE HISTORY
   ========================================================== */
function loadHistory() {
  try {
    const data = localStorage.getItem("voice_calc_history_v2");
    if (data) {
      state.history = JSON.parse(data);
      renderHistory();
    }
  } catch (e) {
    state.history = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem("voice_calc_history_v2", JSON.stringify(state.history));
  } catch (e) {}
}

function addHistoryItem(formula, value) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.history.unshift({ formula, value, time });
  state.history = state.history.slice(0, 35);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  DOM.historyContainer.replaceChildren();

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.innerHTML = `<span class="empty-emoji">🪐</span><p>Hozircha hisoblashlar yo‘q.<br>Mikrofonni bosing va gapiring!</p>`;
    DOM.historyContainer.appendChild(empty);
    return;
  }

  state.history.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-item-pro";
    card.title = "Qayta hisoblash uchun bosing";

    const fEl = document.createElement("div");
    fEl.className = "history-formula";
    fEl.textContent = `${item.formula}  (${item.time})`;

    const vEl = document.createElement("div");
    vEl.className = "history-value";
    vEl.textContent = `= ${item.value}`;

    card.append(fEl, vEl);
    card.addEventListener("click", () => {
      playSound("click");
      execute(item.formula, { speak: false });
    });

    DOM.historyContainer.appendChild(card);
  });
}

DOM.clearHistoryBtn.addEventListener("click", () => {
  state.history = [];
  saveHistory();
  renderHistory();
  notify("Tarix tozalandi.");
  playSound("clear");
});

/* ==========================================================
   6. TEXT-TO-SPEECH (TTS)
   ========================================================== */
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;

  const voices = speechSynthesis.getVoices();
  const lang = state.currentLang;
  let voice = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
  if (!voice && lang === "uz-UZ") {
    voice = voices.find(v => v.lang.startsWith("ru")) || voices[0];
  }
  if (voice) utter.voice = voice;

  speechSynthesis.speak(utter);
}

DOM.toggleTtsBtn.addEventListener("click", () => {
  state.ttsEnabled = !state.ttsEnabled;
  DOM.toggleTtsBtn.classList.toggle("active", state.ttsEnabled);
  DOM.ttsIcon.textContent = state.ttsEnabled ? "🔊" : "🔇";
  DOM.ttsLabel.textContent = state.ttsEnabled ? "Ovoz: Yoniq" : "Ovoz: O‘chiq";
  notify(state.ttsEnabled ? "Ovozli natija yoqildi" : "Ovozli natija o‘chirildi");
  playSound("click");
});

DOM.toggleSfxBtn.addEventListener("click", () => {
  state.sfxEnabled = !state.sfxEnabled;
  DOM.toggleSfxBtn.classList.toggle("active", state.sfxEnabled);
  DOM.sfxIcon.textContent = state.sfxEnabled ? "🎵" : "🔇";
  notify(state.sfxEnabled ? "Tovush effektlari yoqildi" : "Tovush effektlari o‘chirildi");
  if (state.sfxEnabled) playSound("click");
});

DOM.speakResultBtn.addEventListener("click", () => {
  speakText("Natija " + formatResult(state.lastResult));
  playSound("click");
});

/* ==========================================================
   7. WEB SPEECH API v2.0 (MULTI-ALTERNATIVE RECOGNITION)
   ========================================================== */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

function setListeningUI(active) {
  state.isListening = active;
  DOM.mainMicBtn.classList.toggle("listening", active);
  DOM.pulseRing.classList.toggle("listening", active);

  if (active) {
    DOM.statusLabel.textContent = "Tinglanmoqda...";
    DOM.orbTitle.textContent = "Diqqat, tinglayapman...";
    DOM.orbDesc.textContent = "Misolni erkin ayting (to‘xtatish uchun bosing)";
    DOM.mainMicIcon.textContent = "⏹";
    DOM.engineStatusBadge.textContent = "TINGLAYAPMAN...";
    DOM.engineStatusBadge.style.color = "var(--neon-rose)";
    playSound("mic_start");
  } else {
    DOM.statusLabel.textContent = "Mikrofon tayyor";
    DOM.orbTitle.textContent = "Bosing va misolni ayting";
    DOM.orbDesc.textContent = "O‘zbekcha, Ruscha yoki Inglizcha erkin gapiring";
    DOM.mainMicIcon.textContent = "🎙️";
  }
}

function initSpeech() {
  if (!SpeechRec) {
    DOM.statusLabel.textContent = "Mikrofon qo‘llab-quvvatlanmaydi";
    DOM.mainMicBtn.addEventListener("click", () => {
      notify("Brauzeringizda Web Speech API mavjud emas. Google Chrome'dan foydalaning.");
    });
    return;
  }

  const rec = new SpeechRec();
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 5; // 5 tagacha muqobil transkripsiyani olish!
  rec.lang = state.currentLang;

  let finalTranscript = "";
  let capturedAlternatives = [];

  rec.onstart = () => {
    finalTranscript = "";
    capturedAlternatives = [];
    setListeningUI(true);
  };

  rec.onresult = (event) => {
    let interim = "";
    finalTranscript = "";
    capturedAlternatives = [];

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += res[0].transcript + " ";
        // Muqobil variantlarni yig'ish
        for (let j = 0; j < res.length; j++) {
          capturedAlternatives.push(res[j].transcript);
        }
      } else {
        interim += res[0].transcript;
      }
    }

    const currentSpoken = (finalTranscript + interim).trim();
    if (currentSpoken) {
      DOM.liveSpeechText.textContent = `“${currentSpoken}”`;
    }
  };

  rec.onerror = (event) => {
    setListeningUI(false);
    const msgs = {
      "not-allowed": "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida mikrofonga ruxsat bering.",
      "no-speech": "Ovoz eshitilmadi. Qaytadan aniq ayting.",
      "audio-capture": "Mikrofon topilmadi.",
      "network": "Tarmoq xatosi. Internet aloqasini tekshiring."
    };
    DOM.liveSpeechText.textContent = msgs[event.error] || ("Ovoz xatosi: " + event.error);
    notify(msgs[event.error] || "Ovoz tanish xatosi");
  };

  rec.onend = () => {
    setListeningUI(false);
    const spoken = finalTranscript.trim();
    if (!spoken) return;

    DOM.liveSpeechText.textContent = `Eshitildi: “${spoken}”`;

    // 1-bosqich: Eng asosiy transkripsiya orqali parse qilish
    let parsedExpr = speechToMathExpression(spoken);

    // Agar buyruq bo'lsa
    if (parsedExpr && parsedExpr.type === 'COMMAND') {
      if (parsedExpr.command === 'CLEAR') clearScreen();
      return;
    }

    // 2-bosqich: Agar asosiy matndan tushunarsiz bo'lsa, muqobil variantlarni tekshirish!
    if (!parsedExpr || (typeof parsedExpr === 'string' && !/[+\-*/%^]|\d/.test(parsedExpr))) {
      for (const alt of capturedAlternatives) {
        const altParsed = speechToMathExpression(alt);
        if (altParsed && typeof altParsed === 'string' && /[+\-*/%^]|\d/.test(altParsed)) {
          parsedExpr = altParsed;
          break;
        }
      }
    }

    // 3-bosqich: Agar hali ham tushunilmagan bo'lsa, to'g'ridan-to'g'ri hisoblash
    try {
      if (!parsedExpr) throw Error("Ovozdan misol tushunilmadi.");
      DOM.keyboardInput.value = parsedExpr;
      const res = execute(parsedExpr, { speak: true, source: "voice" });
      if (res !== null) {
        DOM.liveSpeechText.textContent = `“${spoken}” → ${parsedExpr} = ${formatResult(res)}`;
      }
    } catch (e) {
      DOM.expressionView.textContent = spoken;
      notify("Misolni aniqlab bo‘lmadi. Qaytadan aniq ayting.");
    }
  };

  state.recognition = rec;

  DOM.mainMicBtn.addEventListener("click", () => {
    if (state.isListening) {
      rec.stop();
      return;
    }
    try {
      rec.lang = state.currentLang;
      rec.start();
    } catch (e) {
      notify("Mikrofon band. Bir ozdan so‘ng qayta bosing.");
    }
  });
}

// Til o'zgartirilganda
DOM.langSelector.addEventListener("change", (e) => {
  state.currentLang = e.target.value;
  if (state.recognition) {
    state.recognition.lang = state.currentLang;
  }
  notify("Til tanlandi: " + e.target.options[e.target.selectedIndex].text);
  playSound("click");
});

/* ==========================================================
   8. KEYPAD & MANUAL CONTROLS
   ========================================================== */
DOM.toggleSciBtn.addEventListener("click", () => {
  state.scientificMode = !state.scientificMode;
  DOM.toggleSciBtn.classList.toggle("active", state.scientificMode);
  DOM.sciKeysRow.classList.toggle("show", state.scientificMode);
  playSound("click");
});

DOM.evalBtn.addEventListener("click", () => {
  playSound("click");
  execute(DOM.keyboardInput.value, { speak: false });
});

DOM.keyboardInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    playSound("click");
    execute(DOM.keyboardInput.value, { speak: false });
  }
});

// Klaviatura tugmalari (Delegation)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;

  playSound("click");
  const key = btn.dataset.key;
  const input = DOM.keyboardInput;

  if (key === "AC") {
    clearScreen();
    return;
  }

  if (key === "=") {
    execute(input.value, { speak: false });
    return;
  }

  if (key === "BACKSPACE") {
    input.value = input.value.slice(0, -1);
    DOM.expressionView.textContent = input.value || "Misolni ayting yoki yozing";
    return;
  }

  if (key === "^2") {
    input.value += "^2";
    DOM.expressionView.textContent = input.value;
    input.focus();
    return;
  }

  input.value += key;
  DOM.expressionView.textContent = input.value;
  input.focus();
});

// Tezkor misollar (Prompts)
document.querySelectorAll(".prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    playSound("click");
    const speech = chip.dataset.speech;
    DOM.liveSpeechText.textContent = `Sinov: “${speech}”`;
    try {
      const parsed = speechToMathExpression(speech);
      DOM.keyboardInput.value = parsed;
      execute(parsed, { speak: true });
    } catch (e) {
      notify(e.message);
    }
  });
});

DOM.clearAllBtn.addEventListener("click", clearScreen);

DOM.copyResultBtn.addEventListener("click", async () => {
  playSound("click");
  try {
    await navigator.clipboard.writeText(DOM.resultView.textContent);
    notify("Nusxa olindi: " + DOM.resultView.textContent);
  } catch (e) {
    notify("Nusxalash imkonsiz");
  }
});

// Klaviaturadan to'g'ridan-to'g'ri foydalanish
window.addEventListener("keydown", (e) => {
  if (document.activeElement === DOM.keyboardInput) return;

  if (e.key >= "0" && e.key <= "9") {
    DOM.keyboardInput.value += e.key;
    DOM.expressionView.textContent = DOM.keyboardInput.value;
  } else if ("+-*/%^().".includes(e.key)) {
    DOM.keyboardInput.value += e.key;
    DOM.expressionView.textContent = DOM.keyboardInput.value;
  } else if (e.key === "Enter") {
    e.preventDefault();
    execute(DOM.keyboardInput.value, { speak: false });
  } else if (e.key === "Backspace") {
    DOM.keyboardInput.value = DOM.keyboardInput.value.slice(0, -1);
    DOM.expressionView.textContent = DOM.keyboardInput.value || "Misolni ayting yoki yozing";
  } else if (e.key === "Escape") {
    clearScreen();
  }
});

/* ==========================================================
   9. INITIALIZE
   ========================================================== */
function initApp() {
  loadHistory();
  initSpeech();
}

document.addEventListener("DOMContentLoaded", initApp);
