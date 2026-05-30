export const CHARACTERISTIC_AXES = {
	voiceQuality: {
		pitch: { left: "低音", right: "高音" },
		clarity: { left: "クリア", right: "ハスキー" },
		sweetness: { left: "甘い", right: "クール" },
		speed: { left: "ゆっくり", right: "早口" },
		formality: { left: "丁寧語", right: "タメ口" },
	},
	personality: {
		maturity: { left: "幼い", right: "大人びた" },
		intelligence: { left: "天然", right: "知的" },
		dominance: { left: "従順", right: "支配的" },
		cunning: { left: "無邪気", right: "あざとい" },
		independence: { left: "依存的", right: "自立的" },
		emotionalStability: { left: "情緒安定", right: "情緒不安定" },
	},
	behaviorExpression: {
		energy: { left: "ダウナー", right: "アッパー" },
		assertiveness: { left: "受け身", right: "積極的" },
		affection: { left: "ツン", right: "デレ" },
		boldness: { left: "恥ずかしがり", right: "大胆" },
	},
	attributeCharm: {
		stimulation: { left: "癒し", right: "高刺激" },
		style: { left: "清楚", right: "ギャル" },
		appeal: { left: "ピュア", right: "セクシー" },
	},
} as const;
