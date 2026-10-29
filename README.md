# 🎙️ Voice Calculator Pro (Aqlli Ovozli Kalkulyator)

Zamonaviy, tezkor va sun'iy intellektga asoslangan aqlli ovozli kalkulyator veb-ilovasi. Foydalanuvchi matematik misollarni og'zaki aytishi, ekranda yozishi yoki tugmalar orqali kiritishi mumkin.

---

## 🌟 Asosiy Xususiyatlar va Imkoniyatlar

1. **🎙️ Kengaytirilgan Ovoz Tanish (Smart Speech-to-Math):**
   - O'zbek tilining tabiiy grammatikasi (SOV sintaksisi) to'liq qo'llab-quvvatlanadi:
     - *“yuzdan yigirma ayir”* $\rightarrow$ `100 - 20 = 80`
     - *“ellikga o‘nni qo‘sh”* $\rightarrow$ `50 + 10 = 60`
     - *“yetti ko‘paytir sakkiz”* $\rightarrow$ `7 × 8 = 56`
     - *“to‘qson olti bo‘luv o‘n ikki”* $\rightarrow$ `96 ÷ 12 = 8`
     - *“yuz ellikning yigirma foizi”* $\rightarrow$ `(150 × 20) / 100 = 30`
     - *“ildiz oltmish to‘rt”* $\rightarrow$ `√64 = 8`
     - *“beshning kvadrati”* $\rightarrow$ `5² = 25`
     - *“to‘rtning kubi”* $\rightarrow$ `4³ = 64`
   - O'zbek, Rus va Ingliz tillarida ovoz tanish imkoniyati.
   - Kirill va Lotin alifbosidagi nutqlarni avtomatik transliteratsiya qilish.
   - So'zlar oxiridagi kelishik qo'shimchalarini (`-dan`, `-ga`, `-ni`, `-ning`, `-ta`) aqlli ajratish (Stemming).

2. **🔊 Ovozli Javob Qaytarish (Text-to-Speech):**
   - Natijalarni ovozli o'qib berish.
   - Ovozli javobni bir bosish bilan yoqish/o'chirish imkoniyati.

3. **⚡ Xavfsiz va Kuchli Matematik Dvigatel:**
   - Xavfsiz AST/recursive-descent tokenizer va parser (`eval()` ishlatilmaydi).
   - Qavslar, darajalar (`^`), foizlar, kvadrat ildiz (`sqrt`), arifmetik amallar.
   - 0 ga bo'lish va cheksiz qiymatlarni xavfsiz boshqarish.

4. **📋 Tarix va Saqlash (History & LocalStorage):**
   - Barcha hisob-kitoblar brauzer xotirasida (`localStorage`) saqlanadi.
   - Tarixdagi har qanday misolga bosib uni qayta hisoblash imkoniyati.

5. **🎨 Premium Dark UI & Glassmorphism:**
   - Moslashuvchan (Responsive) zamonaviy dizayn (Mobile, Tablet, Desktop).
   - Mikrofonga ovoz to'lqinlari (Equalizer Wave Visualizer).
   - Natijani bir bosishda buferga nusxalash (Copy to clipboard).

---

## 🛠️ Loyihada Bartaraf Etilgan Kamchiliklar

Oldingi versiyada quyidagi jiddiy xatoliklar mavjud edi:
1. **O'zbekcha so'zlarning tanilmasligi:** Foydalanuvchi "yuzdan yigirma ayir" deganda, parser "yuzdan" so'zini tushunmay `Son so'zini tushunmadim: yuzdan` degan xato berar edi. Kelishik qo'shimchalari (`-dan`, `-ga`, `-ni`) ajratilmas edi.
2. **Tabiiy gap sintaksisi (Infix vs Postfix):** O'zbek tilida amal oxirida aytilganda (masalan, "yuzdan yigirma ayir"), amal belgisi sonlarning orasiga qo'yilmasdan `120 -` bo'lib noto'g'ri chiqib qolar edi.
3. **Kirill alifbosi muammosi:** Google Web Speech API ba'zan nutqni kirillcha (masalan `йигирма беш қўшув ўн беш`) qilib yuborishi natijasida dastur umuman ishlamay qolar edi. Endi avtomatik transliteratsiya qo'shildi.
4. **Ildiz va darajalar:** `calculate()` funksiyasida `sqrt` funksiyasi va darajalar tokenize qilinmas edi. Endi to'liq qo'llab-quvvatlanadi.
5. **Speech Recognition uzilishlari:** `onresult` voqeasida transkriptlarni noto'g'ri qo'shish sababli ovoz bir necha marta takrorlanib ketar edi.

---

## 🚀 Texnologiyalar

- **HTML5** & **CSS3** (CSS Grid, Flexbox, Custom Properties, Glassmorphism)
- **Vanilla JavaScript (ES6+)**
- **Web Speech API** (`SpeechRecognition` & `SpeechSynthesis`)
- **Vercel** (Cloud Deployment)
- **Git & GitHub**

---

## 💻 Mahalliy Ishga Tushirish

```bash
# Repozitoriyani klonlash
git clone https://github.com/Jahon214/smart_calculator.git

# Papkaga kirish
cd smart_calculator

# Brauzerda ochish (yoki VS Code Live Server orqali)
# index.html faylini ikki marta bosing yoki:
npx serve .
```

*Eslatma: Web Speech API (mikrofon) xavfsizlik talablariga ko'ra `localhost` yoki `https://` protokoli orqali ishlaydi.*
