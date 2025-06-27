import { ContactFormDataSchema } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/firestore";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// バリデーション
		const validatedData = ContactFormDataSchema.parse(body);

		// IPアドレス取得（スパム対策用）
		const forwardedFor = request.headers.get("x-forwarded-for");
		const clientIp = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

		// Firestoreに保存するデータ
		const contactData = {
			...validatedData,
			// 空文字の場合はundefinedに変換
			email: validatedData.email || undefined,
			ipAddress: clientIp,
			userAgent: request.headers.get("user-agent") || "unknown",
			createdAt: new Date().toISOString(),
			status: "new" as const, // new, reviewing, resolved
		};

		// Firestoreに保存
		const firestoreDb = getFirestore();
		const contactRef = await firestoreDb.collection("contacts").add(contactData);

		return NextResponse.json(
			{
				success: true,
				message: "お問い合わせを受け付けました",
				id: contactRef.id,
			},
			{ status: 200 },
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					message: "入力内容に不備があります",
					errors: error.errors,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "お問い合わせの送信に失敗しました",
			},
			{ status: 500 },
		);
	}
}
