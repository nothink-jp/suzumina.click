import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Youtube } from "lucide-react";
import Link from "next/link";
import { getAudioButtonsList } from "@/app/buttons/actions";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import type { AudioButtonQuery } from "@/types/audio-button";

interface RelatedAudioButtonsProps {
	currentId: string;
	videoId: string;
	tags: string[];
}

export async function RelatedAudioButtons({
	currentId,
	videoId,
	tags: _tags,
}: RelatedAudioButtonsProps) {
	try {
		// 同じ動画の音声ボタンを取得
		const sameVideoQuery: AudioButtonQuery = {
			sourceVideoId: videoId,
			limit: 6,
			sortBy: "newest",
			onlyPublic: true,
			includeTotalCount: false, // 関連音声ボタンでは総数は不要
		};

		const sameVideoResult = await getAudioButtonsList(sameVideoQuery);

		if (sameVideoResult.success) {
			const relatedButtons = sameVideoResult.data.audioButtons.filter(
				(button: AudioButtonPlainObject) => button.id !== currentId,
			);

			if (relatedButtons.length > 0) {
				return (
					<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Youtube className="h-5 w-5 text-suzuka-600" />
								同じ動画の音声ボタン
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-3 items-start">
								{relatedButtons.slice(0, 6).map((audioButton: AudioButtonPlainObject) => (
									<AudioButtonWithPlayCount
										key={audioButton.id}
										audioButton={audioButton}
										showFavorite={true}
										maxTitleLength={50}
										className="shadow-sm hover:shadow-md transition-all duration-200"
									/>
								))}
							</div>
							{relatedButtons.length > 6 && (
								<div className="mt-6 text-center">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="border-suzuka-200 text-suzuka-600 hover:bg-suzuka-50"
									>
										<Link href={`/buttons?videoId=${videoId}`}>
											この動画の音声ボタンをもっと見る
										</Link>
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				);
			}
		}
	} catch (_error) {
		// 関連音声ボタン取得エラーは無視してページを継続表示
	}

	return null;
}
