#!/usr/bin/env node
import { rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outdir = resolve(projectRoot, "lib");
const watch = process.argv.includes("--watch");

await rm(outdir, { recursive: true, force: true });

const buildOptions = {
	entryPoints: [resolve(projectRoot, "src/endpoints/index.ts")],
	outfile: resolve(outdir, "index.js"),
	bundle: true,
	platform: "node",
	target: "node24",
	format: "cjs",
	sourcemap: true,
	minify: !watch,
	conditions: ["import", "node"],
	mainFields: ["module", "main"],
	external: ["googleapis", "@google-cloud/firestore", "@google-cloud/functions-framework"],
	logLevel: "info",
	legalComments: "none",
};

if (watch) {
	const ctx = await context(buildOptions);
	await ctx.watch();
	console.log("watching for changes...");
} else {
	const result = await build({ ...buildOptions, metafile: true });
	const bundleStat = await stat(resolve(outdir, "index.js"));
	console.log(`\nBundle size: ${(bundleStat.size / 1024).toFixed(1)} KB`);
	const inputs = Object.entries(result.metafile.inputs);
	const sharedTypes = inputs.filter(([p]) => p.includes("shared-types/src"));
	console.log(
		`shared-types files inlined: ${sharedTypes.length} (total ${inputs.length} input files)`,
	);
}
