#!/usr/bin/env node
import { readFile, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outdir = resolve(projectRoot, "lib");
const watch = process.argv.includes("--watch");

// esbuild の target は Node の版の正本（ルート package.json の devEngines.runtime.version）の major から導く。
// ここに版を書くと、正本を上げたときに lint:node-version にも掛からず黙ってずれる（SPR-405 / SPR-422）。
const rootPackage = JSON.parse(await readFile(resolve(projectRoot, "../../package.json"), "utf8"));
const nodeMajor = rootPackage.devEngines.runtime.version.split(".")[0];

await rm(outdir, { recursive: true, force: true });

// 入口は 2 つ。同じソースから、起動の仕方が違うバンドルを作る:
// - lib/index.js: Functions（functions-framework が CloudEvent ハンドラを読み込む）
// - lib/job.js: Cloud Run Jobs（`node lib/job.js <mode>`。SPR-415）
const buildOptions = {
	entryPoints: {
		index: resolve(projectRoot, "src/endpoints/index.ts"),
		job: resolve(projectRoot, "src/jobs/main.ts"),
	},
	outdir,
	bundle: true,
	platform: "node",
	target: `node${nodeMajor}`,
	format: "cjs",
	sourcemap: true,
	minify: !watch,
	conditions: ["import", "node"],
	mainFields: ["module", "main"],
	external: ["@googleapis/youtube", "@google-cloud/firestore", "@google-cloud/functions-framework"],
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
