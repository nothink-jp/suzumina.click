import { getApps } from "firebase-admin/app";
import type {
  DocumentData,
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";
import { getCurrentUser } from "../auth/getCurrentUser";

/**
 * 音声クリップ一覧取得API
 *
 * @param request リクエスト
 * @returns レスポンス
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const userId = searchParams.get("userId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;
    const startAfterParam = searchParams.get("startAfter");
    const startAfter = startAfterParam ? new Date(startAfterParam) : undefined;

    if (!videoId && !userId) {
      return NextResponse.json(
        { error: "videoIdまたはuserIdが必要です" },
        { status: 400 },
      );
    }

    // Firebase Admin SDKを初期化
    try {
      console.log("Firebase Admin SDKの初期化を開始します");
      initializeFirebaseAdmin(); // Authの初期化
      console.log("Firebase Admin SDKの初期化が完了しました");
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      return NextResponse.json(
        {
          error: "サーバー側の認証初期化に失敗しました",
          details:
            initError instanceof Error ? initError.message : String(initError),
        },
        { status: 500 },
      );
    }

    // Firestoreの取得
    let db: Firestore;
    try {
      db = getFirestore();
      console.log("Firestoreの接続に成功しました");
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      return NextResponse.json(
        {
          error: "データベース接続に失敗しました",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      );
    }

    // クエリ条件の構築
    const clipsCollection = db.collection("audioClips");

    // クエリの構築を段階的に行う
    let queryBuilder: Query<DocumentData> = clipsCollection;

    if (videoId) {
      queryBuilder = queryBuilder.where("videoId", "==", videoId);
    }

    if (userId) {
      queryBuilder = queryBuilder.where("userId", "==", userId);
    }

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser(request);

    // 非公開クリップの表示条件
    // 自分のクリップを取得する場合のみ非公開も含める
    if (!currentUser || (userId && currentUser.uid !== userId)) {
      queryBuilder = queryBuilder.where("isPublic", "==", true);
    }

    // 作成日時の降順で取得
    queryBuilder = queryBuilder.orderBy("createdAt", "desc").limit(limit);

    // ページネーション
    if (startAfter) {
      const startAfterTimestamp = Timestamp.fromDate(startAfter);
      queryBuilder = queryBuilder.startAfter(startAfterTimestamp);
    }

    try {
      const snapshot = await queryBuilder.get();
      const clips = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString(),
        };
      });

      // 次のページがあるかどうか
      const hasMore = clips.length === limit;

      return NextResponse.json({
        clips,
        hasMore,
        lastClip: clips.length > 0 ? clips[clips.length - 1] : null,
      });
    } catch (queryError) {
      console.error("Firestoreクエリの実行に失敗しました:", queryError);
      return NextResponse.json(
        {
          error: "音声クリップの取得に失敗しました",
          details:
            queryError instanceof Error
              ? queryError.message
              : String(queryError),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("音声クリップの取得中に予期せぬエラーが発生しました:", error);
    return NextResponse.json(
      {
        error: "音声クリップの取得に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * 音声クリップ作成API
 *
 * @param request リクエスト
 * @returns レスポンス
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, title, phrase, startTime, endTime, isPublic, tags } = body;

    // 必須パラメータのバリデーション
    if (
      !videoId ||
      !title ||
      startTime === undefined ||
      endTime === undefined
    ) {
      return NextResponse.json(
        { error: "必須パラメータが不足しています" },
        { status: 400 },
      );
    }

    // 時間のバリデーション
    if (
      typeof startTime !== "number" ||
      typeof endTime !== "number" ||
      startTime >= endTime
    ) {
      return NextResponse.json(
        { error: "開始時間は終了時間より前である必要があります" },
        { status: 400 },
      );
    }

    // Firebase Admin SDKを初期化
    try {
      initializeFirebaseAdmin(); // Authの初期化
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      return NextResponse.json(
        {
          error: "サーバー側の認証初期化に失敗しました",
          details:
            initError instanceof Error ? initError.message : String(initError),
        },
        { status: 500 },
      );
    }

    let db: Firestore;
    try {
      db = getFirestore(); // Firestoreの取得
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      return NextResponse.json(
        {
          error: "データベース接続に失敗しました",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 },
      );
    }

    // 動画の存在確認
    try {
      const videoDoc = await db.collection("videos").doc(videoId).get();
      if (!videoDoc.exists) {
        return NextResponse.json(
          { error: "指定された動画が存在しません" },
          { status: 404 },
        );
      }
    } catch (videoError) {
      console.error("動画データの取得に失敗しました:", videoError);
      return NextResponse.json(
        {
          error: "動画データの取得に失敗しました",
          details:
            videoError instanceof Error
              ? videoError.message
              : String(videoError),
        },
        { status: 500 },
      );
    }

    // 新しいクリップを作成
    const now = FieldValue.serverTimestamp();
    const newClip = {
      videoId,
      title,
      phrase: phrase || "",
      startTime,
      endTime,
      userId: currentUser.uid,
      userName: currentUser.displayName || "名無しユーザー",
      userPhotoURL: currentUser.photoURL || null,
      isPublic: isPublic !== false, // デフォルトは公開
      tags: tags || [],
      playCount: 0,
      favoriteCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await db.collection("audioClips").add(newClip);

      // レスポンス用にタイムスタンプをISOString形式に変換
      return NextResponse.json({
        id: docRef.id,
        ...newClip,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (createError) {
      console.error("音声クリップの作成に失敗しました:", createError);
      return NextResponse.json(
        {
          error: "音声クリップの作成に失敗しました",
          details:
            createError instanceof Error
              ? createError.message
              : String(createError),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("音声クリップの作成中に予期せぬエラーが発生しました:", error);
    return NextResponse.json(
      {
        error: "音声クリップの作成に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
