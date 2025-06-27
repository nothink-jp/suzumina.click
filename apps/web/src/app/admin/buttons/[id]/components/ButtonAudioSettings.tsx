import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { FileAudio, Youtube } from "lucide-react";

interface ButtonAudioSettingsProps {
	button: FrontendAudioButtonData;
}

export function ButtonAudioSettings({ button }: ButtonAudioSettingsProps) {
	// biome-ignore lint/suspicious/noExplicitAny: Temporary fix for type mismatch in refactored components
	const buttonData = button as any;
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{buttonData.audioFileUrl ? (
						<FileAudio className="h-5 w-5" />
					) : (
						<Youtube className="h-5 w-5" />
					)}
					音声設定
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{buttonData.audioFileUrl ? (
					<div className="space-y-3">
						<div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
							<FileAudio className="h-5 w-5 text-green-600" />
							<div>
								<div className="font-medium text-green-800">音声ファイル</div>
								<div className="text-sm text-green-600">直接再生・高品質</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="font-medium">ファイル形式:</span>
								<span className="ml-2">音声ファイル (.mp3/.wav)</span>
							</div>
							{buttonData.duration && (
								<div>
									<span className="font-medium">再生時間:</span>
									<span className="ml-2">{buttonData.duration}秒</span>
								</div>
							)}
						</div>
					</div>
				) : (
					button.sourceVideoId && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<Youtube className="h-5 w-5 text-blue-600" />
								<div>
									<div className="font-medium text-blue-800">YouTube参照</div>
									<div className="text-sm text-blue-600">動画の指定区間を再生</div>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="font-medium">開始時間:</span>
									<span className="ml-2">{button.startTime}秒</span>
								</div>
								<div>
									<span className="font-medium">終了時間:</span>
									<span className="ml-2">{button.endTime}秒</span>
								</div>
							</div>
							{button.sourceVideoTitle && (
								<div className="text-sm">
									<span className="font-medium">動画タイトル:</span>
									<div className="mt-1 p-2 bg-muted rounded">{button.sourceVideoTitle}</div>
								</div>
							)}
						</div>
					)
				)}
			</CardContent>
		</Card>
	);
}
