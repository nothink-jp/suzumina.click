import { parseDurationToSeconds } from "@suzumina.click/shared-types/src/video";
import { notFound, redirect } from "next/navigation";
import { getAudioButtonById } from "@/app/buttons/actions";
import { getVideoById } from "@/app/videos/actions";
import { auth } from "@/auth";
import { AudioButtonEditor } from "@/components/audio/audio-button-editor";

interface AudioButtonEditPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function AudioButtonEditPage({ params }: AudioButtonEditPageProps) {
	const { id } = await params;

	// 音声ボタンデータを取得
	const result = await getAudioButtonById(id);

	if (!result.success) {
		notFound();
	}

	const audioButton = result.data;

	// 認証チェック
	const session = await auth();
	if (!session?.user) {
		redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/buttons/${id}/edit`)}`);
	}

	// 権限チェック：作成者本人または管理者のみ編集可能
	const canEdit = audioButton.createdBy === session.user.discordId || session.user.role === "admin";
	if (!canEdit) {
		redirect(`/buttons/${id}`);
	}

	// 動画情報を取得して実際の動画長を取得
	const video = await getVideoById(audioButton.sourceVideoId);
	const videoDuration = video ? parseDurationToSeconds(video.duration) : 600; // 取得できない場合は600秒をデフォルト値に

	return <AudioButtonEditor audioButton={audioButton} videoDuration={videoDuration} />;
}

export async function generateMetadata({ params }: AudioButtonEditPageProps) {
	const { id } = await params;

	const result = await getAudioButtonById(id);

	if (!result.success) {
		return {
			title: "音声ボタンが見つかりません",
		};
	}

	const audioButton = result.data;

	return {
		title: `「${audioButton.title}」を編集 - suzumina.click`,
		description: `音声ボタン「${audioButton.title}」の編集画面`,
	};
}
