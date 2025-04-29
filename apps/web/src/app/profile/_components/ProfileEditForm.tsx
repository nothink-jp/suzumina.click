"use client";

import { updateProfile } from "@/app/api/profile/updateProfile";
import type { UserProfile, UserProfileFormData } from "@/lib/users/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ProfileEditFormProps {
  profile: UserProfile;
}

export default function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProcessing = isPending || isSubmitting;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserProfileFormData>({
    siteDisplayName: profile.siteDisplayName || profile.displayName || "",
    bio: profile.bio || "",
    isPublic: profile.isPublic,
  });

  // フォーム入力値の更新
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // プロフィール更新処理
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setSuccess(result.message || "プロフィールを更新しました");
        // 画面を更新して変更を反映
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.message || "プロフィール更新に失敗しました");
      }
    } catch (err) {
      setError("プロフィール更新中にエラーが発生しました");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
        </div>
      )}

      <div className="form-control">
        <label className="label" htmlFor="siteDisplayName">
          <span className="label-text">表示名</span>
        </label>
        <input
          type="text"
          id="siteDisplayName"
          name="siteDisplayName"
          value={formData.siteDisplayName}
          onChange={handleChange}
          className="input input-bordered w-full"
          placeholder="表示名を入力"
          required
          maxLength={30}
        />
        <span className="label-text-alt">サイト内で表示される名前です</span>
      </div>

      <div className="form-control">
        <label className="label" htmlFor="bio">
          <span className="label-text">自己紹介</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          className="textarea textarea-bordered h-24"
          placeholder="自己紹介を入力（500文字以内）"
          maxLength={500}
        />
        <span className="label-text-alt">{formData.bio.length}/500文字</span>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
            className="checkbox"
          />
          <span className="label-text">プロフィールを公開する</span>
        </label>
        <span className="label-text-alt">
          オフにすると他のユーザーにプロフィールが表示されなくなります
        </span>
      </div>

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
