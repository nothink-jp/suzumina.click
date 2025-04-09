import type { Timestamp } from "@google-cloud/firestore";

interface UserInfoSectionProps {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * ユーザーの登録日時と最終更新日時を表示します。
 */
export function UserInfoSection({
  createdAt,
  updatedAt,
}: UserInfoSectionProps) {
  /**
   * FirestoreのTimestampオブジェクトを指定された日本語ロケール形式の日時文字列に変換します。
   * @param timestamp - フォーマットするTimestampオブジェクト。
   * @returns フォーマットされた日時文字列。
   */
  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString("ja-JP", {
      dateStyle: "long",
      timeStyle: "short",
    });
  };

  return (
    <div className="mt-8">
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-medium text-gray-900">プロフィール情報</h2>
        <div className="mt-4 text-sm text-gray-600 space-y-2">
          <p>メンバー登録: {formatDate(createdAt)}</p>
          <p>最終更新: {formatDate(updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
