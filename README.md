# HLTV Fantasy Hard Mode

Do you ever feel like HLTV is giving you too much of a crutch when you are picking your player roles and boosters by giving you the trigger rates when you are picking? Then this extension is for you! This is a simple addon that silently removes the `.booster-trigger-container` and `.booster-trigger-rate-container` elements when you draft a fantasy roster so your HLTV fantasy experience is focused purely on your skill and intuition.

Toggle behavior
- Click the extension icon to open the popup. Use the "Auto-hide overlay" toggle to enable or disable the automatic hiding. When disabled the extension will restore any elements it previously hid during the session.

Local development
1. Open Chrome (or Chromium) and go to chrome://extensions
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked" and select the `src/` directory in this repo
4. Open the HLTV fantasy draft flow — the booster overlay should be removed immediately.

Build/pack
- `npm run build` copies `src/` -> `dist/`:

This just prepares a `dist/` folder suitable for packaging.
