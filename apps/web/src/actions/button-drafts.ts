"use server";

import {
	type AudioButtonDraft,
	type AudioButtonDraftDocument,
	audioButtonDraftTransformers,
	type CreateAudioButtonDraftInput,
} from "@suzumina.click/shared-types";
import { getCurrentUser } from "@/lib/auth/server";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";

const SUBCOLLECTION = "buttonDrafts";
/** 1ユーザーの下書き保持上限（M キー連打・放置による無制限成長の安全弁） */
const MAX_DRAFTS_PER_USER = 500;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
/** markedAt の許容ずれ（クライアント時計の異常値を弾く。通常は数秒以内） */
const MARKED_AT_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export type CreateButtonDraftResult =
	| { success: true; data: AudioButtonDraft }
	| { success: false; error: string };

export type ListButtonDraftsResult =
	| { success: true; data: AudioButtonDraft[] }
	| { success: false; error: string };

export interface DeleteButtonDraftResult {
	success: boolean;
	error?: string;
}

function draftsRef(discordId: string) {
	return getFirestore().collection("users").doc(discordId).collection(SUBCOLLECTION);
}

function validateCreateInput(input: CreateAudioButtonDraftInput): string | null {
	if (!VIDEO_ID_PATTERN.test(input.videoId)) {
		return "動画IDが不正です";
	}
	if (typeof input.videoTitle !== "string" || input.videoTitle.trim() === "") {
		return "動画タイトルが不正です";
	}
	if (
		input.playerTime !== null &&
		(!Number.isFinite(input.playerTime) || input.playerTime < 0 || input.playerTime > 172_800)
	) {
		return "再生位置が不正です";
	}
	if (
		!Number.isFinite(input.markedAtMs) ||
		Math.abs(Date.now() - input.markedAtMs) > MARKED_AT_TOLERANCE_MS
	) {
		return "マーク時刻が不正です";
	}
	return null;
}

/**
 * 配信中マークを下書きとして保存する（SPR-146 第1段）。
 *
 * 保存するのは生の捕捉信号のみ（playerTime = 主信号 / markedAt = 壁時計フォールバック。SPR-145）。
 * 日時は Date で渡し Firestore Timestamp として保存される（新規コレクション規約）。
 */
export async function createButtonDraft(
	input: CreateAudioButtonDraftInput,
): Promise<CreateButtonDraftResult> {
	try {
		// 認可ゲートの正本 = getCurrentUser の null チェック（SPR-195）。
		// 供給系の書き込みのため無効ユーザーも明示ブロックする。
		const user = await getCurrentUser();
		if (!user?.discordId || !user.isActive) {
			return { success: false, error: "ログインが必要です" };
		}

		const validationError = validateCreateInput(input);
		if (validationError) {
			return { success: false, error: validationError };
		}

		const ref = draftsRef(user.discordId);

		// 上限はソフトリミット: count→add 間の TOCTOU で数件超えうるが、個人所有の下書き掃除が目的のため
		// 許容する（厳密化のトランザクションはコストに見合わない判断）
		const countSnapshot = await ref.count().get();
		if (countSnapshot.data().count >= MAX_DRAFTS_PER_USER) {
			return {
				success: false,
				error: `下書きが上限（${MAX_DRAFTS_PER_USER}件）に達しています。不要な下書きを削除してください`,
			};
		}

		const markedAt = new Date(input.markedAtMs);
		const createdAt = new Date();
		const doc: Omit<AudioButtonDraftDocument, "markedAt" | "createdAt"> & {
			markedAt: Date;
			createdAt: Date;
		} = {
			videoId: input.videoId,
			videoTitle: input.videoTitle.trim().slice(0, 200),
			playerTime: input.playerTime,
			markedAt,
			createdAt,
		};
		const added = await ref.add(doc);

		logger.info("音声ボタン下書きを作成", {
			draftId: added.id,
			videoId: input.videoId,
			playerTime: input.playerTime,
			userId: user.discordId,
		});

		return {
			success: true,
			data: audioButtonDraftTransformers.fromFirestore(added.id, doc),
		};
	} catch (error) {
		logger.error("音声ボタン下書きの作成でエラーが発生", {
			videoId: input.videoId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "下書きの保存に失敗しました" };
	}
}

/**
 * 自分の下書き一覧を新しい順で取得する。
 */
export async function getMyButtonDrafts(limit = 100): Promise<ListButtonDraftsResult> {
	try {
		const user = await getCurrentUser();
		if (!user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		const snapshot = await draftsRef(user.discordId)
			.orderBy("createdAt", "desc")
			.limit(Math.min(Math.max(limit, 1), MAX_DRAFTS_PER_USER))
			.get();

		return {
			success: true,
			data: snapshot.docs.map((doc) =>
				audioButtonDraftTransformers.fromFirestore(doc.id, doc.data() as AudioButtonDraftDocument),
			),
		};
	} catch (error) {
		logger.error("音声ボタン下書き一覧の取得でエラーが発生", {
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "下書き一覧の取得に失敗しました" };
	}
}

/**
 * 下書きを削除する（仕上げ完了後の消化・手動削除の両方から使う）。
 * 自分のサブコレクション配下しか触れないため所有チェックはパスで担保される。
 */
export async function deleteButtonDraft(draftId: string): Promise<DeleteButtonDraftResult> {
	try {
		const user = await getCurrentUser();
		if (!user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}
		if (typeof draftId !== "string" || draftId === "" || draftId.includes("/")) {
			return { success: false, error: "下書きIDが不正です" };
		}

		await draftsRef(user.discordId).doc(draftId).delete();

		logger.info("音声ボタン下書きを削除", { draftId, userId: user.discordId });
		return { success: true };
	} catch (error) {
		logger.error("音声ボタン下書きの削除でエラーが発生", {
			draftId,
			error: error instanceof Error ? error.message : String(error),
		});
		return { success: false, error: "下書きの削除に失敗しました" };
	}
}
