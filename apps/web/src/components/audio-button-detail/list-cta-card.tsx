import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getAudioButtonsList } from "@/app/buttons/actions";

/**
 * 一覧誘導カード（SPR-255）: 外部流入者を「1ボタン聴いて終わり」にしない受け皿の最終導線。
 * 総数は limit 1 のクエリ（count 集計 + 1 doc）で取得し、失敗時は数字なしの文言で縮退する。
 */

export async function ListCtaCard() {
	const result = await getAudioButtonsList({ limit: 1 }).catch(() => null);
	const totalCount = result?.success ? result.data.totalCount : null;

	return (
		<section className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] border-[1.5px] border-minase-200 bg-minase-50 px-6 py-5 max-sm:flex-col max-sm:text-center sm:px-7 sm:py-6">
			<div>
				<p className="mb-1 text-base font-extrabold text-minase-950">ほかのボタンも押してみる？</p>
				<p className="text-[13px] text-minase-800">
					{totalCount
						? `みんなが作った音声ボタンが全 ${totalCount} 個、あなたのタップを待ってます`
						: "みんなが作った音声ボタンが、あなたのタップを待ってます"}
				</p>
			</div>
			<Link
				href="/buttons"
				className="inline-flex flex-none items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-[0_4px_12px_hsl(var(--suzuka-500)/0.3)] transition-opacity hover:opacity-90 max-sm:w-full max-sm:justify-center"
			>
				ボタン一覧を見る
				<ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.5} />
			</Link>
		</section>
	);
}
