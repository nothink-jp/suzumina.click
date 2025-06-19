import AudioReferenceCreator from "@/components/AudioReferenceCreator";
import { Button } from "@suzumina.click/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CreateAudioButtonPageProps {
  searchParams: Promise<{
    video_id?: string;
    video_title?: string;
    start_time?: string;
  }>;
}

export default async function CreateAudioButtonPage({
  searchParams,
}: CreateAudioButtonPageProps) {
  const resolvedSearchParams = await searchParams;

  // URLパラメータから初期値を取得
  const videoId = resolvedSearchParams.video_id;
  const videoTitle = resolvedSearchParams.video_title;
  const startTime = resolvedSearchParams.start_time
    ? Number.parseInt(resolvedSearchParams.start_time, 10)
    : undefined;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* パンくずナビゲーション */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/buttons" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            音声ボタン一覧に戻る
          </Link>
        </Button>
      </div>

      {/* AudioReferenceCreator コンポーネント */}
      <AudioReferenceCreator
        videoId={videoId}
        videoTitle={videoTitle ? decodeURIComponent(videoTitle) : undefined}
        initialStartTime={startTime}
      />
    </div>
  );
}
