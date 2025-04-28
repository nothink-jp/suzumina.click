import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../../auth/firebase-admin";
import { getCurrentUser } from "../../auth/getCurrentUser";

/**
 * 特定の音声クリップ取得API
 *
 * @param request リクエスト
 * @param context コンテキスト
 * @returns レスポンス
 */
export async function GET(
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

    // クリップの取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return NextResponse.json(
        { error: "指定されたクリップが存在しません" },
        { status: 404 },
      );
    }

    const clipData = clipDoc.data();

    // 非公開クリップの場合は作成者のみアクセス可能
    if (clipData && !clipData.isPublic) {
      const currentUser = await getCurrentUser();

      if (!currentUser || currentUser.uid !== clipData.userId) {
        return NextResponse.json(
          { error: "このクリップにアクセスする権限がありません" },
          { status: 403 },
        );
      }
    }

    // レスポンス用にタイムスタンプをISOString形式に変換
    return NextResponse.json({
      id: clipDoc.id,
      ...clipData,
      createdAt: clipData?.createdAt?.toDate().toISOString(),
      updatedAt: clipData?.updatedAt?.toDate().toISOString(),
    });
  } catch (error) {
    console.error("音声クリップの取得に失敗しました:", error);
    return NextResponse.json(
      { error: "音声クリップの取得に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * 音声クリップ更新API
 *
 * @param request リクエスト
 * @param context コンテキスト
 * @returns レスポンス
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> },
) {
  try {
    // paramsをawaitで解決
    const { clipId } = await params;

    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップの取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return NextResponse.json(
        { error: "指定されたクリップが存在しません" },
        { status: 404 },
      );
    }

    const clipData = clipDoc.data();

    // 作成者のみ更新可能
    if (clipData && clipData.userId !== currentUser.uid) {
      return NextResponse.json(
        { error: "このクリップを更新する権限がありません" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { title, phrase, isPublic, tags } = body;

    // 更新データの準備
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 更新可能なフィールドのみ更新
    if (title !== undefined) updateData.title = title;
    if (phrase !== undefined) updateData.phrase = phrase;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (tags !== undefined) updateData.tags = tags;

    // 更新実行
    await db.collection("audioClips").doc(clipId).update(updateData);

    return NextResponse.json({
      id: clipId,
      message: "クリップが更新されました",
    });
  } catch (error) {
    console.error("音声クリップの更新に失敗しました:", error);
    return NextResponse.json(
      { error: "音声クリップの更新に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * 音声クリップ削除API
 *
 * @param request リクエスト
 * @param context コンテキスト
 * @returns レスポンス
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> },
) {
  try {
    // paramsをawaitで解決
    const { clipId } = await params;

    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップの取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return NextResponse.json(
        { error: "指定されたクリップが存在しません" },
        { status: 404 },
      );
    }

    const clipData = clipDoc.data();

    // 作成者のみ削除可能
    if (clipData && clipData.userId !== currentUser.uid) {
      return NextResponse.json(
        { error: "このクリップを削除する権限がありません" },
        { status: 403 },
      );
    }

    // 削除実行
    await db.collection("audioClips").doc(clipId).delete();

    return NextResponse.json({
      id: clipId,
      message: "クリップが削除されました",
    });
  } catch (error) {
    console.error("音声クリップの削除に失敗しました:", error);
    return NextResponse.json(
      { error: "音声クリップの削除に失敗しました" },
      { status: 500 },
    );
  }
}
