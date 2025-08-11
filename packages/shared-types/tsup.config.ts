import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	splitting: true, // Enable code splitting for better tree-shaking
	sourcemap: true,
	clean: true,
	treeshake: true, // Enable tree-shaking
	minify: false, // Don't minify for better debugging (libraries should not be minified)
	target: "es2022", // Modern target for smaller output
	platform: "neutral", // Library can run in both node and browser
	external: ["@google-cloud/firestore"], // Mark heavy dependencies as external
});
