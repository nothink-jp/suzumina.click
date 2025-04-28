import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../../../auth/firebase-admin";
import { getCurrentUser } from "../../../auth/getCurrentUser";

/**
 * 音声クリップお気に入り登録/解除API
 *
 * @param request リクエスト
 * @param params パスパラメータ
 * @returns レスポンス
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clipId: string } },
) {
  try {
    const { clipId } = params;

    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = currentUser.uid;

    // リクエストボディからお気に入り状態を取得
    const body = await request.json();
    const { isFavorite } = body;

    if (typeof isFavorite !== "boolean") {
      return NextResponse.json(
        { error: "isFavoriteパラメータが必要です" },
        { status: 400 },
      );
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップの存在確認
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return NextResponse.json(
        { error: "指定されたクリップが存在しません" },
        { status: 404 },
      );
    }

    // お気に入りドキュメントID
    const favoriteId = `${userId}_${clipId}`;

    // トランザクションで処理
    await db.runTransaction(async (transaction) => {
      // 現在のお気に入り状態を確認
      const favoriteDoc = await transaction.get(
        db.collection("audioClipFavorites").doc(favoriteId),
      );

      const isCurrentlyFavorite = favoriteDoc.exists;

      // 状態が変わらない場合は何もしない
      if (isCurrentlyFavorite === isFavorite) {
        return;
      }

      // お気に入りカウントの更新
      const clipRef = db.collection("audioClips").doc(clipId);

      if (isFavorite) {
        // お気に入り登録
        transaction.update(clipRef, {
          favoriteCount: FieldValue.increment(1),
        });

        transaction.set(db.collection("audioClipFavorites").doc(favoriteId), {
          userId,
          clipId,
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        // お気に入り解除
        transaction.update(clipRef, {
          favoriteCount: FieldValue.increment(-1),
        });

        transaction.delete(db.collection("audioClipFavorites").doc(favoriteId));
      }
    });

    return NextResponse.json({
      id: clipId,
      userId,
      isFavorite,
      message: isFavorite
        ? "お気に入りに登録しました"
        : "お気に入りを解除しました",
    });
  } catch (error) {
    console.error("お気に入り操作に失敗しました:", error);
    return NextResponse.json(
      { error: "お気に入り操作に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * お気に入り状態確認API
 *
 * @param request リクエスト
 * @param params パスパラメータ
 * @returns レスポンス
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clipId: string } },
) {
  try {
    const { clipId } = params;

    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = currentUser.uid;

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // お気に入り状態の確認
    const favoriteId = `${userId}_${clipId}`;
    const favoriteDoc = await db
      .collection("audioClipFavorites")
      .doc(favoriteId)
      .get();

    return NextResponse.json({
      id: clipId,
      userId,
      isFavorite: favoriteDoc.exists,
    });
  } catch (error) {
    console.error("お気に入り状態の確認に失敗しました:", error);
    return NextResponse.json(
      { error: "お気に入り状態の確認に失敗しました" },
      { status: 500 },
    );
  }
}
