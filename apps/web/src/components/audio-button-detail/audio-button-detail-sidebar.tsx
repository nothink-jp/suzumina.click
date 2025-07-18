import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Eye, User } from "lucide-react";
import { Suspense } from "react";
import { UserCardWrapper } from "./user-card-wrapper";
import { VideoCardWrapper } from "./video-card-wrapper";

interface AudioButtonDetailSidebarProps {
	videoId: string;
	videoTitle?: string;
	createdBy: string;
	createdByName: string;
}

export function AudioButtonDetailSidebar({
	videoId,
	videoTitle,
	createdBy,
	createdByName,
}: AudioButtonDetailSidebarProps) {
	return (
		<div className="lg:col-span-1">
			<div className="space-y-6">
				{/* 動画カード */}
				<Suspense
					fallback={
						<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
							<CardContent className="p-6">
								<div className="flex items-center justify-center py-8">
									<Eye className="h-8 w-8 animate-pulse text-muted-foreground" />
								</div>
							</CardContent>
						</Card>
					}
				>
					<VideoCardWrapper videoId={videoId} fallbackTitle={videoTitle} />
				</Suspense>

				{/* ユーザーカード */}
				<Suspense
					fallback={
						<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center gap-2">
									<User className="h-5 w-5 text-suzuka-600" />
									作成者
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-center py-4">
									<Eye className="h-6 w-6 animate-pulse text-muted-foreground" />
								</div>
							</CardContent>
						</Card>
					}
				>
					<UserCardWrapper createdBy={createdBy} createdByName={createdByName} />
				</Suspense>
			</div>
		</div>
	);
}
