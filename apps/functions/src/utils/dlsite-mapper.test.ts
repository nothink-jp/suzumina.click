import type {
  DLsiteWorkBase,
  FirestoreDLsiteWorkData,
} from "@suzumina.click/shared-types";
import { describe, expect, it } from "vitest";
import {
  filterWorksForUpdate,
  mapMultipleWorks,
  mapToFirestoreData,
  mapToWorkBase,
  shouldUpdateWork,
  validateWorkData,
} from "./dlsite-mapper";
import type { ParsedWorkData } from "./dlsite-parser";

describe("DLsite Mapper", () => {
  describe("mapToWorkBase", () => {
    it("パースされたデータを正しくDLsiteWorkBase形式に変換できる", () => {
      const parsedData: ParsedWorkData = {
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        category: "SOU",
        workUrl: "/work/=/product_id/RJ123456.html",
        thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
        currentPrice: 1000,
        originalPrice: 1500,
        discount: 33,
        point: 50,
        stars: 4.5,
        ratingCount: 100,
        reviewCount: 50,
        salesCount: 1000,
        ageRating: "全年齢",
        sampleImages: [
          { thumb: "sample1.jpg", width: 560, height: 420 },
          { thumb: "sample2.jpg", width: 560, height: 420 },
        ],
        isExclusive: true,
      };

      const result = mapToWorkBase(parsedData);

      expect(result).toEqual({
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000,
          original: 1500,
          currency: "JPY",
          discount: 33,
          point: 50,
        },
        rating: {
          stars: 4.5,
          count: 100,
          reviewCount: 50,
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [
          {
            thumb: "https://www.dlsite.com/sample1.jpg",
            width: 560,
            height: 420,
          },
          {
            thumb: "https://www.dlsite.com/sample2.jpg",
            width: 560,
            height: 420,
          },
        ],
        isExclusive: true,
      });
    });

    it("評価情報がない場合はundefinedになる", () => {
      const parsedData: ParsedWorkData = {
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        category: "SOU",
        workUrl: "/work/=/product_id/RJ123456.html",
        thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
        currentPrice: 1000,
        originalPrice: 1500,
        discount: 33,
        point: 50,
        stars: 0,
        ratingCount: 0,
        salesCount: 1000,
        ageRating: "全年齢",
        sampleImages: [],
        isExclusive: false,
      };

      const result = mapToWorkBase(parsedData);

      expect(result.rating).toBeUndefined();
    });

    it("絶対URLは変換しない", () => {
      const parsedData: ParsedWorkData = {
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl:
          "https://img.dlsite.jp/modpub/images2/work/doujin/RJ123456_sam.jpg",
        currentPrice: 1000,
        originalPrice: 1500,
        discount: 33,
        point: 50,
        salesCount: 1000,
        ageRating: "全年齢",
        sampleImages: [],
        isExclusive: false,
      };

      const result = mapToWorkBase(parsedData);

      expect(result.workUrl).toBe(
        "https://www.dlsite.com/work/=/product_id/RJ123456.html",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.dlsite.jp/modpub/images2/work/doujin/RJ123456_sam.jpg",
      );
    });

    it("プロトコルなしURLを正しく変換する", () => {
      const parsedData: ParsedWorkData = {
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        category: "SOU",
        workUrl: "//www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl:
          "//img.dlsite.jp/modpub/images2/work/doujin/RJ123456_sam.jpg",
        currentPrice: 1000,
        salesCount: 1000,
        ageRating: "全年齢",
        sampleImages: [],
        isExclusive: false,
      };

      const result = mapToWorkBase(parsedData);

      expect(result.workUrl).toBe(
        "https://www.dlsite.com/work/=/product_id/RJ123456.html",
      );
      expect(result.thumbnailUrl).toBe(
        "https://img.dlsite.jp/modpub/images2/work/doujin/RJ123456_sam.jpg",
      );
    });
  });

  describe("mapToFirestoreData", () => {
    it("DLsiteWorkBaseをFirestore用データに変換できる", () => {
      const workBase: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000,
          original: 1500,
          currency: "JPY",
          discount: 33,
          point: 50,
        },
        rating: {
          stars: 4.5,
          count: 100,
          reviewCount: 50,
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [
          {
            thumb: "https://www.dlsite.com/sample1.jpg",
            width: 560,
            height: 420,
          },
          {
            thumb: "https://www.dlsite.com/sample2.jpg",
            width: 560,
            height: 420,
          },
        ],
        isExclusive: true,
      };

      const result = mapToFirestoreData(workBase);

      expect(result).toMatchObject(workBase);
      expect(result.lastFetchedAt).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(typeof result.lastFetchedAt).toBe("string");
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");
    });

    it("既存データがある場合はcreatedAtを保持する", () => {
      const workBase: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000,
          original: 1500,
          currency: "JPY",
          discount: 33,
          point: 50,
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [],
        isExclusive: false,
      };

      const existingData = {
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      const result = mapToFirestoreData(workBase, existingData);

      expect(result.createdAt).toBe("2023-01-01T00:00:00.000Z");
      expect(result.updatedAt).not.toBe("2023-01-01T00:00:00.000Z");
    });
  });

  describe("mapMultipleWorks", () => {
    it("複数の作品を一括変換できる", () => {
      const parsedWorks: ParsedWorkData[] = [
        {
          productId: "RJ123456",
          title: "テスト作品1",
          circle: "テストサークル1",
          author: "テスト作者1",
          category: "SOU",
          workUrl: "/work/=/product_id/RJ123456.html",
          thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
          currentPrice: 1000,
          salesCount: 1000,
          ageRating: "全年齢",
          sampleImages: [],
          isExclusive: false,
        },
        {
          productId: "RJ789012",
          title: "テスト作品2",
          circle: "テストサークル2",
          author: "テスト作者2",
          category: "SOU",
          workUrl: "/work/=/product_id/RJ789012.html",
          thumbnailUrl: "/img_sam/RJ789012_sam.jpg",
          currentPrice: 2000,
          salesCount: 2000,
          ageRating: "R-15",
          sampleImages: [],
          isExclusive: true,
        },
      ];

      const result = mapMultipleWorks(parsedWorks);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe("RJ123456");
      expect(result[1].productId).toBe("RJ789012");
    });

    it("変換エラーがある作品をスキップできる", () => {
      const parsedWorks: ParsedWorkData[] = [
        {
          productId: "RJ123456",
          title: "テスト作品1",
          circle: "テストサークル1",
          author: "テスト作者1",
          category: "SOU",
          workUrl: "/work/=/product_id/RJ123456.html",
          thumbnailUrl: "/img_sam/RJ123456_sam.jpg",
          currentPrice: 1000,
          salesCount: 1000,
          ageRating: "全年齢",
          sampleImages: [],
          isExclusive: false,
        },
        {
          productId: "", // 無効なproductId
          title: "", // 無効なtitle
          circle: "", // 無効なcircle
          author: "",
          category: "etc",
          workUrl: "",
          thumbnailUrl: "",
          currentPrice: 0,
          salesCount: 0,
          ageRating: "",
          sampleImages: [],
          isExclusive: false,
        },
      ];

      const result = mapMultipleWorks(parsedWorks);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe("RJ123456");
    });
  });

  describe("shouldUpdateWork", () => {
    const baseExisting: FirestoreDLsiteWorkData = {
      id: "RJ123456",
      productId: "RJ123456",
      title: "テスト作品",
      circle: "テストサークル",
      author: "テスト作者",
      description: "",
      category: "SOU",
      workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
      thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
      price: {
        current: 1000,
        original: 1500,
        currency: "JPY",
        discount: 33,
        point: 50,
      },
      rating: {
        stars: 4.5,
        count: 100,
        reviewCount: 50,
      },
      salesCount: 1000,
      ageRating: "全年齢",
      tags: [],
      sampleImages: [],
      isExclusive: false,
      lastFetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("価格が変更された場合はtrueを返す", () => {
      const newData: DLsiteWorkBase = {
        ...baseExisting,
        price: {
          ...baseExisting.price,
          current: 800, // 価格変更
        },
      };

      const result = shouldUpdateWork(newData, baseExisting);
      expect(result).toBe(true);
    });

    it("評価数が変更された場合はtrueを返す", () => {
      const newData: DLsiteWorkBase = {
        ...baseExisting,
        rating: baseExisting.rating
          ? {
              ...baseExisting.rating,
              count: 150, // 評価数変更
            }
          : undefined,
      };

      const result = shouldUpdateWork(newData, baseExisting);
      expect(result).toBe(true);
    });

    it("販売数が変更された場合はtrueを返す", () => {
      const newData: DLsiteWorkBase = {
        ...baseExisting,
        salesCount: 2000, // 販売数変更
      };

      const result = shouldUpdateWork(newData, baseExisting);
      expect(result).toBe(true);
    });

    it("タイトルが変更された場合はtrueを返す", () => {
      const newData: DLsiteWorkBase = {
        ...baseExisting,
        title: "新しいタイトル", // タイトル変更
      };

      const result = shouldUpdateWork(newData, baseExisting);
      expect(result).toBe(true);
    });

    it("24時間以上更新されていない場合はtrueを返す", () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25時間前
      const existingOld: FirestoreDLsiteWorkData = {
        ...baseExisting,
        updatedAt: oldDate,
      };

      const newData: DLsiteWorkBase = { ...baseExisting };

      const result = shouldUpdateWork(newData, existingOld);
      expect(result).toBe(true);
    });

    it("変更がない場合はfalseを返す", () => {
      const newData: DLsiteWorkBase = { ...baseExisting };

      const result = shouldUpdateWork(newData, baseExisting);
      expect(result).toBe(false);
    });
  });

  describe("filterWorksForUpdate", () => {
    it("新規作品と更新が必要な作品を正しく分類できる", () => {
      const newWorks: DLsiteWorkBase[] = [
        {
          id: "RJ123456",
          productId: "RJ123456",
          title: "既存作品（更新あり）",
          circle: "テストサークル",
          author: "テスト作者",
          description: "",
          category: "SOU",
          workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
          thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
          price: {
            current: 800, // 価格変更あり
            original: 1500,
            currency: "JPY",
            discount: 33,
            point: 50,
          },
          salesCount: 1000,
          ageRating: "全年齢",
          tags: [],
          sampleImages: [],
          isExclusive: false,
        },
        {
          id: "RJ789012",
          productId: "RJ789012",
          title: "新規作品",
          circle: "テストサークル",
          author: "テスト作者",
          description: "",
          category: "SOU",
          workUrl: "https://www.dlsite.com/work/=/product_id/RJ789012.html",
          thumbnailUrl: "https://www.dlsite.com/img_sam/RJ789012_sam.jpg",
          price: {
            current: 2000,
            original: 2000,
            currency: "JPY",
          },
          salesCount: 500,
          ageRating: "R-15",
          tags: [],
          sampleImages: [],
          isExclusive: true,
        },
      ];

      const existingWorksMap = new Map<string, FirestoreDLsiteWorkData>([
        [
          "RJ123456",
          {
            id: "RJ123456",
            productId: "RJ123456",
            title: "既存作品（更新あり）",
            circle: "テストサークル",
            author: "テスト作者",
            description: "",
            category: "SOU",
            workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
            thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
            price: {
              current: 1000, // 古い価格
              original: 1500,
              currency: "JPY",
              discount: 33,
              point: 50,
            },
            salesCount: 1000,
            ageRating: "全年齢",
            tags: [],
            sampleImages: [],
            isExclusive: false,
            lastFetchedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      ]);

      const result = filterWorksForUpdate(newWorks, existingWorksMap);

      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].productId).toBe("RJ789012");
      expect(result.toUpdate).toHaveLength(1);
      expect(result.toUpdate[0].new.productId).toBe("RJ123456");
      expect(result.unchanged).toHaveLength(0);
    });
  });

  describe("validateWorkData", () => {
    it("有効なデータに対してisValid=trueを返す", () => {
      const validWork: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000,
          original: 1500,
          currency: "JPY",
          discount: 33,
          point: 50,
        },
        rating: {
          stars: 4.5,
          count: 100,
          reviewCount: 50,
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [],
        isExclusive: false,
      };

      const result = validateWorkData(validWork);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("無効なデータに対して警告を返す", () => {
      const invalidWork: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "", // 空のタイトル
        circle: "", // 空のサークル名
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "invalid-url", // 無効なURL
        thumbnailUrl: "invalid-url", // 無効なURL
        price: {
          current: -100, // 負の価格
          original: 1500, // 元の価格
          currency: "JPY",
          discount: 150, // 不正な割引率
        },
        rating: {
          stars: 6, // 範囲外の星数
          count: -10, // 負の評価数
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [],
        isExclusive: false,
      };

      const result = validateWorkData(invalidWork);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain("タイトルが空です");
      expect(result.warnings).toContain("サークル名が空です");
      expect(result.warnings).toContain("価格が負の値です");
      expect(result.warnings).toContain("割引率が不正です (0-100%の範囲外)");
      expect(result.warnings).toContain("評価星数が不正です (0-5の範囲外)");
      expect(result.warnings).toContain("評価数が負の値です");
      expect(result.warnings).toContain("作品URLが不正です");
      expect(result.warnings).toContain("サムネイルURLが不正です");
    });

    it("元の価格が現在価格以下の場合に警告を返す", () => {
      const invalidWork: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000, // 現在価格
          original: 500, // 元の価格が現在価格以下
          currency: "JPY",
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [],
        isExclusive: false,
      };

      const result = validateWorkData(invalidWork);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain("元の価格が現在価格以下です");
    });

    it("評価情報がない場合は評価関連の警告が出ない", () => {
      const workWithoutRating: DLsiteWorkBase = {
        id: "RJ123456",
        productId: "RJ123456",
        title: "テスト作品",
        circle: "テストサークル",
        author: "テスト作者",
        description: "",
        category: "SOU",
        workUrl: "https://www.dlsite.com/work/=/product_id/RJ123456.html",
        thumbnailUrl: "https://www.dlsite.com/img_sam/RJ123456_sam.jpg",
        price: {
          current: 1000,
          currency: "JPY",
        },
        salesCount: 1000,
        ageRating: "全年齢",
        tags: [],
        sampleImages: [],
        isExclusive: false,
      };

      const result = validateWorkData(workWithoutRating);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
