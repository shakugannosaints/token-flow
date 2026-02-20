/**
 * Token Ease — v13 Rebuild
 *
 * Original module by Wasp & Kerrec Snowmane
 * (https://github.com/fantasycalendar/FoundryVTT-TokenEase)
 *
 * Rebuilt for FoundryVTT v13 by shakugannosaints
 * (https://github.com/shakugannosaints/)
 *
 * v13 movement architecture:
 *  - preUpdateToken no longer carries animation options through the update pipeline.
 *  - Token animation is driven by Token#animate(to, options: TokenAnimationOptions).
 *  - The correct extension points are the @protected methods on the Token canvas object:
 *      _getAnimationMovementSpeed(options) → number   (grid spaces / second)
 *      _getAnimationDuration(from, to, options) → number   (milliseconds; 0 = use speed)
 *      _getAnimationEasingFunction(options) → function | undefined
 *  - Register a Token subclass via CONFIG.Token.objectClass to override these.
 *  - Global default speed lives at CONFIG.Token.movement.defaultSpeed.
 */

import { configure_hotkeys, configure_settings, keyboardState } from "./settings.js";
import CONSTANTS from "./constants.js";
import TokenEaseConfig from "./token-ease-config-app.js";
import { easeFunctions } from "./lib/ease.js";

// ---------------------------------------------------------------------------
// Init — register settings, keybindings, and Token subclass
// ---------------------------------------------------------------------------
Hooks.once("init", () => {
	console.log("Token Ease (v13) | Initialising …");
	configure_settings();
	configure_hotkeys();

	// ------------------------------------------------------------------
	// Register a Token subclass that overrides the three protected methods
	// controlling animation speed, duration and easing.
	// ------------------------------------------------------------------
	class TokenEaseToken extends foundry.canvas.placeables.Token {

		/**
		 * Return the effective easing function for this token's movement.
		 * Reads (in priority order):
		 *   1. Per-token flag override  (set via the Token Ease config button)
		 *   2. World-level default-ease setting
		 *   3. Linear (Foundry default)
		 * @protected
		 * @param {TokenAnimationOptions} options
		 * @returns {Function|undefined}
		 */
		_getAnimationEasingFunction(options) {
			const tokenFlags = this.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG);
			const easeName = (tokenFlags?.enabled ? tokenFlags?.ease : undefined)
				?? game.settings.get(CONSTANTS.MODULE_NAME, "default-ease")
				?? "linear";

			return easeFunctions[easeName] ?? easeFunctions["linear"];
		}

		/**
		 * Return the base movement speed (grid spaces / second).
		 * @protected
		 * @param {TokenAnimationOptions} options
		 * @returns {number}
		 */
		_getAnimationMovementSpeed(options) {
			// Instant-move hotkey: return Infinity so duration collapses to 0.
			if (this.document.isOwner && keyboardState.instantMove) return Infinity;

			const tokenFlags = this.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG);
			return (tokenFlags?.enabled ? tokenFlags?.speed : undefined)
				?? game.settings.get(CONSTANTS.MODULE_NAME, "default-speed")
				?? CONFIG.Token.movement.defaultSpeed;
		}

		/**
		 * Return the animation duration in milliseconds.
		 * If the world/token setting specifies an explicit duration > 0, use it.
		 * Otherwise fall back to the speed-based calculation from the parent class.
		 * @protected
		 * @param {DeepReadonly<TokenAnimationData>} from
		 * @param {DeepReadonly<Partial<TokenAnimationData>>} to
		 * @param {TokenAnimationOptions} options
		 * @returns {number}
		 */
		_getAnimationDuration(from, to, options) {
			// Instant-move hotkey: zero duration.
			if (this.document.isOwner && keyboardState.instantMove) return 0;

			const tokenFlags = this.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG);
			const explicitDuration = (tokenFlags?.enabled ? tokenFlags?.duration : undefined)
				?? game.settings.get(CONSTANTS.MODULE_NAME, "default-duration")
				?? 0;

			if (explicitDuration > 0) return explicitDuration;

			// Check "animation on movement keys" setting: if disabled and this is a
			// small nudge (keyboard move, ≤ 1 grid space), snap instantly.
			if (!game.settings.get(CONSTANTS.MODULE_NAME, "animation-on-movement-keys")) {
				const dx = Math.abs((to.x ?? from.x) - from.x);
				const dy = Math.abs((to.y ?? from.y) - from.y);
				const gridSize = canvas?.grid?.size ?? 100;
				if (Math.max(dx, dy) <= gridSize) return 0;
			}

			// Delegate to the standard speed-based duration calculation.
			return super._getAnimationDuration(from, to, options);
		}

		/**
		 * Override animate() to inject our easing function into options before
		 * the parent class builds its CanvasAnimation attributes.
		 * @param {Partial<TokenAnimationData>} to
		 * @param {TokenAnimationOptions} [options]
		 * @returns {Promise<void>}
		 */
		async animate(to, options = {}) {
			// Only inject easing when animating a movement (x or y present).
			if ((to.x !== undefined || to.y !== undefined) && options.easing === undefined) {
				options = { ...options, easing: this._getAnimationEasingFunction(options) };
			}
			return super.animate(to, options);
		}
	}

	CONFIG.Token.objectClass = TokenEaseToken;

	console.log("Token Ease (v13) | Token subclass registered. Ready to (pl)ease!");
});

// ---------------------------------------------------------------------------
// Token Config header button — adds "Token Ease" button to the token sheet.
// v13 uses getHeaderControlsApplicationV2 for ApplicationV2-based sheets.
// ---------------------------------------------------------------------------
function addTokenEaseButton(app, buttons) {
	// Resolve the underlying token document from both old and new configs.
	const tokenDoc = app.token ?? app.document ?? app.object?.document;
	if (!tokenDoc?.isOwner) return;

	buttons.unshift({
		class: "configure-token-ease",
		icon: "fas fa-running",
		label: "Token Ease",
		action: "tokenEaseConfig",
		onclick: () => TokenEaseConfig.show(tokenDoc)
	});
}

// v13 ApplicationV2 fires getHeaderControlsApplicationV2.
Hooks.on("getHeaderControlsApplicationV2", addTokenEaseButton);
// Keep legacy hook as fallback for older v13 builds.
Hooks.on("getTokenConfigHeaderButtons", addTokenEaseButton);
