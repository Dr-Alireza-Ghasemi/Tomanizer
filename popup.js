const CACHE_KEY = "tomanizer_cache";

function renderUI(data) {
  if (!data) return;
  const usd = data.dollarToman || 0;
  const fx = data.fxRates || {};

  document.getElementById("timeVal").textContent = data.updatedAt || "--:--";
  document.getElementById("sourceVal").textContent = data.source || "TGJU";

  const list = {
    "USD": usd,
    "EUR": fx["EUR"] ? Math.round(usd / fx["EUR"]) : null,
    "AED": fx["AED"] ? Math.round(usd / fx["AED"]) : null,
    "GBP": fx["GBP"] ? Math.round(usd / fx["GBP"]) : null,
    "CNY": fx["CNY"] ? Math.round(usd / fx["CNY"]) : null,
    "TRY": fx["TRY"] ? Math.round(usd / fx["TRY"]) : null,
    "INR": fx["INR"] ? Math.round(usd / fx["INR"]) : null,
    "OMR": fx["OMR"] ? Math.round(usd / fx["OMR"]) : null,
    "KWD": fx["KWD"] ? Math.round(usd / fx["KWD"]) : null
  };

  for (const [key, val] of Object.entries(list)) {
    const el = document.getElementById("rate-" + key);
    if (el) {
      el.textContent = (val && val > 0) ? val.toLocaleString("en-US") + " ت" : "---";
    }
  }
}

async function fetchFromTGJU() {
  const res = await fetch("https://www.tgju.org/", {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!res.ok) throw new Error("Status: " + res.status);
  const html = await res.text();
  
  const marker = 'id="l-price_dollar_rl"';
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error("Marker not found");
  
  const block = html.substring(idx, idx + 4000);
  const priceIdx = block.indexOf("info-price");
  if (priceIdx === -1) throw new Error("info-price not found");

  const sub = block.substring(priceIdx);
  const start = sub.indexOf(">") + 1;
  const end = sub.indexOf("<", start);
  const rawPrice = sub.substring(start, end).replace(/,/g, "").trim();

  const irr = parseFloat(rawPrice);
  if (isNaN(irr) || irr <= 10000) throw new Error("Bad IRR");
  return Math.round(irr / 10);
}

async function fetchFX() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = await res.json();
    return json.rates || {};
  } catch (e) {
    return {};
  }
}

async function syncRates() {
  let dollarToman = 0;
  let source = "TGJU";

  try {
    dollarToman = await fetchFromTGJU();
  } catch (e) {
    console.warn("TGJU error, using cache/fallback:", e);
    const store = await chrome.storage.local.get(CACHE_KEY);
    dollarToman = store?.[CACHE_KEY]?.dollarToman || 93000;
    source = "آفلاین / ذخیره";
  }

  const fxRates = await fetchFX();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const payload = {
    dollarToman,
    fxRates,
    source,
    updatedAt: timeStr
  };

  await chrome.storage.local.set({ [CACHE_KEY]: payload });
  renderUI(payload);
  return payload;
}

// لود اولیه: فوراً از کش می‌خواند تا سه‌نقطه نباشد، بعد خودکار سینک می‌کند
chrome.storage.local.get(CACHE_KEY, (res) => {
  if (res && res[CACHE_KEY]) {
    renderUI(res[CACHE_KEY]);
  } else {
    syncRates();
  }
});

// کلیک دکمه بروزرسانی
const btn = document.getElementById("refreshBtn");
btn.addEventListener("click", async () => {
  btn.textContent = "صبر کنید...";
  btn.disabled = true;
  try {
    await syncRates();
  } finally {
    btn.textContent = "بروزرسانی";
    btn.disabled = false;
  }
});
