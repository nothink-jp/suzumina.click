import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@chromatic-com/storybook",
		"@storybook/addon-docs",
		"@storybook/addon-onboarding",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	framework: {
		name: "@storybook/nextjs-vite",
		options: {},
	},
	viteFinal: async (config) => {
		// Define global variables for Node.js compatibility
		config.define = {
			...config.define,
			global: "globalThis",
			__dirname: JSON.stringify("/"),
		};

		// TailwindCSS v4のPostCSS設定を追加
		const postcssPlugin = await import("@tailwindcss/postcss");
		config.css = config.css || {};
		config.css.postcss = {
			plugins: [postcssPlugin.default()],
		};

		return config;
	},
};
export default config;
