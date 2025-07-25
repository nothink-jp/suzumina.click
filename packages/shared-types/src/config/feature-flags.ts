/**
 * Feature Flags Configuration
 *
 * Entity V2アーキテクチャの段階的導入を制御するフィーチャーフラグ
 */

/**
 * フィーチャーフラグの定義
 */
export interface FeatureFlags {
	/**
	 * Entity V2の有効化フラグ
	 */
	entityV2: {
		/**
		 * Video Entity V2の有効化
		 */
		video: boolean;

		/**
		 * AudioButton Entity V2の有効化
		 */
		audioButton: boolean;

		/**
		 * 移行モード設定
		 * - 'disabled': V2無効（既存実装を使用）
		 * - 'readonly': V2読み取りのみ（書き込みは既存実装）
		 * - 'enabled': V2完全有効
		 */
		mode: "disabled" | "readonly" | "enabled";

		/**
		 * ロールアウト設定
		 */
		rollout: {
			/**
			 * 有効化する割合（0-100%）
			 */
			percentage: number;

			/**
			 * 特定ユーザーIDのホワイトリスト
			 */
			whitelist: string[];

			/**
			 * 特定ユーザーIDのブラックリスト
			 */
			blacklist: string[];
		};
	};

	/**
	 * パフォーマンスモニタリング
	 */
	monitoring: {
		/**
		 * Entity V2のパフォーマンスメトリクス収集
		 */
		collectMetrics: boolean;

		/**
		 * エラー時の自動ロールバック
		 */
		autoRollback: boolean;

		/**
		 * エラー率の閾値（%）
		 */
		errorThreshold: number;
	};
}

/**
 * デフォルトのフィーチャーフラグ設定
 */
export const defaultFeatureFlags: FeatureFlags = {
	entityV2: {
		video: false,
		audioButton: false,
		mode: "disabled",
		rollout: {
			percentage: 0,
			whitelist: [],
			blacklist: [],
		},
	},
	monitoring: {
		collectMetrics: true,
		autoRollback: true,
		errorThreshold: 5, // 5%以上のエラーで自動ロールバック
	},
};

/**
 * フィーチャーフラグのコンテキスト
 */
export interface FeatureFlagContext {
	/**
	 * ユーザーID
	 */
	userId?: string;

	/**
	 * セッションID
	 */
	sessionId: string;

	/**
	 * 環境
	 */
	environment: "development" | "staging" | "production";

	/**
	 * デバッグモード
	 */
	debug?: boolean;
}

/**
 * フィーチャーフラグの評価結果
 */
export interface FeatureFlagEvaluation {
	/**
	 * フラグが有効かどうか
	 */
	enabled: boolean;

	/**
	 * 評価の理由
	 */
	reason: "default" | "percentage" | "whitelist" | "blacklist" | "error" | "disabled";

	/**
	 * デバッグ情報
	 */
	debug?: {
		context: FeatureFlagContext;
		flags: FeatureFlags;
		evaluationTime: number;
	};
}
