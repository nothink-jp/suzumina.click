/**
 * タグ関連のユーティリティ関数
 * クライアントサイドで使用可能な検証関数を提供します
 */
import type {
  PopularTagsParams,
  TagApiResponse,
  TagInfo,
  TagSearchParams,
} from "./types";

// タグの最大長さ
export const MAX_TAG_LENGTH = 30;

// 一度に追加できるタグの最大数
export const MAX_TAGS_PER_CLIP = 10;

/**
 * タグを正規化する
 * - 両端の空白を削除
 * - 小文字に変換
 * - 特殊文字を削除
 * @param tag タグテキスト
 * @returns 正規化されたタグテキスト
 */
export const normalizeTag = (tag: string): string => {
  return (
    tag
      .trim()
      .toLowerCase()
      // 英数字、日本語、ハイフン、アンダースコアのみ許可
      .replace(
        /[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005-\u3006\u30E0-\u9FCF-]/g,
        "",
      )
      // 連続するハイフンやアンダースコアを1つにまとめる
      .replace(/[-_]{2,}/g, (match) => match[0])
  );
};

/**
 * タグをバリデーションする
 * @param tag タグテキスト
 * @returns エラーメッセージ（エラーがなければnull）
 */
export const validateTag = (tag: string): string | null => {
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return "タグを入力してください";
  }

  if (normalizedTag.length > MAX_TAG_LENGTH) {
    return `タグは${MAX_TAG_LENGTH}文字以内で入力してください`;
  }

  return null;
};

/**
 * タグリストをバリデーションする
 * @param tags タグリスト
 * @returns エラーメッセージ（エラーがなければnull）
 */
export const validateTags = (tags: string[]): string | null => {
  if (tags.length > MAX_TAGS_PER_CLIP) {
    return `タグは${MAX_TAGS_PER_CLIP}個までしか設定できません`;
  }

  // 重複をチェック
  const uniqueTags = new Set(tags.map(normalizeTag));
  if (uniqueTags.size !== tags.length) {
    return "重複したタグが含まれています";
  }

  // 個別のタグをチェック
  for (const tag of tags) {
    const error = validateTag(tag);
    if (error) {
      return error;
    }
  }

  return null;
};

// 注意: 以下のFirestoreを使用する関数はServer Actions（actions/audioclips/manage-tags.tsなど）に移行しました
// クライアントコンポーネントからはServer Actionsを通じてこれらの機能にアクセスしてください
