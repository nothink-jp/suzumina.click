import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../../../auth/firebase-admin";
import { getCurrentUser } from "../../../auth/getCurrentUser";

/**
 * 音声クリップ再生回数インクリメントAPI
 *
 * @param request リクエスト
 * @param context コンテキスト
 * @returns レスポンス
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> },
) {
  try {
    // paramsをawaitで解決
    const { clipId } = await params;

    if (!clipId) {
      return NextResponse.json(
        { error: "クリップIDが必要です" },
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

    // 再生回数をインクリメント
    await db
      .collection("audioClips")
      .doc(clipId)
      .update({
        playCount: FieldValue.increment(1),
      });

    return NextResponse.json({
      id: clipId,
      message: "再生回数が更新されました",
    });
  } catch (error) {
    console.error("再生回数の更新に失敗しました:", error);
    return NextResponse.json(
      { error: "再生回数の更新に失敗しました" },
      { status: 500 },
    );
  }
}
