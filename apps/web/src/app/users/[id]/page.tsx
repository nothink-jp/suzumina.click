import { auth } from "@/auth";
import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

interface Props {
  params: {
    id: string;
  };
}

interface UserData {
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 動的なメタデータの生成
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const firestore = new Firestore();
  const userDoc = await firestore.collection("users").doc(params.id).get();

  if (!userDoc.exists) {
    return {
      title: "ユーザーが見つかりません - すずみなふぁみりー",
      description: "指定されたユーザーは存在しません。",
    };
  }

  const userData = userDoc.data() as UserData | undefined;
  if (!userData) {
    return {
      title: "データエラー - すずみなふぁみりー",
      description: "ユーザーデータの取得に失敗しました。",
    };
  }

  return {
    title: `${userData.displayName}のプロフィール - すずみなふぁみりー`,
    description: `${userData.displayName}のプロフィールページです。`,
  };
}

export default async function UserPage({ params }: Props) {
  // 認証セッションの確認
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  // Firestoreからユーザー情報を取得
  const firestore = new Firestore();
  const userDoc = await firestore.collection("users").doc(params.id).get();

  // ユーザーが存在しない場合は404へリダイレクト
  if (!userDoc.exists) {
    redirect("/404");
  }

  const userData = userDoc.data() as UserData | undefined;
  if (!userData) {
    redirect("/500");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
          <div className="p-8">
            {/* プロフィールヘッダー */}
            <div className="flex items-center space-x-6">
              <img
                src={userData.avatarUrl}
                alt={userData.displayName}
                className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {userData.displayName}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {userData.role}
                </p>
                {session.user.id === params.id && (
                  <p className="mt-1 text-sm text-gray-500">
                    あなたのプロフィールページです
                  </p>
                )}
              </div>
            </div>

            {/* プロフィール情報 */}
            <div className="mt-8">
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-medium text-gray-900">
                  プロフィール情報
                </h2>
                <div className="mt-4 text-sm text-gray-600 space-y-2">
                  <p>
                    メンバー登録: {" "}
                    {new Date(userData.createdAt.toDate()).toLocaleString(
                      "ja-JP",
                      { dateStyle: "long", timeStyle: "short" },
                    )}
                  </p>
                  <p>
                    最終更新: {" "}
                    {new Date(userData.updatedAt.toDate()).toLocaleString(
                      "ja-JP",
                      { dateStyle: "long", timeStyle: "short" },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
