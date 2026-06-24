#!/usr/bin/env node
// scripts/check-firestore-index-drift.mjs
//
// live Firestore 複合インデックス（gcloud）と terraform 定義（firestore_indexes*.tf）の drift を検出する。
// SPR-213 の手動棚卸しを自動ガード化する目的（CLAUDE.md 軸1: 事後修復→設計で守る）。
//
// 検出する drift:
//   🔴 管理外: live にあり terraform 定義に無い（console/gcloud で直接作られ未反映 or 改名の取り残し）
//   🟠 未適用: terraform 定義にあり live に無い（apply 漏れ）
//
// 使い方:
//   GCP_PROJECT_ID=suzumina-click node scripts/check-firestore-index-drift.mjs
//   （ローカルは ADC、CI は WIF。gcloud が PATH に必要。npm 依存なし）
// 終了コード: 0=drift なし / 1=drift あり / 2=実行エラー
// 注意: 単一フィールド index（google_firestore_field）は対象外（複合のみ）。

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TF_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "terraform");
const TF_FILES = ["firestore_indexes.tf", "firestore_indexes_audiobuttons_update.tf"];
const DATABASE = "(default)";

function getProjectId() {
	if (process.env.GCP_PROJECT_ID) return process.env.GCP_PROJECT_ID;
	try {
		return execFileSync("gcloud", ["config", "get-value", "project"], { encoding: "utf8" }).trim();
	} catch {
		return null;
	}
}

// gcloud の live 複合 index を (collection|scope|fields) シグネチャ化（__name__ は暗黙なので除外）
function liveSignatures(project) {
	const json = execFileSync(
		"gcloud",
		[
			"firestore",
			"indexes",
			"composite",
			"list",
			`--project=${project}`,
			`--database=${DATABASE}`,
			"--format=json",
		],
		{ encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
	);
	return JSON.parse(json).map((ix) => {
		const coll = ix.name.match(/collectionGroups\/([^/]+)\/indexes/)?.[1] ?? "?";
		const scope = ix.queryScope || "COLLECTION";
		const fields = (ix.fields || [])
			.filter((f) => f.fieldPath !== "__name__")
			.map(
				(f) => `${f.fieldPath}:${f.arrayConfig ? "ARRAY" : f.order === "DESCENDING" ? "D" : "A"}`,
			);
		return {
			sig: `${coll}|${scope}|${fields.join(",")}`,
			coll,
			scope,
			fields,
			id: ix.name.split("/indexes/").pop(),
		};
	});
}

// fields ブロックの 1 行から `path:dir`（dir = A/D/ARRAY）を作る。該当なければ null
function fieldEntry(lines, k) {
	const fp = lines[k].match(/field_path\s*=\s*"([^"]+)"/)?.[1];
	if (!fp) return null;
	const blk = lines.slice(k, k + 3).join(" ");
	const dir = /array_config/.test(blk) ? "ARRAY" : /DESCENDING/.test(blk) ? "D" : "A";
	return `${fp}:${dir}`;
}

// 1 つの google_firestore_index ブロック（resource 行 = start）を読み、シグネチャ要素と終端行を返す
function parseIndexBlock(lines, start) {
	let coll = null;
	let scope = "COLLECTION";
	let depth = 0;
	let opened = false;
	const fields = [];
	let k = start;
	for (; k < lines.length; k++) {
		const l = lines[k];
		depth += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
		coll = l.match(/collection\s*=\s*"([^"]+)"/)?.[1] ?? coll;
		scope = l.match(/query_scope\s*=\s*"([^"]+)"/)?.[1] ?? scope;
		const f = fieldEntry(lines, k);
		if (f) fields.push(f);
		if (l.includes("{")) opened = true;
		if (opened && depth === 0) break;
	}
	return { coll, scope, fields, end: k };
}

// terraform の active な google_firestore_index ブロックを (collection|scope|fields) シグネチャ化（コメントアウトは除外）
function configSignatures() {
	const out = [];
	for (const file of TF_FILES) {
		let lines;
		try {
			lines = readFileSync(join(TF_DIR, file), "utf8").split("\n");
		} catch {
			continue;
		}
		for (let i = 0; i < lines.length; i++) {
			const m = lines[i].match(/^resource "google_firestore_index" "([^"]+)"/);
			if (!m) continue; // 行頭一致のみ＝コメント(# resource ...)は除外
			const { coll, scope, fields, end } = parseIndexBlock(lines, i);
			out.push({ sig: `${coll}|${scope}|${fields.join(",")}`, name: m[1], file });
			i = end;
		}
	}
	return out;
}

const project = getProjectId();
if (!project) {
	console.error("✗ GCP project を特定できません（GCP_PROJECT_ID か gcloud config を設定）");
	process.exit(2);
}

let live;
try {
	live = liveSignatures(project);
} catch (e) {
	console.error(
		`✗ gcloud で live index を取得できませんでした: ${String(e.message).split("\n")[0]}`,
	);
	process.exit(2);
}

const config = configSignatures();
const liveSet = new Set(live.map((x) => x.sig));
const cfgSet = new Set(config.map((x) => x.sig));
const unmanaged = live.filter((x) => !cfgSet.has(x.sig));
const missing = config.filter((x) => !liveSet.has(x.sig));

console.log(`Firestore composite index drift check (project=${project})`);
console.log(`  live: ${live.length} / config(${TF_FILES.join(" + ")}): ${config.length}\n`);

if (unmanaged.length === 0 && missing.length === 0) {
	console.log("✅ drift なし（live と terraform 定義が一致）");
	process.exit(0);
}

if (unmanaged.length) {
	console.log(`🔴 管理外（live にあり config に無い）: ${unmanaged.length}`);
	for (const x of unmanaged) console.log(`   - ${x.sig}  (id ${x.id})`);
	console.log(
		"   → 使用中なら firestore_indexes*.tf に追加(import)、未使用なら gcloud で削除（SPR-213）\n",
	);
}
if (missing.length) {
	console.log(`🟠 未適用（config にあり live に無い）: ${missing.length}`);
	for (const x of missing) console.log(`   - ${x.name} (${x.file}) :: ${x.sig}`);
	console.log("   → terraform apply 漏れ。plan を確認\n");
}
process.exit(1);
