import {
	type AudioButton,
	type AudioButtonDocument,
	audioButtonTransformers,
} from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * FirestoreデータをAudioButtonに変換するヘルパー関数
 *
 * 変換器が null（必須フィールド欠落の壊れた doc）を返したら warn を残す。
 * 呼び出し側は null を黙って除外するため、ここで記録しないと一覧から消えたことに気づけない
 */
export function convertFirestoreToAudioButton(
	button: AudioButtonDocument & { id: string },
): AudioButton | null {
	try {
		const converted = audioButtonTransformers.fromFirestore(button);
		if (!converted) {
			logger.warn("AudioButton変換スキップ（必須フィールド欠落）", { buttonId: button.id });
		}
		return converted;
	} catch (error) {
		logger.error("AudioButton変換エラー", {
			buttonId: button.id,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Firestoreから音声ボタンを取得して変換
 */
export async function fetchAndConvertButtons(
	queryRef: FirebaseFirestore.Query,
): Promise<AudioButton[]> {
	const snapshot = await queryRef.get();
	const buttons = snapshot.docs.map((doc) => {
		const data = doc.data();
		return { ...data, id: doc.id } as AudioButtonDocument & { id: string };
	});

	return buttons
		.map(convertFirestoreToAudioButton)
		.filter((button): button is AudioButton => button !== null);
}
