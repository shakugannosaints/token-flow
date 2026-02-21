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
	//
	// IMPORTANT: Do NOT hard-code the base class as foundry.canvas.placeables.Token.
	// Other systems (e.g. PF2e) may have already replaced CONFIG.Token.objectClass
	// with their own subclass that adds system-specific methods (e.g. distanceTo).
	// We must extend whatever is currently registered so that all existing
	// functionality is preserved and only the animation methods are layered on top.
	// ------------------------------------------------------------------
	const BaseTokenClass = CONFIG.Token.objectClass;
	class TokenEaseToken extends BaseTokenClass {

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
			if (options.easing !== undefined) return options.easing;

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
			if (options.movementSpeed !== undefined) return options.movementSpeed;

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
			if (options.duration !== undefined) return options.duration;

			// Instant-move hotkey: zero duration.
			if (this.document.isOwner && keyboardState.instantMove) return 0;

			const tokenFlags = this.document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG);
			const explicitDuration = (tokenFlags?.enabled ? tokenFlags?.duration : undefined)
				?? game.settings.get(CONSTANTS.MODULE_NAME, "default-duration")
				?? 0;

			if (explicitDuration > 0) return explicitDuration;

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
			const isMovement = to.x !== undefined || to.y !== undefined;
			if (isMovement) {
				// Use this.x/this.y (current canvas position) instead of this.document.x/y
				// because the document is already updated to the target position by the time animate() is called.
				const dx = Math.abs((to.x ?? this.x) - this.x);
				const dy = Math.abs((to.y ?? this.y) - this.y);
				const gridSize = canvas?.grid?.size ?? 100;
				const isSmallMovement = Math.max(dx, dy) <= gridSize;

				const animationOnKeys = game.settings.get(CONSTANTS.MODULE_NAME, "animation-on-movement-keys");

				if (isSmallMovement && !animationOnKeys && !options.movementSpeed && !options.duration) {
					// Bypass mod settings for keyboard movement (small nudges).
					// We force the duration to 0 to make it an instant snap.
					options.duration = 0;
				} else {
					// Apply mod's custom easing.
					if (options.easing === undefined) {
						options.easing = this._getAnimationEasingFunction(options);
					}
				}
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
