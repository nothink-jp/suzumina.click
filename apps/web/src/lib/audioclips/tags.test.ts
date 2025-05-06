/**
 * タグ関連機能のテスト
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tagsModule from "./tags";
import {
  addTagsToClip,
  getClipTags,
  getPopularTags,
  normalizeTag,
  removeTagsFromClip,
  searchTags,
  updateClipTags,
  validateTag,
  validateTags,
} from "./tags";

// Firestoreをモック化
vi.mock("firebase/firestore", () => ({
  Timestamp: { fromDate: (date: Date) => ({ toDate: () => date }) },
  serverTimestamp: () => ({ toDate: () => new Date() }),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  runTransaction: vi.fn(),
  arrayRemove: vi.fn(),
  arrayUnion: vi.fn(),
}));

// Firebaseクライアントをモック化
vi.mock("../firebase/client", () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
}));

describe("タグ正規化関数のテスト", () => {
  it("タグの先頭と末尾の空白を削除すること", () => {
    expect(normalizeTag("  テスト  ")).toBe("テスト");
  });

  it("タグを小文字に変換すること", () => {
    expect(normalizeTag("TEST")).toBe("test");
  });

  it("英数字、日本語、ハイフン、アンダースコアを許可すること", () => {
    expect(normalizeTag("テスト_test-123")).toBe("テスト_test-123");
  });

  it("特殊文字を削除すること", () => {
    expect(normalizeTag("テスト!@#$%^&*()+=")).toBe("テスト");
  });

  it("連続したハイフンやアンダースコアを1つにまとめること", () => {
    expect(normalizeTag("test__tag--example")).toBe("test_tag-example");
  });

  it("日本語の漢字、ひらがな、カタカナを許可すること", () => {
    expect(normalizeTag("漢字ひらがなカタカナ")).toBe("漢字ひらがなカタカナ");
  });
});

describe("タグバリデーション関数のテスト", () => {
  it("空のタグに対してエラーメッセージを返すこと", () => {
    expect(validateTag("")).toBe("タグを入力してください");
    expect(validateTag("   ")).toBe("タグを入力してください");
  });

  it("最大長を超えるタグに対してエラーメッセージを返すこと", () => {
    // 31文字のタグ (MAX_TAG_LENGTH = 30)
    const longTag = "あ".repeat(31);
    expect(validateTag(longTag)).toBe("タグは30文字以内で入力してください");
  });

  it("有効なタグに対してnullを返すこと", () => {
    expect(validateTag("テスト")).toBeNull();
    expect(validateTag("test-tag")).toBeNull();
    expect(validateTag("テスト_tag123")).toBeNull();
  });
});

describe("タグリストバリデーション関数のテスト", () => {
  // この関数は実際の実装を使用するためモックしないようにする
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("最大数を超えるタグリストに対してエラーメッセージを返すこと", () => {
    // 11個のタグ (MAX_TAGS_PER_CLIP = 10)
    const tooManyTags = Array(11)
      .fill("")
      .map((_, i) => `tag${i}`);
    expect(validateTags(tooManyTags)).toBe("タグは10個までしか設定できません");
  });

  it("重複するタグを含むリストに対してエラーメッセージを返すこと", () => {
    expect(validateTags(["テスト", "テスト"])).toBe(
      "重複したタグが含まれています",
    );
    expect(validateTags(["テスト", "test", "TEST"])).toBe(
      "重複したタグが含まれています",
    ); // 正規化後に重複
  });

  it("無効なタグを含むリストに対してエラーメッセージを返すこと", () => {
    expect(validateTags(["テスト", ""])).toBe("タグを入力してください");
    expect(validateTags(["テスト", "あ".repeat(31)])).toBe(
      "タグは30文字以内で入力してください",
    );
  });

  it("有効なタグリストに対してnullを返すこと", () => {
    expect(validateTags(["テスト", "test-tag"])).toBeNull();
    expect(validateTags(["タグ1", "タグ2", "タグ3"])).toBeNull();
  });
});

// Firestoreの操作をテストするためのモック設定
import * as firestore from "firebase/firestore";
import { db } from "../firebase/client";

describe("クリップへのタグ追加機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にタグを追加できること", async () => {
    // クリップのモックデータ
    const mockClipData = {
      exists: () => true,
      data: () => ({ tags: ["既存タグ"] }),
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipData as any);
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

    // テスト実行
    const result = await addTagsToClip("clip-123", ["新しいタグ", "タグ2"]);

    // 結果を検証
    expect(result).toBe(true);
    expect(firestore.doc).toHaveBeenCalledWith(db, "audioClips", "clip-123");
    expect(firestore.getDoc).toHaveBeenCalled();
    expect(firestore.updateDoc).toHaveBeenCalled();

    // 更新内容を検証
    const updateArgs = vi.mocked(firestore.updateDoc).mock.calls[0];
    expect(updateArgs[1].tags).toContain("既存タグ");
    expect(updateArgs[1].tags).toContain("新しいタグ");
    expect(updateArgs[1].tags).toContain("タグ2");
    expect(updateArgs[1].updatedAt).toBeDefined();
  });

  it("クリップが見つからない場合はfalseを返すこと", async () => {
    // クリップが見つからないケース
    const mockClipData = {
      exists: () => false,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipData as any);

    // テスト実行
    const result = await addTagsToClip("not-found", ["タグ"]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it("無効なタグを追加しようとした場合はfalseを返すこと", async () => {
    // モックを使わずに実際の関数でテスト
    vi.spyOn(tagsModule, "validateTags").mockImplementationOnce(() => {
      return "タグは30文字以内で入力してください";
    });

    // テスト実行
    const result = await addTagsToClip("clip-123", ["あ".repeat(31)]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.getDoc).not.toHaveBeenCalled();
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it("空のタグリストの場合はfalseを返すこと", async () => {
    // テスト実行
    const result = await addTagsToClip("clip-123", []);

    // 結果を検証
    expect(result).toBe(false);
  });

  it("最大タグ数を超える場合はfalseを返すこと", async () => {
    // すでに10個のタグがあるクリップ
    const mockClipData = {
      exists: () => true,
      data: () => ({
        tags: Array(9)
          .fill("")
          .map((_, i) => `既存タグ${i}`),
      }),
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipData as any);

    // 新たに2つのタグを追加しようとする
    const result = await addTagsToClip("clip-123", ["新タグ1", "新タグ2"]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

describe("クリップからのタグ削除機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にタグを削除できること", async () => {
    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    // arrayRemoveは値自体ではなく、Firestoreの特殊なフィールド更新操作を表すオブジェクトを返す
    vi.mocked(firestore.arrayRemove).mockReturnValue(
      "arrayRemoveOperation" as any,
    );
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

    // テスト実行
    const result = await removeTagsFromClip("clip-123", ["削除対象タグ"]);

    // 結果を検証
    expect(result).toBe(true);
    expect(firestore.doc).toHaveBeenCalledWith(db, "audioClips", "clip-123");
    expect(firestore.updateDoc).toHaveBeenCalled();
    expect(firestore.arrayRemove).toHaveBeenCalledWith("削除対象タグ");
  });

  it("空のタグリストの場合はfalseを返すこと", async () => {
    // テスト実行
    const result = await removeTagsFromClip("clip-123", []);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it("クリップIDが指定されていない場合はfalseを返すこと", async () => {
    // テスト実行
    const result = await removeTagsFromClip("", ["タグ"]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

describe("クリップのタグ一括更新機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にタグを一括更新できること", async () => {
    // validateTagsが正常（null）を返すことを確認
    vi.spyOn(tagsModule, "validateTags").mockReturnValueOnce(null);

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);

    // テスト実行
    const result = await updateClipTags("clip-123", [
      "タグ1",
      "タグ2",
      "タグ3",
    ]);

    // 結果を検証
    expect(result).toBe(true);
    expect(firestore.doc).toHaveBeenCalledWith(db, "audioClips", "clip-123");
    expect(firestore.updateDoc).toHaveBeenCalled();

    // 更新内容を検証
    const updateArgs = vi.mocked(firestore.updateDoc).mock.calls[0];
    expect(updateArgs[1].tags).toEqual(["タグ1", "タグ2", "タグ3"]);
    expect(updateArgs[1].updatedAt).toBeDefined();
  });

  it("無効なタグを含む場合はfalseを返すこと", async () => {
    // 長すぎるタグを使用して検証に失敗するケースをテスト
    const longTag = "あ".repeat(31); // MAX_TAG_LENGTH = 30

    // コンソールエラーをキャプチャしないようにする
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // テスト実行 - 長すぎるタグを含むリストを渡す
    const result = await updateClipTags("clip-123", ["有効なタグ", longTag]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled(); // エラーログが出力されたことを確認

    // クリーンアップ
    consoleSpy.mockRestore();
  });

  it("クリップIDが指定されていない場合はfalseを返すこと", async () => {
    // テスト実行
    const result = await updateClipTags("", ["タグ1", "タグ2"]);

    // 結果を検証
    expect(result).toBe(false);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

describe("タグ検索機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("キーワードに一致するタグを検索できること", async () => {
    // モックデータ
    const mockQuerySnapshot = {
      docs: [
        { id: "タグ1", data: () => ({ count: 10 }) },
        { id: "タグ2", data: () => ({ count: 5 }) },
      ],
      size: 2,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.collection).mockReturnValue("tagsCollection" as any);
    vi.mocked(firestore.query).mockReturnValue("tagsQuery" as any);
    vi.mocked(firestore.getDocs).mockResolvedValue(mockQuerySnapshot as any);

    // テスト実行
    const result = await searchTags({ query: "タグ", limit: 10 });

    // 結果を検証
    expect(result.tags.length).toBe(2);
    expect(result.tags[0].id).toBe("タグ1");
    expect(result.tags[0].count).toBe(10);
    expect(result.tags[1].id).toBe("タグ2");
    expect(result.hasMore).toBe(false);
  });

  it("検索クエリがない場合は空の結果を返すこと", async () => {
    // テスト実行
    const result = await searchTags({ query: "", limit: 10 });

    // 結果を検証
    expect(result.tags).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it("hasMoreフラグを正しく設定すること", async () => {
    // limitより1つ多い結果があるケース
    const mockQuerySnapshot = {
      docs: Array(11)
        .fill("")
        .map((_, i) => ({
          id: `タグ${i}`,
          data: () => ({ count: 10 - i }),
        })),
      size: 11,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.collection).mockReturnValue("tagsCollection" as any);
    vi.mocked(firestore.query).mockReturnValue("tagsQuery" as any);
    vi.mocked(firestore.getDocs).mockResolvedValue(mockQuerySnapshot as any);

    // テスト実行 (limit: 10)
    const result = await searchTags({ query: "タグ", limit: 10 });

    // 結果を検証
    expect(result.tags.length).toBe(10); // limitまでの結果のみ
    expect(result.hasMore).toBe(true); // 追加の結果があるため true
  });
});

describe("人気タグ取得機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("人気順にタグを取得できること", async () => {
    // モックデータ
    const mockQuerySnapshot = {
      docs: [
        { id: "人気タグ1", data: () => ({ count: 100 }) },
        { id: "人気タグ2", data: () => ({ count: 50 }) },
        { id: "人気タグ3", data: () => ({ count: 30 }) },
      ],
      size: 3,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.collection).mockReturnValue("tagsCollection" as any);
    vi.mocked(firestore.query).mockReturnValue("tagsQuery" as any);
    vi.mocked(firestore.getDocs).mockResolvedValue(mockQuerySnapshot as any);

    // テスト実行
    const result = await getPopularTags({ limit: 20 });

    // 結果を検証
    expect(result.tags.length).toBe(3);
    expect(result.tags[0].id).toBe("人気タグ1");
    expect(result.tags[0].count).toBe(100);
    expect(result.tags[1].id).toBe("人気タグ2");
    expect(result.tags[2].id).toBe("人気タグ3");
    expect(result.hasMore).toBe(false);
  });

  it("hasMoreフラグを正しく設定すること", async () => {
    // limitより1つ多い結果があるケース
    const mockQuerySnapshot = {
      docs: Array(21)
        .fill("")
        .map((_, i) => ({
          id: `人気タグ${i}`,
          data: () => ({ count: 100 - i }),
        })),
      size: 21,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.collection).mockReturnValue("tagsCollection" as any);
    vi.mocked(firestore.query).mockReturnValue("tagsQuery" as any);
    vi.mocked(firestore.getDocs).mockResolvedValue(mockQuerySnapshot as any);

    // テスト実行 (limit: 20, デフォルト)
    const result = await getPopularTags();

    // 結果を検証
    expect(result.tags.length).toBe(20); // limitまでの結果のみ
    expect(result.hasMore).toBe(true); // 追加の結果があるため true
  });
});

describe("クリップタグ取得機能のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("クリップのタグを取得できること", async () => {
    // モックデータ
    const mockClipDoc = {
      exists: () => true,
      data: () => ({ tags: ["タグ1", "タグ2", "タグ3"] }),
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipDoc as any);

    // テスト実行
    const result = await getClipTags("clip-123");

    // 結果を検証
    expect(result.length).toBe(3);
    expect(result[0].id).toBe("タグ1");
    expect(result[0].text).toBe("タグ1");
    expect(result[1].id).toBe("タグ2");
    expect(result[2].id).toBe("タグ3");
  });

  it("クリップが存在しない場合は空配列を返すこと", async () => {
    // モックデータ
    const mockClipDoc = {
      exists: () => false,
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipDoc as any);

    // テスト実行
    const result = await getClipTags("not-found");

    // 結果を検証
    expect(result).toEqual([]);
  });

  it("クリップIDが指定されていない場合は空配列を返すこと", async () => {
    // テスト実行
    const result = await getClipTags("");

    // 結果を検証
    expect(result).toEqual([]);
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it("クリップにタグが設定されていない場合は空配列を返すこと", async () => {
    // モックデータ
    const mockClipDoc = {
      exists: () => true,
      data: () => ({}), // tagsプロパティなし
    };

    // Firestoreの操作をモック
    vi.mocked(firestore.doc).mockReturnValue("clipRef" as any);
    vi.mocked(firestore.getDoc).mockResolvedValue(mockClipDoc as any);

    // テスト実行
    const result = await getClipTags("clip-123");

    // 結果を検証
    expect(result).toEqual([]);
  });
});
