import { auth } from "@/auth";
import { UserInfoSection } from "@/components/UserInfoSection";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import { Card, CardBody } from "@heroui/react"; // Import directly from @heroui/react
import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * UserPage コンポーネントのプロパティ型。
 * params は Promise を含むため、使用前に解決する必要があります。
 */
type Props = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Firestore から取得するユーザーデータの型定義。
 */
interface UserData {
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * ユーザーページ用の動的なメタデータを生成します。
 * Firestore からユーザー情報を取得し、ページタイトルと説明を設定します。
 * ユーザーが存在しない場合やデータ取得に失敗した場合は、適切なメタデータを返します。
 * @param props - コンポーネントのプロパティ。
 * @param props.params - ページのパラメータ（ユーザーIDを含む Promise）。
 * @returns ページのメタデータオブジェクトの Promise。
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const firestore = new Firestore();
  const resolvedParams = await params; // Promise を解決
  const userDoc = await firestore
    .collection("users")
    .doc(resolvedParams.id)
    .get();

  if (!userDoc.exists) {
    return {
      title: "ユーザーが見つかりません - すずみなふぁみりー",
      description: "指定されたユーザーは存在しません。",
    };
  }

  const userData = userDoc.data() as UserData | undefined;
  if (!userData) {
    // データが存在しない、または型が一致しない場合
    return {
      title: "データエラー - すずみなふぁみりー",
      description: "ユーザーデータの取得または解析に失敗しました。",
    };
  }

  return {
    title: `${userData.displayName}のプロフィール - すずみなふぁみりー`,
    description: `${userData.displayName}のプロフィールページです。`,
  };
}

/**
 * ユーザープロフィールページコンポーネント。
 * URL パラメータからユーザー ID を取得し、Firestore からユーザーデータを取得して表示します。
 * 認証されていないユーザー、存在しないユーザー、またはデータ取得に失敗した場合はリダイレクトします。
 * @param props - コンポーネントのプロパティ。
 * @param props.params - ページのパラメータ（ユーザーIDを含む Promise）。
 * @returns ユーザープロフィールページの React 要素。
 */
export default async function UserPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) {
    // セッションとユーザーの存在を確認
    // <<< 修正: 文字列結合をテンプレートリテラルに変更
    redirect(`/auth/signin?callbackUrl=/users/${(await params).id}`); // リダイレクト先を指定
  }

  const resolvedParams = await params; // Promise を解決

  const firestore = new Firestore();
  const userDoc = await firestore
    .collection("users")
    .doc(resolvedParams.id)
    .get();

  if (!userDoc.exists) {
    // ユーザーが存在しない場合はホームページへリダイレクト
    redirect("/");
  }

  const userData = userDoc.data() as UserData | undefined;
  if (!userData) {
    // ユーザーデータの取得または解析に失敗した場合はホームページへリダイレクト
    console.error(`Failed to parse user data for ID: ${resolvedParams.id}`);
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden shadow-lg">
          <CardBody className="p-8">
            <UserProfileHeader
              avatarUrl={userData.avatarUrl}
              displayName={userData.displayName}
              role={userData.role}
              // session.user が存在することは上で確認済み
              isCurrentUser={session.user.id === resolvedParams.id}
            />
            <UserInfoSection
              createdAt={userData.createdAt}
              updatedAt={userData.updatedAt}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
