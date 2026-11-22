# Gemini Page Evaluator

A Chrome Manifest V3 extension that lets you drag across a portion of the current page, capture both its visible screenshot and extracted text, and send it to Gemini for evaluation.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this directory.
5. Open the extension's **Details** or right-click its toolbar icon and choose **Extension options**.
6. Enter your Gemini API key and save.

## Use

1. Click the extension toolbar icon on a page.
2. Drag to select a rectangular area.
3. The screenshot and available text are sent to Gemini.
4. Review the evaluation in the floating panel.

Press `Esc` to cancel selection.

## Permissions and privacy

- The API key is stored with `chrome.storage.sync`.
- Selected text and cropped page pixels are sent directly to Google's Gemini API only when you submit a selection.
- The extension requires host permission for `generativelanguage.googleapis.com`.
