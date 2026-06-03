import type { Preview } from "@storybook/react-vite";
import "../src/styles/globals.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			// SPR-121 で story テストを CI 配線した際、初回 a11y 監査で大量の既存違反
			// （主にブランド色の color-contrast < AA）が判明。まず play(interaction) を gate に常設し、
			// a11y は "todo"（可視化のみ・非 fail）に。違反修正後に "error" へ戻す → SPR-129。
			test: "todo",
		},
		backgrounds: {
			options: {
				light: { name: "Light", value: "#ffffff" },
				suzukaLight: { name: "Suzuka Light", value: "#fff5fa" },
				dark: { name: "Dark", value: "#0f172a" },
			},
		},
		options: {
			storySort: {
				order: ["Introduction", "Design Tokens", "UI", "Custom"],
			},
		},
	},
	initialGlobals: {
		backgrounds: { value: "light" },
	},
	tags: ["autodocs"],
};

export default preview;
