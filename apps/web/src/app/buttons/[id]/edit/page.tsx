import { notFound, redirect } from "next/navigation";
import { getAudioButtonById } from "@/app/buttons/actions";
import { AudioButtonEditor } from "@/components/audio/audio-button-editor";
import { getCurrentUser } from "@/lib/auth/server";

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
	const user = await getCurrentUser();
	if (!user) {
		redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/buttons/${id}/edit`)}`);
	}

	// 権限チェック：作成者本人のみ編集可能。非作成者には編集ルートを露出せず 404 を返す
	// （作品自体は詳細ページで閲覧可能。「閲覧も不可」ではないため専用 403 は設けない）。
	const canEdit = audioButton.creatorId === user.discordId;
	if (!canEdit) {
		notFound();
	}

	return <AudioButtonEditor audioButton={audioButton} />;
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
		title: `「${audioButton.buttonText}」を編集 - suzumina.click`,
		description: `音声ボタン「${audioButton.buttonText}」の編集画面`,
	};
}
