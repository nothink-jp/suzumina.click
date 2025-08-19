import type {
	AudioButton,
	AudioButtonCompat,
	AudioButtonPlainObject,
} from "@suzumina.click/shared-types";
import { useAudioButtonCompat } from "./use-audio-button-compat";

/**
 * AudioButton Entity用のカスタムフック
 * AudioButtonエンティティの便利なヘルパー関数と計算値を提供
 *
 * @deprecated Use useAudioButtonCompat instead for better compatibility
 */
export function useAudioButton(
	audioButton: AudioButton | AudioButtonPlainObject | AudioButtonCompat,
) {
	// 互換性のため、内部的にuseAudioButtonCompatを使用
	return useAudioButtonCompat(audioButton);
}
