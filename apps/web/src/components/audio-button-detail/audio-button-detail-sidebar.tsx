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
				{/* ページ h1 と VideoCard の見出し(h3)の間を埋める中間見出し（sr-only） */}
				<h2 className="sr-only">元動画</h2>
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
				{/* 作成者セクションの見出し（sr-only）。UserCard 内の h3 の親見出しを補う */}
				<h2 className="sr-only">作成者</h2>
				<Suspense
					fallback={
						<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg flex items-center gap-2">
									<User className="h-5 w-5 text-primary" />
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
