const CACHE_KEY = "tomanizer_cache";

chrome.runtime.onInstalled.addListener(async () => {
  const store = await chrome.storage.local.get(CACHE_KEY);
  if (!store?.[CACHE_KEY]) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await chrome.storage.local.set({
      [CACHE_KEY]: {
        dollarToman: 93000,
        fxRates: { EUR: 0.92, AED: 3.67, GBP: 0.79, CNY: 7.23, TRY: 34.1, INR: 83.5, OMR: 0.38, KWD: 0.31 },
        source: "TGJU",
        updatedAt: timeStr
      }
    });
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_DATA") {
    chrome.storage.local.get(CACHE_KEY).then(res => {
      sendResponse(res[CACHE_KEY] || { dollarToman: 93000, fxRates: {} });
    });
    return true;
  }
});
