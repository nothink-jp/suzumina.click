import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

export default async function MyProfilePage() {
	const user = await getCurrentUser();

	if (!user) {
		// 未認証の場合はサインインページへ
		redirect("/auth/signin");
	}

	// 認証済みの場合は自分のプロフィールページへリダイレクト
	redirect(`/users/${user.discordId}`);
}
