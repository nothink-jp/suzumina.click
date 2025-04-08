import { auth } from "@/auth";
import { UserInfoSection } from "@/components/UserInfoSection";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import { Card, CardBody } from "@suzumina.click/ui"; // Updated import path and name (CardContent -> CardBody)
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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
  const resolvedParams = await params;
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
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  const resolvedParams = await params;

  const firestore = new Firestore();
  const userDoc = await firestore
    .collection("users")
    .doc(resolvedParams.id)
    .get();

  if (!userDoc.exists) {
    redirect("/404");
  }

  const userData = userDoc.data() as UserData | undefined;
  if (!userData) {
    redirect("/500");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden shadow-lg">
          {/* Use CardBody instead of CardContent */}
          <CardBody className="p-8">
            <UserProfileHeader
              avatarUrl={userData.avatarUrl}
              displayName={userData.displayName}
              role={userData.role}
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
