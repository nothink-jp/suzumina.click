"use client";

// インポートパスを更新
import { updateProfile } from "@/actions/profile/profileActions";
import type { UserProfile } from "@/lib/users/types";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";

interface ProfileEditFormProps {
  profile: UserProfile;
}

/**
 * プロフィール編集フォームコンポーネント
 *
 * ユーザーのプロフィール情報を編集するためのフォーム
 * Conform+Zodを利用した型安全なフォームバリデーションを実装
 */
export default function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 送信状態を管理するための独自state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 文字数カウント用のstate
  const [bioLength, setBioLength] = useState(profile.bio?.length || 0);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  // バリデーションスキーマの定義
  const profileSchema = z.object({
    siteDisplayName: z
      .string()
      .min(1, "表示名は必須です")
      .max(30, "表示名は30文字以内で入力してください"),
    bio: z.string().max(500, "自己紹介は500文字以内で入力してください"),
    isPublic: z.boolean(),
  });

  // 初期値の設定
  const initialValues = {
    siteDisplayName: profile.siteDisplayName || profile.displayName || "",
    bio: profile.bio || "",
    isPublic: profile.isPublic,
  };

  // テキストエリアの内容変更を監視
  useEffect(() => {
    const textArea = bioRef.current;
    if (!textArea) return;

    const handleInput = () => {
      setBioLength(textArea.value.length);
    };

    textArea.addEventListener("input", handleInput);
    return () => {
      textArea.removeEventListener("input", handleInput);
    };
  }, []);

  // Conformフックの初期化
  const [form, fields] = useForm({
    id: "profile-edit",
    // 送信ハンドラ
    onSubmit: async (event) => {
      // 送信開始状態をセット
      setIsSubmitting(true);
      setIsSubmitted(false);
      setSubmitSuccess(false);

      // フォームデータを取得
      const formData = new FormData(event.currentTarget);
      // Zodスキーマを使用して検証
      const submission = parseWithZod(formData, {
        schema: profileSchema,
      });

      // 検証に失敗した場合
      if (submission.status !== "success") {
        setIsSubmitting(false);
        return submission.reply();
      }

      try {
        // プロフィール更新APIを呼び出し
        const result = await updateProfile(submission.value);

        if (result.success) {
          // 成功状態をセット
          setSubmitSuccess(true);
          // 画面を更新して変更を反映
          startTransition(() => {
            router.refresh();
          });

          // 成功メッセージを設定して返却
          return submission.reply({
            resetForm: false,
            formErrors: [],
          });
        }
        // APIからのエラーメッセージを返却
        return submission.reply({
          formErrors: [result.message || "プロフィール更新に失敗しました"],
        });
      } catch (err) {
        console.error("プロフィール更新中にエラーが発生しました:", err);
        // エラーメッセージを返却
        return submission.reply({
          formErrors: ["プロフィール更新中にエラーが発生しました"],
        });
      } finally {
        // 送信状態を更新
        setIsSubmitting(false);
        setIsSubmitted(true);
      }
    },
    // 初期値を設定
    defaultValue: initialValues,
    // 処理中の状態を追跡
    shouldRevalidate: "onInput",
  });

  // 送信中の状態を判定
  const isProcessing = isPending || isSubmitting;

  return (
    <form id={form.id} onSubmit={form.onSubmit} className="space-y-4">
      {/* フォーム全体のエラーメッセージ */}
      {(form.errors ?? []).length > 0 && (
        <div className="alert alert-error">
          <ul>
            {(form.errors ?? []).map((error) => (
              <li key={`form-error-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 送信成功メッセージ（エラーがなく、送信済みの場合） */}
      {isSubmitted && submitSuccess && (
        <div className="alert alert-success">
          <span>プロフィールを更新しました</span>
        </div>
      )}

      {/* 表示名入力フィールド */}
      <div className="form-control">
        <label className="label" htmlFor={fields.siteDisplayName.id}>
          <span className="label-text">表示名</span>
        </label>
        <input
          type="text"
          id={fields.siteDisplayName.id}
          name={fields.siteDisplayName.name}
          defaultValue={fields.siteDisplayName.initialValue}
          className="input input-bordered w-full"
          placeholder="表示名を入力"
          required
          maxLength={30}
          aria-invalid={!fields.siteDisplayName.valid ? true : undefined}
          aria-describedby={
            !fields.siteDisplayName.valid
              ? `${fields.siteDisplayName.id}-error`
              : undefined
          }
        />
        <span className="label-text-alt">サイト内で表示される名前です</span>
        {fields.siteDisplayName.errors && (
          <div
            id={`${fields.siteDisplayName.id}-error`}
            className="text-error text-sm mt-1"
          >
            {fields.siteDisplayName.errors}
          </div>
        )}
      </div>

      {/* 自己紹介入力フィールド */}
      <div className="form-control">
        <label className="label" htmlFor={fields.bio.id}>
          <span className="label-text">自己紹介</span>
        </label>
        <textarea
          ref={bioRef}
          id={fields.bio.id}
          name={fields.bio.name}
          defaultValue={fields.bio.initialValue}
          className="textarea textarea-bordered h-24"
          placeholder="自己紹介を入力（500文字以内）"
          maxLength={500}
          aria-invalid={!fields.bio.valid ? true : undefined}
          aria-describedby={
            !fields.bio.valid ? `${fields.bio.id}-error` : undefined
          }
        />
        {/* バイオの文字数を表示 - useRefとuseStateを使用 */}
        <span className="label-text-alt">{bioLength}/500文字</span>
        {fields.bio.errors && (
          <div
            id={`${fields.bio.id}-error`}
            className="text-error text-sm mt-1"
          >
            {fields.bio.errors}
          </div>
        )}
      </div>

      {/* プロフィール公開設定 */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            name={fields.isPublic.name}
            defaultChecked={
              typeof fields.isPublic.initialValue === "string"
                ? fields.isPublic.initialValue === "true"
                : !!fields.isPublic.initialValue
            }
            className="checkbox"
          />
          <span className="label-text">プロフィールを公開する</span>
        </label>
        <span className="label-text-alt">
          オフにすると他のユーザーにプロフィールが表示されなくなります
        </span>
      </div>

      {/* 送信ボタン */}
      <div className="form-control mt-6">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              更新中...
            </>
          ) : (
            "プロフィールを更新"
          )}
        </button>
      </div>
    </form>
  );
}
