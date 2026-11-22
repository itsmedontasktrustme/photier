chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;

  if (/^(chrome|chrome-extension|edge|about):/.test(tab.url)) {
    console.warn("Gemini Page Evaluator cannot run on browser-internal pages:", tab.url);
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["selector.css"]
    });
  } catch (error) {
    console.error("Failed to insert selector CSS:", error);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.querySelector("#gemini-selection-status")?.remove();
        document.querySelector("#gemini-result-panel")?.remove();
        window.__geminiPageEvaluatorActive = false;
        window.__geminiPageEvaluatorShake?.();
      }
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch (error) {
    console.error("Failed to start page selector:", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SELECTED_AREA") {
    evaluateSelection(message.payload, sender.tab?.id)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "PING") {
    sendResponse({ ok: true });
  }
});

async function evaluateSelection(payload, tabId) {
  const { apiKey, model, prompt } = await chrome.storage.sync.get({
    apiKey: "",
    model: "gemini-4-hydrogen",
    prompt: "Evaluate this selected portion of a web page. Summarize it, identify issues or concerns, and provide actionable recommendations."
  });

  if (!apiKey) {
    throw new Error("Add a Gemini API key in the extension options.");
  }

  const crop = await cropVisibleScreenshot(tabId, payload.rect);
  const text = payload.text?.trim();
  const parts = [{ text: `${prompt}\n\nPage: ${payload.url}\nSelected text:\n${text || "[No text selected]"}` }];

  if (crop) {
    parts.push({ inlineData: { mimeType: "image/png", data: crop } });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || `Gemini request failed (${response.status})`;
    throw new Error(`${message} Check that your API project/billing region supports the configured model: ${model}`);
  }

  const result = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!result) throw new Error("Gemini returned no evaluation text.");
  return result;
}

async function cropVisibleScreenshot(tabId, rect) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const dpr = await chrome.tabs
      .get(tabId)
      .then(async (tab) => {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.devicePixelRatio
        });
        return Math.max(1, result || 1);
      })
      .catch(() => 1);
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.floor(rect.width * dpr)),
      Math.max(1, Math.floor(rect.height * dpr))
    );
    const context = canvas.getContext("2d");
    context.drawImage(
      bitmap,
      rect.left * dpr,
      rect.top * dpr,
      rect.width * dpr,
      rect.height * dpr,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedBlob = await canvas.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await croppedBlob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  } catch (error) {
    console.warn("Screenshot crop unavailable:", error);
    return null;
  }
}
