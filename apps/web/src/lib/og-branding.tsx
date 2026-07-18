import { OG_MINASE_800, OG_SUZUKA_100, OG_SUZUKA_500, OG_SUZUKA_700 } from "@/lib/og-palette";

/**
 * OG 画像のブランド署名・バッジの正本（全カード共通アトム）。
 * X 等のタイムラインでカードが並んだとき同一サイトと認識できるよう、
 * 4系統のカードレイアウト（root / buttons / works・videos / circles・creators）で
 * 署名（底部左: サイト名＋ドメイン＋suzuka バー）とバッジピルの見た目をここに統一する。
 */

/** バッジピル。配置（alignSelf 等）はカード側の文脈に依存するため style で渡す */
export function OgBadge({ label, style }: { label: string; style?: React.CSSProperties }) {
	return (
		<span
			style={{
				backgroundColor: OG_SUZUKA_100,
				color: OG_SUZUKA_700,
				fontWeight: 700,
				fontSize: 25,
				padding: "10px 30px",
				borderRadius: 9999,
				...style,
			}}
		>
			{label}
		</span>
	);
}

/**
 * 底部署名（サイト名＋ドメイン）＋ suzuka バー。カードの最下部に置く。
 * ascii=true（ブランドフォント取得失敗の縮退版）では日本語サイト名が tofu 化するため
 * ドメイン表記のみに落とす
 */
export function OgFooter({ ascii = false }: { ascii?: boolean }) {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 64px 40px" }}>
				{ascii ? (
					<span style={{ fontWeight: 700, fontSize: 30, color: OG_SUZUKA_500 }}>
						suzumina.click
					</span>
				) : (
					<>
						<span style={{ fontWeight: 700, fontSize: 30, color: OG_SUZUKA_500 }}>
							すずみなくりっく！
						</span>
						<span style={{ fontSize: 22, color: OG_MINASE_800 }}>suzumina.click</span>
					</>
				)}
			</div>
			<div style={{ display: "flex", height: 14, flexShrink: 0, backgroundColor: OG_SUZUKA_500 }} />
		</div>
	);
}
