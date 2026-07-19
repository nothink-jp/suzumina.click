"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import Link from "next/link";
import { useMemo } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { useFavoriteStatusBulk } from "@/hooks/use-favorite-status-bulk";
import { useLikeDislikeStatusBulk } from "@/hooks/use-like-dislike-status-bulk";

/**
 * 用途別/動画ごとビューのグループカード描画（SPR-257 PR②）。
 * ビュー内の全ボタン ID を1回の bulk 取得で解決し、各ボタンへ初期値として注入する
 * （グループごとに取得すると 9〜28 回に分裂するため、ビュー単位で束ねる）。
 * デザイン正本: Claude Design「ボタン一覧.dc.html」（改訂版）
 */

export interface ButtonGroup {
	key: string;
	title: string;
	/** グループの総件数（表示は buttons の上限つき） */
	total: number;
	buttons: AudioButtonPlainObject[];
	/** 「もっと見る」の遷移先（省略時は非表示） */
	moreHref?: string;
	/** 動画ごとビュー用のサムネイルとリンク */
	thumbnailUrl?: string;
	videoHref?: string;
}

interface GroupedButtonsViewProps {
	heading: string;
	/** 実総数（count() 集計値） */
	totalCount: number;
	/** 取得上限で切られた場合の実表示対象件数（未指定なら全件表示） */
	truncatedTo?: number;
	groups: ButtonGroup[];
}

export function GroupedButtonsView({
	heading,
	totalCount,
	truncatedTo,
	groups,
}: GroupedButtonsViewProps) {
	const allIds = useMemo(() => groups.flatMap((g) => g.buttons.map((b) => b.id)), [groups]);
	const { favoriteStates } = useFavoriteStatusBulk(allIds);
	const { likeDislikeStates } = useLikeDislikeStatusBulk(allIds);

	if (groups.length === 0) {
		return (
			<div className="py-12 text-center text-sm text-muted-foreground">
				条件にあうボタンが見つかりませんでした
			</div>
		);
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-baseline gap-2.5">
				<h2 className="text-lg font-extrabold">{heading}</h2>
				<span className="text-[13px] text-muted-foreground">{totalCount}件</span>
				{truncatedTo !== undefined && (
					<span className="text-xs text-muted-foreground">（最新 {truncatedTo} 件を表示中）</span>
				)}
			</div>

			{groups.map((group) => (
				<div
					key={group.key}
					className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:p-5"
				>
					<div className="mb-4 flex items-center gap-3">
						{group.thumbnailUrl && (
							<div
								role="img"
								aria-label={group.title}
								className="aspect-video w-[96px] flex-none rounded-[10px] bg-muted bg-cover bg-center sm:w-[128px]"
								style={{ backgroundImage: `url(${group.thumbnailUrl})` }}
							/>
						)}
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
							<h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug">
								{group.title}
							</h3>
							<span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-extrabold text-secondary-foreground">
								{group.total}件
							</span>
						</div>
						{group.videoHref && (
							<Link
								href={group.videoHref}
								className="flex-none rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-foreground no-underline transition-colors hover:bg-accent"
							>
								動画を見る
							</Link>
						)}
						{group.moreHref && (
							<Link
								href={group.moreHref}
								className="flex-none rounded-full px-3 py-1.5 text-[13px] font-bold text-suzuka-600 no-underline transition-colors hover:bg-accent hover:text-suzuka-700"
							>
								もっと見る →
							</Link>
						)}
					</div>

					<div className="flex flex-wrap gap-3">
						{group.buttons.map((button) => {
							const likeDislikeStatus = likeDislikeStates.get(button.id);
							return (
								<AudioButtonWithPlayCount
									key={button.id}
									audioButton={button}
									initialIsFavorited={favoriteStates.get(button.id) || false}
									initialIsLiked={likeDislikeStatus?.isLiked || false}
								/>
							);
						})}
					</div>

					{group.total > group.buttons.length && (
						<p className="mt-3.5 text-xs text-muted-foreground">
							{group.moreHref
								? `ほか ${group.total - group.buttons.length} 件は「もっと見る」から`
								: `ほか ${group.total - group.buttons.length} 件`}
						</p>
					)}
				</div>
			))}
		</section>
	);
}
