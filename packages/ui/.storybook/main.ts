import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [
		"@chromatic-com/storybook",
		{
			name: "@storybook/addon-docs",
			options: {
				mdxPluginOptions: {
					mdxCompileOptions: {
						remarkPlugins: [remarkGfm],
					},
				},
			},
		},
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

		// Storybook環境変数を設定
		config.define = {
			...config.define,
			"process.env.STORYBOOK": JSON.stringify("true"),
		};

		return config;
	},
};
export default config;
