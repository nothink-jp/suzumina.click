import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function MyProfilePage() {
	const session = await auth();

	if (!session?.user) {
		// 未認証の場合はサインインページへ
		redirect("/auth/signin");
	}

	// 認証済みの場合は自分のプロフィールページへリダイレクト
	redirect(`/users/${session.user.discordId}`);
}
