(() => {
  if (window.__geminiPageEvaluatorActive) return;
  window.__geminiPageEvaluatorActive = true;

  const status = document.createElement("div");
  status.id = "gemini-selection-status";
  status.textContent = "Sending the whole visible screen to Gemini…";
  document.documentElement.appendChild(status);

  const rect = {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight
  };

  let shakeDirectionChanges = 0;
  let shakePreviousDirection = null;
  let shakeResetTimer = null;

  function closeGeminiUi() {
    status.remove();
    document.querySelector("#gemini-result-panel")?.remove();
    window.__geminiPageEvaluatorActive = false;
  }

  function onShakeMouseMove(event) {
    clearTimeout(shakeResetTimer);
    shakeResetTimer = setTimeout(() => {
      shakeDirectionChanges = 0;
      shakePreviousDirection = null;
    }, 500);

    const dx = event.movementX;
    if (Math.abs(dx) < 8) return;

    const direction = Math.sign(dx);
    if (shakePreviousDirection !== null && direction !== shakePreviousDirection) {
      shakeDirectionChanges += 1;
      if (shakeDirectionChanges >= 3) {
        closeGeminiUi();
        window.removeEventListener("mousemove", onShakeMouseMove);
        clearTimeout(shakeResetTimer);
      }
    }

    shakePreviousDirection = direction;
  }

  window.removeEventListener("mousemove", onShakeMouseMove);
  window.addEventListener("mousemove", onShakeMouseMove);

  chrome.runtime.sendMessage({
    type: "SELECTED_AREA",
    payload: {
      rect,
      text: document.body?.innerText?.trim() || "",
      url: location.href
    }
  }, (response) => {
    status.remove();

    if (response?.ok) {
      showResult(response.result);
    } else {
      showResult(`Error: ${response?.error || "Unknown error"}`);
    }
  });

  function showResult(text) {
    document.querySelector("#gemini-result-panel")?.remove();

    const panel = document.createElement("aside");
    panel.id = "gemini-result-panel";
    panel.innerHTML = `<div class="gemini-result-header"><strong>Gemini evaluation</strong></div><div class="gemini-result-content"></div>`;
    panel.querySelector(".gemini-result-content").textContent = text;
    document.documentElement.appendChild(panel);
  }
})();
