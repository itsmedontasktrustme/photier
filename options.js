const defaults = {
  model: "gemini-4-hydrogen",
  prompt: "Evaluate this selected portion of a web page. Summarize it, identify issues or concerns, and provide actionable recommendations."
};

chrome.storage.sync.get({ apiKey: "", ...defaults }, ({ apiKey, model, prompt }) => {
  document.querySelector("#apiKey").value = apiKey;
  document.querySelector("#model").value = model;
  document.querySelector("#prompt").value = prompt;
});

document.querySelector("#save").addEventListener("click", async () => {
  const apiKey = document.querySelector("#apiKey").value.trim();
  const model = document.querySelector("#model").value.trim() || defaults.model;
  const prompt = document.querySelector("#prompt").value.trim() || defaults.prompt;
  await chrome.storage.sync.set({ apiKey, model, prompt });
  const status = document.querySelector("#status");
  status.textContent = "Saved";
  setTimeout(() => { status.textContent = ""; }, 1800);
});
