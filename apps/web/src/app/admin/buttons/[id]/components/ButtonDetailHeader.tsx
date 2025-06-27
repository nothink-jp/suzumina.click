import { type FrontendAudioButtonData, getCategoryDisplayName } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Edit, FileAudio, Play, Trash2, Youtube } from "lucide-react";

interface ButtonDetailHeaderProps {
	button: FrontendAudioButtonData;
}

export function ButtonDetailHeader({ button }: ButtonDetailHeaderProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-foreground mb-2">音声ボタン詳細</h1>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{getCategoryDisplayName(button.category)}</Badge>
						<Badge variant="outline" className="flex items-center gap-1">
							{button.audioFileUrl ? (
								<>
									<FileAudio className="h-3 w-3" />
									音声ファイル
								</>
							) : (
								<>
									<Youtube className="h-3 w-3" />
									YouTube
								</>
							)}
						</Badge>
					</div>
				</div>

				{/* アクションボタン */}
				<div className="flex gap-2">
					<Button variant="default" className="flex items-center gap-2">
						<Play className="h-4 w-4" />
						再生
					</Button>
					<Button variant="outline" className="flex items-center gap-2">
						<Edit className="h-4 w-4" />
						編集
					</Button>
					<Button variant="destructive" className="flex items-center gap-2">
						<Trash2 className="h-4 w-4" />
						削除
					</Button>
				</div>
			</div>
		</div>
	);
}
