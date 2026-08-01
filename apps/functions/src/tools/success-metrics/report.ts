/**
 * SPR-137 の成功指標レポート（SPR-298）。
 *
 *   pnpm --filter @suzumina.click/functions metrics
 *
 * 本番 Firestore を **読み取りのみ**で集計し、Markdown をそのまま標準出力に吐く
 * （Linear へ貼れる形が最終成果物。自動化するかは数字を見てから判断する＝SPR-298）。
 * GA4 に依存しないため consent 同意率（3.3%・SPR-281）の影響を受けない。
 *
 * 読むコレクション:
 *   audioButtons                     作成・再生
 *   users/{id}/{favorites,likes,dislikes,buttonDrafts}   継続利用
 *   evaluations                      継続利用（DLsite 作品評価）
 */

import firestore from "../../infrastructure/database/firestore";
import {
	type ActivityRecord,
	type ButtonRecord,
	DEFAULT_SESSION_GAP_MINUTES,
	detectCreationSessions,
	parseTimestamp,
	summarizeCreationByMonth,
	summarizeEffort,
	summarizeEffortByMonth,
	summarizeMonthlyActiveUsers,
	summarizePlayback,
	summarizeUserActivity,
	toButtonRecord,
	toJstDateKey,
} from "./aggregate";

/**
 * 集計に載せられなかったドキュメントの件数（日時が読めない / 作成者を特定できない）。
 * 黙って捨てず末尾で報告する。サンプルは `パス（理由）` の形で理由を自己記述させる。
 */
interface SkipCounter {
	count: number;
	samples: string[];
}

function noteSkip(skipped: SkipCounter, path: string): void {
	skipped.count += 1;
	if (skipped.samples.length < 5) skipped.samples.push(path);
}

async function loadButtons(skipped: SkipCounter): Promise<ButtonRecord[]> {
	const snapshot = await firestore.collection("audioButtons").get();
	const records: ButtonRecord[] = [];
	for (const doc of snapshot.docs) {
		const result = toButtonRecord(doc.id, doc.data());
		if (!result.ok) {
			// creator 不明を既定値へ丸めると別人が 1 人に集約されて集計が歪むため、落として報告する
			noteSkip(skipped, `audioButtons/${doc.id}（${result.reason} 不明）`);
			continue;
		}
		records.push(result.record);
	}
	return records;
}

/** users 配下のサブコレクションを 1 種類読み、活動レコードに変換する */
async function loadUserSubcollection(
	userIds: string[],
	subcollection: string,
	timestampField: string,
	kind: ActivityRecord["kind"],
	skipped: SkipCounter,
): Promise<ActivityRecord[]> {
	const records: ActivityRecord[] = [];
	for (const userId of userIds) {
		const snapshot = await firestore
			.collection("users")
			.doc(userId)
			.collection(subcollection)
			.get();
		for (const doc of snapshot.docs) {
			const at = parseTimestamp(doc.data()[timestampField]);
			if (!at) {
				noteSkip(skipped, `users/${userId}/${subcollection}/${doc.id}（${timestampField} 不明）`);
				continue;
			}
			records.push({ userId, at, kind });
		}
	}
	return records;
}

async function loadEvaluations(skipped: SkipCounter): Promise<ActivityRecord[]> {
	const snapshot = await firestore.collection("evaluations").get();
	const records: ActivityRecord[] = [];
	for (const doc of snapshot.docs) {
		const data = doc.data();
		const at = parseTimestamp(data.createdAt);
		if (!at) {
			noteSkip(skipped, `evaluations/${doc.id}（createdAt 不明）`);
			continue;
		}
		records.push({ userId: String(data.userId ?? ""), at, kind: "evaluation" });
	}
	return records;
}

function formatInterval(seconds: number | null): string {
	if (seconds === null) return "—";
	if (seconds < 90) return `${Math.round(seconds)}秒`;
	return `${(seconds / 60).toFixed(1)}分`;
}

function renderReport(input: {
	buttons: ButtonRecord[];
	activities: ActivityRecord[];
	userCount: number;
	skipped: SkipCounter;
}): string {
	const { buttons, activities, userCount, skipped } = input;
	const lines: string[] = [];
	const sessions = detectCreationSessions(buttons);
	const effort = summarizeEffort(sessions);
	const playback = summarizePlayback(buttons);
	const creationDays = new Set(buttons.map((b) => toJstDateKey(b.createdAt)));

	lines.push("# suzumina.click 成功指標レポート（Firestore 実測・GA4 非依存）");
	lines.push("");
	lines.push(
		`集計日時: ${toJstDateKey(new Date())} (JST) ／ 対象: audioButtons ${buttons.length}件 / users ${userCount}人`,
	);
	lines.push("");

	lines.push("## 1. 労力あたりの作成ボタン数");
	lines.push("");
	lines.push(
		`作成セッションの区切り: 連続作成の間隔が ${DEFAULT_SESSION_GAP_MINUTES} 分以上空いたら別セッション`,
	);
	lines.push("");
	lines.push("| 指標 | 値 |");
	lines.push("|---|---|");
	lines.push(`| 総作成数 | ${effort.buttons} |`);
	lines.push(`| 作成セッション数 | ${effort.sessions} |`);
	lines.push(`| セッションあたり作成数 | ${effort.buttonsPerSession.toFixed(2)} |`);
	lines.push(`| 連続作成間隔の中央値 | ${formatInterval(effort.medianIntervalSeconds)} |`);
	lines.push(`| 作成があった日数 | ${creationDays.size} |`);
	lines.push(
		`| 作成日あたり作成数 | ${creationDays.size === 0 ? "—" : (buttons.length / creationDays.size).toFixed(2)} |`,
	);
	lines.push("");
	lines.push("### 月次の作成量と労力");
	lines.push("");
	lines.push(
		"| 月 | 作成数 | 作成者 | 作成日数 | 作成日あたり | セッション | セッションあたり | 連続作成間隔の中央値 |",
	);
	lines.push("|---|---|---|---|---|---|---|---|");
	const effortByMonth = new Map(summarizeEffortByMonth(sessions).map((row) => [row.month, row]));
	for (const row of summarizeCreationByMonth(buttons)) {
		const monthEffort = effortByMonth.get(row.month);
		lines.push(
			`| ${row.month} | ${row.buttons} | ${row.creators} | ${row.days} | ${(row.buttons / row.days).toFixed(2)} | ${monthEffort?.sessions ?? 0} | ${
				monthEffort ? monthEffort.buttonsPerSession.toFixed(2) : "—"
			} | ${formatInterval(monthEffort?.medianIntervalSeconds ?? null)} |`,
		);
	}
	lines.push("");

	lines.push("## 2. 常連の継続利用");
	lines.push("");
	lines.push("| 月 | 活動ユーザー | うち作成した人 |");
	lines.push("|---|---|---|");
	for (const row of summarizeMonthlyActiveUsers(activities)) {
		lines.push(`| ${row.month} | ${row.users} | ${row.creators} |`);
	}
	lines.push("");
	lines.push("### ユーザー別の活動（活動日数の多い順）");
	lines.push("");
	lines.push(
		"| ユーザー | 活動日数 | 活動月数 | 初回 | 最終 | 作成 | お気に入り | 高評価 | 下書き | 作品評価 |",
	);
	lines.push("|---|---|---|---|---|---|---|---|---|---|");
	for (const user of summarizeUserActivity(activities)) {
		lines.push(
			`| ${user.userId} | ${user.activeDays} | ${user.activeMonths} | ${toJstDateKey(user.firstAt)} | ${toJstDateKey(user.lastAt)} | ${user.counts.create} | ${user.counts.favorite} | ${user.counts.like} | ${user.counts.draft} | ${user.counts.evaluation} |`,
		);
	}
	lines.push("");

	lines.push("## 3. 再生（消費）");
	lines.push("");
	lines.push("| 指標 | 値 |");
	lines.push("|---|---|");
	lines.push(`| 総再生数 | ${playback.totalPlays} |`);
	lines.push(`| ボタンあたり平均 | ${playback.meanPlays.toFixed(1)} |`);
	lines.push(`| ボタンあたり中央値 | ${playback.medianPlays} |`);
	lines.push(`| 最大 | ${playback.maxPlays} |`);
	lines.push(`| 再生0のボタン | ${playback.zeroPlayButtons} |`);
	lines.push("");
	lines.push(
		"> ⚠️ `stats.playCount` は**累積カウンタで時系列を持たない**ため、「今月の再生数」は算出できない。",
	);
	lines.push("> 期間で見られるのは作成・お気に入り・リアクション・下書き・作品評価のみ。");
	lines.push("");

	if (skipped.count > 0) {
		lines.push("## 除外");
		lines.push("");
		lines.push(
			`日時または作成者を特定できず集計から除外: ${skipped.count}件（括弧内が理由。例: ${skipped.samples.join(", ")}）`,
		);
		lines.push("");
	}

	return lines.join("\n");
}

export async function runSuccessMetricsReport(): Promise<string> {
	const skipped: SkipCounter = { count: 0, samples: [] };
	const buttons = await loadButtons(skipped);

	const userSnapshot = await firestore.collection("users").get();
	const userIds = userSnapshot.docs.map((doc) => doc.id);

	const [favorites, likes, dislikes, drafts, evaluations] = await Promise.all([
		loadUserSubcollection(userIds, "favorites", "addedAt", "favorite", skipped),
		loadUserSubcollection(userIds, "likes", "createdAt", "like", skipped),
		loadUserSubcollection(userIds, "dislikes", "createdAt", "dislike", skipped),
		loadUserSubcollection(userIds, "buttonDrafts", "createdAt", "draft", skipped),
		loadEvaluations(skipped),
	]);

	const activities: ActivityRecord[] = [
		...buttons.map((button) => ({
			userId: button.creatorId,
			at: button.createdAt,
			kind: "create" as const,
		})),
		...favorites,
		...likes,
		...dislikes,
		...drafts,
		...evaluations,
	];

	return renderReport({ buttons, activities, userCount: userIds.length, skipped });
}

if (require.main === module) {
	runSuccessMetricsReport()
		.then((report) => {
			process.stdout.write(`${report}\n`);
			process.exit(0);
		})
		.catch((error) => {
			process.stderr.write(`成功指標レポートの生成に失敗: ${error}\n`);
			process.exit(1);
		});
}
