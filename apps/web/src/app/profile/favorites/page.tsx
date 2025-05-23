import { incrementPlayCount } from "@/actions/audioclips/actions";
import {
  checkMultipleFavoriteStatus,
  toggleFavorite,
} from "@/actions/audioclips/manage-favorites";
import AudioClipList from "@/components/audioclips/AudioClipList";
import { getFavoriteClips } from "@/lib/audioclips/favorites";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "お気に入りクリップ一覧 - suzumina.click",
  description: "お気に入り登録した音声クリップの一覧ページです。",
};

// 動的レンダリングを明示的に指定
export const dynamic = "force-dynamic";

/**
 * お気に入り音声クリップ一覧ページ
 * ログインユーザーのお気に入りクリップを一覧表示する
 */
export default async function FavoritesPage() {
  // 認証情報を取得
  const { getCurrentUser } = await import("@/actions/auth/getCurrentUser");
  const user = await getCurrentUser();

  // 未ログインの場合はログインページにリダイレクト
  if (!user) {
    redirect("/auth/signin?callbackUrl=/profile/favorites");
  }

  const userId = user.uid;

  // お気に入りクリップを取得（20件）
  const favoriteClips = await getFavoriteClips(userId, 20);

  // checkMultipleFavoriteStatusをAudioClipListのcheckFavoriteStatusActionの型に合わせるアダプター関数
  const singleCheckFavoriteStatus = async (clipId: string, userId?: string) => {
    // ユーザーIDがない場合はfalseを返す
    if (!userId) return false;

    // 1つのIDだけを配列に入れて元の関数を呼び出す
    // getCurrentUserは関数内部で呼び出されるため、userIdは渡さない
    const result = await checkMultipleFavoriteStatus([clipId]);
    // 結果から該当するクリップのお気に入り状態を返す
    return result[clipId] || false;
  };

  // incrementPlayCountの戻り値の型を調整するアダプター関数
  const incrementPlayCountAdapter = async (clipId: string): Promise<void> => {
    // 元の関数を呼び出して戻り値は無視
    await incrementPlayCount(clipId);
    // voidを返すことで型を合わせる
    return;
  };

  // toggleFavoriteの戻り値の型を調整するアダプター関数
  const toggleFavoriteAdapter = async (clipId: string): Promise<void> => {
    // toggleFavoriteはcurrentUserを内部で取得するため、userIdは不要
    await toggleFavorite(clipId);
    // voidを返すことで型を合わせる
    return;
  };

  // clipsプロパティがないため、データを表示するための別の方法を実装
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">お気に入りクリップ</h1>

      {favoriteClips.length > 0 ? (
        <div className="space-y-4">
          {/* それぞれのクリップに対して、適切なビデオIDを渡す */}
          {favoriteClips.map((clip) => (
            <div
              key={clip.id}
              className="border rounded p-4 bg-white shadow-sm"
            >
              <AudioClipList
                videoId={clip.videoId}
                initialClips={[clip]}
                hasMore={false}
                getAudioClipsAction={async () => ({
                  clips: [],
                  hasMore: false,
                  lastClip: null,
                })}
                checkFavoriteStatusAction={singleCheckFavoriteStatus}
                incrementPlayCountAction={incrementPlayCountAdapter}
                toggleFavoriteAction={toggleFavoriteAdapter}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="alert">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-info flex-shrink-0 w-6 h-6"
            >
              <title>情報アイコン</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-bold">お気に入りクリップがありません</h3>
              <div className="text-sm">
                動画ページで「お気に入り」ボタンを押すと、ここにクリップが表示されます。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
