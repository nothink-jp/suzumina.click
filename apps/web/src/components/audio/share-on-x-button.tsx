import { XIcon } from "@suzumina.click/ui/components/custom/x-icon";
import { Button } from "@suzumina.click/ui/components/ui/button";

/**
 * X 共有 intent URL の組み立て正本（SPR-248）。
 * Player Card は承認制で使えないため、共有はカード（OGP）+ Web Intent で行う（SPR-17 の結論）。
 * URL は共有先で意味を持つよう本番の canonical URL に固定する（generateMetadata の og:url と同じ方針）。
 */
export function buildXShareUrl(audioButtonId: string, buttonText: string): string {
	const params = new URLSearchParams({
		text: `「${buttonText}」`,
		// utm は X 共有経由の流入を GA4 / サーバーログで判別するため（canonical は utm なしのまま）
		url: `https://suzumina.click/buttons/${audioButtonId}?utm_source=x&utm_medium=social`,
		hashtags: "涼花みなせ",
	});
	return `https://x.com/intent/post?${params.toString()}`;
}

interface ShareOnXButtonProps {
	audioButtonId: string;
	buttonText: string;
}

/**
 * 「Xで共有」ボタン。per-user 状態を持たないため静的な intent リンクで完結する
 * （client island 不要・SSR そのまま）。
 */
export function ShareOnXButton({ audioButtonId, buttonText }: ShareOnXButtonProps) {
	return (
		<Button variant="outline" size="sm" asChild className="flex items-center gap-1">
			<a
				href={buildXShareUrl(audioButtonId, buttonText)}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`「${buttonText}」をXで共有`}
			>
				<XIcon className="h-4 w-4" />
				Xで共有
			</a>
		</Button>
	);
}
