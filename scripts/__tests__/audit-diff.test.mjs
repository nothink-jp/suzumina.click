import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffAudit, formatSummary, parseAudit } from "../audit-diff.mjs";

/** `pnpm audit --json` の advisory 1 件分（実出力と同じキー） */
function advisory(id, ghsa, moduleName, severity) {
	return {
		id,
		github_advisory_id: ghsa,
		module_name: moduleName,
		severity,
		title: `${moduleName} の脆弱性`,
		url: `https://github.com/advisories/${ghsa}`,
		patched_versions: ">=9.9.9",
		vulnerable_versions: "<9.9.9",
		findings: [],
		cwe: [],
	};
}

function report(...advisories) {
	return { advisories: Object.fromEntries(advisories.map((a) => [String(a.id), a])), metadata: {} };
}

const QS = advisory(1, "GHSA-6pq8-jhm2-2vcw", "qs", "moderate");
const BETTER_AUTH = advisory(2, "GHSA-965c-763c-88jm", "better-auth", "critical");
const LOW = advisory(3, "GHSA-44jh-23m7-hpcf", "better-auth", "low");

describe("parseAudit", () => {
	it("moderate 未満はゲート対象から外す", () => {
		const parsed = parseAudit(report(QS, LOW));
		assert.deepEqual(
			parsed.map((a) => a.ghsa),
			["GHSA-6pq8-jhm2-2vcw"],
		);
	});

	it("未知の severity は判定対象に含める（fail-closed）", () => {
		const unknown = advisory(5, "GHSA-xxxx-xxxx-xxxx", "mystery", "severe");
		assert.equal(parseAudit(report(unknown)).length, 1);
	});

	it("advisories を持たない入力は読めないものとして投げる（fail-closed）", () => {
		assert.throws(() => parseAudit({ error: "ERR_PNPM_AUDIT_BAD_RESPONSE" }));
		assert.throws(() => parseAudit(null));
	});
});

describe("diffAudit", () => {
	it("main に既知の advisory だけなら新規は 0 件（#1067 の状況: qs は main 由来）", () => {
		const diff = diffAudit(parseAudit(report(QS, BETTER_AUTH)), parseAudit(report(QS)));
		assert.equal(diff.introduced.length, 0);
		assert.deepEqual(
			diff.known.map((a) => a.module),
			["qs"],
		);
		assert.deepEqual(
			diff.fixed.map((a) => a.module),
			["better-auth"],
		);
	});

	it("PR が持ち込んだ advisory は新規になる", () => {
		const diff = diffAudit(parseAudit(report(QS)), parseAudit(report(QS, BETTER_AUTH)));
		assert.deepEqual(
			diff.introduced.map((a) => a.ghsa),
			["GHSA-965c-763c-88jm"],
		);
	});

	it("同じ GHSA でも別パッケージへ広がったら新規として扱う", () => {
		const spread = advisory(4, QS.github_advisory_id, "qs-fork", "moderate");
		const diff = diffAudit(parseAudit(report(QS)), parseAudit(report(QS, spread)));
		assert.deepEqual(
			diff.introduced.map((a) => a.module),
			["qs-fork"],
		);
	});
});

describe("formatSummary", () => {
	it("新規がなければ通過の見出しを出し、既知分は一覧で見せる", () => {
		const summary = formatSummary(diffAudit(parseAudit(report(QS)), parseAudit(report(QS))));
		assert.match(summary, /この PR が持ち込む advisory はありません/);
		assert.match(summary, /main に残っている既知の advisory（1 件/);
		assert.match(summary, /GHSA-6pq8-jhm2-2vcw/);
	});
});
