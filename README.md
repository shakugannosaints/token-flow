# Token Flow

**FoundryVTT v13 compatible rebuild of [Token Ease](https://github.com/fantasycalendar/FoundryVTT-TokenEase)**

Maintained by [shakugannosaints](https://github.com/shakugannosaints/)

---

## Overview

Token Ease lets Game Masters and players customise how tokens animate when they move on the canvas. You can control:

- **Movement Speed** — spaces per second (default Foundry value: 6)
- **Movement Duration** — fixed animation time in milliseconds (overrides speed when > 0)
- **Easing Function** — choose from 31 easing curves (Linear, Sine, Quad, Cubic, Quart, Quint, Expo, Circ, Back, Elastic, Bounce)
- **Ease In / Out** — apply easing at the start, end, or both ends of each movement
- **Per-token overrides** — open the Token Ease panel from any token's config sheet to override the world defaults for that specific token
- **Instant Move Hotkey** — hold **Alt** while moving a token to skip animation entirely

---

## Installation

1. In Foundry VTT's **Add-on Modules** screen, click **Install Module**.
2. Paste the manifest URL:
   ```
   https://github.com/shakugannosaints/token-ease-v13/releases/latest/download/module.json
   ```
3. Click **Install**, then enable the module in your World.

---

## Usage

### World-wide defaults

Open **Game Settings → Configure Settings → Token Ease** to set the default animation speed, duration, and easing for all tokens.

### Per-token overrides

1. Right-click any token you own to open its context menu.
2. Click the **running-man icon** (🏃) labelled **Token Ease** in the sheet header.
3. Enable overrides with the checkbox and set your desired values.
4. Click **Save Changes**.

### Instant Move Hotkey

Hold **Alt** (default binding, re-bindable in **Configure Controls**) while moving a token via drag or keyboard to make it teleport instantly with no animation.

---

## v13 Rebuild Notes

The original Token Ease module used APIs that changed or were removed in FoundryVTT v13:

| Area | v12 / original | v13 rebuild |
|---|---|---|
| Config UI | `FormApplication` | `ApplicationV2` + `HandlebarsApplicationMixin` |
| Open windows list | `ui.windows` | `foundry.applications.instances` |
| CanvasAnimation | `CanvasAnimation[name]` (global) | `foundry.canvas.animation.CanvasAnimation[name]` |
| Debounce helper | `debounce()` (global) | `foundry.utils.debounce()` |
| Token config hook | `getTokenConfigHeaderButtons` | `getTokenConfigV2HeaderButtons` (+ fallback) |

---

## Credits

- **Original module**: [Token Ease](https://github.com/fantasycalendar/FoundryVTT-TokenEase) by **Wasp** (Haxxer) and **Kerrec Snowmane** (ggagnon76) — [Fantasy Calendar](https://app.fantasy-calendar.com/)
- **v13 rebuild**: [shakugannosaints](https://github.com/shakugannosaints/)

---

## License

This project is released under the [MIT License](LICENSE).  
The easing functions are adapted from [easings.net](https://easings.net/) (open reference implementations).
