import CONSTANTS from "./constants.js";
import { easeFunctions } from "./lib/ease.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Token Ease per-token configuration application.
 * Rebuilt for FoundryVTT v13 using ApplicationV2 + HandlebarsApplicationMixin.
 *
 * Originally part of TokenEase by Wasp & Kerrec Snowmane
 * (https://github.com/fantasycalendar/FoundryVTT-TokenEase).
 * Rebuilt for v13 by shakugannosaints (https://github.com/shakugannosaints/).
 */
export default class TokenEaseConfig extends HandlebarsApplicationMixin(ApplicationV2) {

	/**
	 * @param {TokenDocument} token  The token document this config belongs to.
	 * @param {object} options       Additional ApplicationV2 options.
	 */
	constructor(token, options = {}) {
		super(options);
		this.token = token;
		// Load per-token overrides, falling back to module defaults
		this.data = token.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG) ?? {
			speed: game.settings.get(CONSTANTS.MODULE_NAME, "default-speed"),
			duration: game.settings.get(CONSTANTS.MODULE_NAME, "default-duration"),
			configEase: game.settings.get(CONSTANTS.MODULE_NAME, "default-ease"),
			configInOut: game.settings.get(CONSTANTS.MODULE_NAME, "ease-type"),
			enabled: false
		};
	}

	/** @override */
	static DEFAULT_OPTIONS = {
		id: "token-ease-config",
		tag: "form",
		form: {
			handler: TokenEaseConfig.formHandler,
			closeOnSubmit: true
		},
		window: {
			title: "TOKEN-EASE.config-title",
			resizable: false
		},
		position: {
			width: 420
		}
	};

	/** @override — define the Handlebars template parts */
	static PARTS = {
		form: {
			template: `modules/${CONSTANTS.MODULE_NAME}/templates/token-ease-config.html`
		}
	};

	/**
	 * Open (or focus an already-open) TokenEaseConfig for the given token.
	 * @param {TokenDocument} token
	 * @returns {TokenEaseConfig}
	 */
	static show(token) {
		// Search existing open windows for a match
		for (const app of Object.values(foundry.applications.instances)) {
			if (app instanceof TokenEaseConfig && app.token === token) {
				app.render(true, { focus: true });
				return app;
			}
		}
		return new TokenEaseConfig(token).render(true);
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.settings = this.data;

		// Build ease-type choices  [index → label]
		const easeChoices = Object.keys(easeFunctions)
			.filter(e => e.indexOf("InOut") > -1)
			.map(e => e.replace("easeInOut", ""));
		easeChoices.unshift("Linear");

		context.easeChoices = easeChoices.reduce((acc, e) => {
			acc[e] = e;
			return acc;
		}, {});

		context.inOutChoices = {
			"In": "In",
			"Out": "Out",
			"InOut": "InOut"
		};

		return context;
	}

	/**
	 * Form submission handler (static, called by ApplicationV2's form handler mechanism).
	 * @param {Event}       event       The originating form submit event.
	 * @param {HTMLElement} form        The form element.
	 * @param {FormDataExtended} formData  Parsed form data.
	 */
	static async formHandler(event, form, formData) {
		const data = formData.object;

		if (!data.enabled) {
			await this.token.unsetFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG);
			return;
		}

		// Compose the ease string from parts
		data.ease = data["configEase"] === "Linear"
			? data["configEase"].toLowerCase()
			: "ease" + data["configInOut"] + data["configEase"];

		await this.token.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.MOVEMENT_FLAG, data);
	}
}
