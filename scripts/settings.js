import { easeFunctions } from "./lib/ease.js";
import CONSTANTS from "./constants.js";

// Build ease choices list from InOut functions only
const easeChoices = Object.keys(easeFunctions)
	.filter(ease => ease.indexOf("InOut") > -1)
	.map(e => e.replace("easeInOut", ""));
easeChoices.unshift("Linear");

/**
 * Debounced helper to recalculate the default-ease setting
 * from config-ease + ease-type choices.
 */
const debouncedDoubleCheckEase = foundry.utils.debounce(() => {
	const easeInOut = game.settings.get(CONSTANTS.MODULE_NAME, "ease-type");
	const easeIn = easeInOut !== 1 ? "In" : "";
	const easeOut = easeInOut >= 1 ? "Out" : "";
	const easeIndex = game.settings.get(CONSTANTS.MODULE_NAME, "config-ease");
	let ease = easeChoices[easeIndex];
	if (ease !== "Linear" && !(easeIn === "" && easeOut === "")) {
		ease = `ease${easeIn}${easeOut}${ease}`;
	} else {
		ease = ease.toLowerCase();
	}
	game.settings.set(CONSTANTS.MODULE_NAME, "default-ease", ease);
}, 100);

/**
 * Register all module game settings.
 */
export function configure_settings() {

	// Expose ease functions globally for macro/API use
	window.tokenEaseEaseFunctions = easeFunctions;

	game.settings.register(CONSTANTS.MODULE_NAME, "module-version", {
		scope: "world",
		config: false,
		default: "",
		type: String
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "default-speed", {
		name: game.i18n.format("TOKEN-EASE.speed-title"),
		hint: game.i18n.format("TOKEN-EASE.speed-description"),
		scope: "world",
		config: true,
		default: 6,
		type: Number,
		onChange: (value) => {
			if (CONFIG.Token?.movement && value > 0) {
				CONFIG.Token.movement.defaultSpeed = value;
			}
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "default-duration", {
		name: game.i18n.format("TOKEN-EASE.duration-title"),
		hint: game.i18n.format("TOKEN-EASE.duration-description"),
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "config-ease", {
		name: game.i18n.format("TOKEN-EASE.ease-title"),
		hint: game.i18n.format("TOKEN-EASE.ease-description"),
		scope: "world",
		config: true,
		default: 0,
		type: String,
		choices: easeChoices,
		onChange: () => debouncedDoubleCheckEase()
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "default-ease", {
		scope: "world",
		config: false,
		default: "linear",
		type: String
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "ease-type", {
		name: game.i18n.format("TOKEN-EASE.ease-type-title"),
		hint: game.i18n.format("TOKEN-EASE.ease-type-description"),
		scope: "world",
		config: true,
		default: 2,
		type: Number,
		choices: ["In", "Out", "In & Out"],
		onChange: () => debouncedDoubleCheckEase()
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "animation-on-movement-keys", {
		name: game.i18n.format("TOKEN-EASE.movement-keys-title"),
		hint: game.i18n.format("TOKEN-EASE.movement-keys-description"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

}

/**
 * Shared keyboard state object — tracks whether instant-move hotkey is held.
 */
export const keyboardState = {
	instantMove: false
};

/**
 * Register module keybindings.
 */
export function configure_hotkeys() {
	game.keybindings.register(CONSTANTS.MODULE_NAME, "instantMovement", {
		name: "TOKEN-EASE.instant-movement",
		editable: [
			{ key: "AltLeft" }
		],
		onDown: () => {
			keyboardState.instantMove = true;
		},
		onUp: () => {
			keyboardState.instantMove = false;
		}
	});
}
