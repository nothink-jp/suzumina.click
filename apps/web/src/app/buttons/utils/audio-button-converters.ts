import {
	type AudioButton,
	type AudioButtonDocument,
	audioButtonTransformers,
} from "@suzumina.click/shared-types";
import * as logger from "@/lib/logger";

/**
 * FirestoreデータをAudioButtonに変換するヘルパー関数
 */
export function convertFirestoreToAudioButton(
	button: AudioButtonDocument & { id: string },
): AudioButton | null {
	try {
		return audioButtonTransformers.fromFirestore(button);
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
