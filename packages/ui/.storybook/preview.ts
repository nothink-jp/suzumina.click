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
			test: "error",
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
