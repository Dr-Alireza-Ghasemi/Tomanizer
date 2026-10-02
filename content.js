let dollarToman = 0;
let fxRates = {};

const SYMBOL_MAP = {
  "$": "USD",
  "USD": "USD",
  "€": "EUR",
  "EUR": "EUR",
  "£": "GBP",
  "GBP": "GBP",
  "AED": "AED",
  "د.إ": "AED",
  "SAR": "SAR",
  "ر.س": "SAR",
  "TRY": "TRY",
  "₺": "TRY",
  "¥": "CNY",
  "CNY": "CNY",
  "₹": "INR",
  "OMR": "OMR",
  "KWD": "KWD"
};

function convertToToman(amount, currencyCode) {
  if (!dollarToman || dollarToman <= 0) return null;
  currencyCode = (currencyCode || "USD").toUpperCase();

  let inUSD = amount;
  if (currencyCode !== "USD") {
    const rateToUSD = fxRates[currencyCode];
    if (!rateToUSD || rateToUSD <= 0) return null;
    inUSD = amount / rateToUSD;
  }

  return Math.round(inUSD * dollarToman);
}

function createBadge(tomanValue) {
  const span = document.createElement("span");
  span.className = "toman-badge";
  span.textContent = `${tomanValue.toLocaleString("en-US")} تومان`;
  return span;
}

function processPriceElement(el, rawText) {
  if (!rawText || el.dataset.tomanDone === "true") return;

  // جلوگیری از ایجاد نشانگر تکراری روی والد یا فرزند
  if (el.querySelector(".toman-badge") || el.nextElementSibling?.classList?.contains("toman-badge")) {
    el.dataset.tomanDone = "true";
    return;
  }

  // پیدا کردن نماد ارز
  let detectedCurr = null;
  for (const [sym, code] of Object.entries(SYMBOL_MAP)) {
    if (rawText.includes(sym)) {
      detectedCurr = code;
      break;
    }
  }
  if (!detectedCurr) return;

  // استخراج الگوی عدد قیمت (مانند $488.79 یا 199.99)
  const match = rawText.match(/(?:[\$€£₺¥₹]|AED|SAR|TRY|CNY|INR|OMR|KWD)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
  if (!match || !match[1]) return;

  const num = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(num) || num <= 0) return;

  const toman = convertToToman(num, detectedCurr);
  if (toman && toman > 0) {
    el.dataset.tomanDone = "true";
    const badge = createBadge(toman);
    el.insertAdjacentElement("afterend", badge);
  }
}

function scanPage() {
  // ۱. آمازون: قیمت‌های اصلی (فقط یک‌بار روی والد اصلی .a-price)
  document.querySelectorAll(".a-price:not([data-toman-done])").forEach(el => {
    // نادیده گرفتن المنت‌های فرزند داخلی
    if (el.closest(".a-price") !== el) return;
    
    const offscreen = el.querySelector(".a-offscreen");
    const priceText = offscreen ? offscreen.textContent : el.textContent;
    processPriceElement(el, priceText);
  });

  // ۲. گزینه‌های سایز، دکمه‌های تنوع و باکس‌ها (مانند عکس دوم: 14000 BTU / 6 options from $488.79)
  document.querySelectorAll('li[id*="size_name_"] p, li[id*="style_name_"] p, .twisterTextDiv, [class*="dimension-slot"] p, span.a-size-mini').forEach(el => {
    if (!el.dataset.tomanDone && (el.textContent.includes("$") || el.textContent.includes("€") || el.textContent.includes("AED"))) {
      processPriceElement(el, el.textContent);
    }
  });

  // ۳. سایر فروشگاه‌ها (AliExpress / Noon / Alibaba)
  document.querySelectorAll('[class*="price"]:not([data-toman-done]):not(.a-price):not(.a-price-whole):not(.a-price-fraction)').forEach(el => {
    if (el.children.length === 0 && el.textContent.trim().length > 1) {
      processPriceElement(el, el.textContent);
    }
  });
}

// گوش دادن به داده‌ها
chrome.runtime.sendMessage({ type: "GET_DATA" }, (res) => {
  if (res && res.dollarToman) {
    dollarToman = res.dollarToman;
    fxRates = res.fxRates || {};

    scanPage();

    const observer = new MutationObserver(() => scanPage());
    observer.observe(document.body, { childList: true, subtree: true });
  }
});
