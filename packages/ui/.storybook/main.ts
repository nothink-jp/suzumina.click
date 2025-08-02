import { resolve } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@chromatic-com/storybook",
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal: async (config) => {
		// TailwindCSS v4のPostCSS設定を追加
		const postcssPlugin = await import("@tailwindcss/postcss");
		config.css = config.css || {};
		config.css.postcss = {
			plugins: [postcssPlugin.default()],
		};

		// Next.js navigation モックを追加
		config.resolve = config.resolve || {};
		config.resolve.alias = {
			...config.resolve.alias,
			"next/navigation": resolve(__dirname, "./mocks/next-navigation.ts"),
		};

		return config;
	},
};
export default config;
