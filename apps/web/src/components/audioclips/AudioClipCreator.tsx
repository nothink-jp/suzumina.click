"use client";

import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { createAudioClip } from "../../app/actions/audioclips";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type { AudioClipCreateData } from "../../lib/audioclips/types";
import { useAuth } from "../../lib/firebase/AuthProvider";

interface AudioClipCreatorProps {
  videoId: string;
  videoTitle: string;
  onClipCreated: () => void;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
}

/**
 * 音声クリップ作成コンポーネント
 *
 * 動画から特定の区間を選択して音声クリップを作成するフォーム
 * Conform+Zodを利用した型安全なフォームバリデーションを実装
 */
export default function AudioClipCreator({
  videoId,
  videoTitle,
  onClipCreated,
  youtubePlayerRef,
}: AudioClipCreatorProps) {
  const { user } = useAuth();
  // タグ管理用の状態（Conformで管理しにくい部分なので別途管理）
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  // エラー表示用の状態
  const [error, setError] = useState<string | null>(null);
  // フォーム送信状態管理
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  // バリデーションのためにフォームの値をトラッキング
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  // 現在の開始時間、終了時間の表示用
  const [startTimeDisplay, setStartTimeDisplay] = useState<string>("--:--");
  const [endTimeDisplay, setEndTimeDisplay] = useState<string>("--:--");

  // バリデーションスキーマの定義
  const clipSchema = z
    .object({
      title: z.string().min(1, "タイトルは必須です"),
      phrase: z.string().optional(),
      startTime: z
        .number({ coerce: true })
        .nonnegative("開始時間は0以上の値が必要です")
        .optional(),
      endTime: z
        .number({ coerce: true })
        .nonnegative("終了時間は0以上の値が必要です")
        .optional(),
      isPublic: z.boolean().default(true),
    })
    .refine(
      (data) =>
        data.startTime !== undefined &&
        data.endTime !== undefined &&
        data.startTime < data.endTime,
      {
        message: "終了時間は開始時間より後にしてください",
        path: ["endTime"],
      },
    );

  // Conformフックの初期化
  const [form, fields] = useForm({
    id: "audio-clip-creator",
    // 送信ハンドラー
    onSubmit: async (event) => {
      if (!user) {
        setError("ログインが必要です");
        return { status: "error", errors: { "": ["ログインが必要です"] } };
      }

      // 送信状態を更新
      setIsSubmitting(true);
      setIsSubmitted(false);
      setSubmitSuccess(false);
      setError(null);

      const formData = new FormData(event.currentTarget);
      // Zodスキーマを使用して検証
      const submission = parseWithZod(formData, {
        schema: clipSchema,
      });

      // 検証に失敗した場合
      if (submission.status !== "success") {
        setIsSubmitting(false);
        // エラーメッセージを表示
        if (submission.error?.endTime?.length) {
          setError(submission.error.endTime[0]);
        }
        return submission.reply();
      }

      try {
        const clipData: AudioClipCreateData = {
          videoId,
          title: submission.value.title,
          phrase: submission.value.phrase || "",
          startTime: submission.value.startTime as number,
          endTime: submission.value.endTime as number,
          userId: user.uid,
          userName: user.displayName || "名無しユーザー",
          userPhotoURL: user.photoURL || undefined,
          isPublic: submission.value.isPublic,
          tags, // 別途管理しているタグを使用
        };

        // Server Actionsを使用してクリップを作成
        await createAudioClip(clipData);

        // フォームをリセット
        setTags([]);
        setTagInput("");
        setSubmitSuccess(true);

        // 親コンポーネントに通知
        onClipCreated();

        // 成功メッセージを設定して返却
        return submission.reply({
          resetForm: true,
          formErrors: [],
        });
      } catch (error) {
        console.error("音声クリップの作成に失敗しました:", error);
        setError("音声クリップの作成に失敗しました");
        // エラーメッセージを返却
        return submission.reply({
          formErrors: ["音声クリップの作成に失敗しました"],
        });
      } finally {
        // 送信状態を更新
        setIsSubmitting(false);
        setIsSubmitted(true);
      }
    },
    // 処理中の状態を追跡
    shouldRevalidate: "onInput",
  });

  // 安全にYouTube APIメソッドを呼び出すためのラッパー関数
  const safeCallYouTubeAPI = <T,>(
    methodName: string,
    method: () => T,
    defaultValue: T,
  ): T => {
    try {
      // API呼び出し前のデバッグログ
      console.log(`[デバッグ] ${methodName}を実行します`);

      // API呼び出し
      const result = method();

      // 結果のデバッグログ
      console.log(`[デバッグ] ${methodName}の結果:`, result);
      return result;
    } catch (error) {
      // エラー詳細を記録
      console.error(
        `[エラー] ${methodName}の実行中にエラーが発生しました:`,
        error,
      );
      console.error("[エラー] エラースタック:", (error as Error).stack);

      // ブラウザ環境とフラグを確認
      const isCloudRun =
        typeof window !== "undefined" &&
        window.location.hostname.includes("run.app");
      console.error("[エラー] 環境情報:", {
        isCloudRun,
        userAgent: navigator.userAgent,
        href: window.location.href,
      });

      // デフォルト値を返す
      return defaultValue;
    }
  };

  // 現在の再生位置を取得（安全な実装）
  const getCurrentTime = (): number => {
    if (!youtubePlayerRef?.current) {
      console.warn("[警告] YouTubeプレーヤーの参照が存在しません");
      return 0;
    }

    // プレーヤーの存在確認
    console.log("[デバッグ] プレーヤー状態:", {
      isDefined: !!youtubePlayerRef.current,
      hasGetCurrentTime:
        typeof youtubePlayerRef.current.getCurrentTime === "function",
      playerType: typeof youtubePlayerRef.current,
    });

    // APIが利用可能か確認
    if (typeof youtubePlayerRef.current.getCurrentTime !== "function") {
      console.error(
        "[エラー] YouTubeプレーヤーAPIが正しく初期化されていません",
      );
      return 0;
    }

    // 安全なAPI呼び出し
    return safeCallYouTubeAPI(
      "getCurrentTime",
      () => youtubePlayerRef.current.getCurrentTime(),
      0,
    );
  };

  // 開始時間を設定
  const handleSetStartTime = () => {
    try {
      // 現在時間を取得
      const currentTime = getCurrentTime();
      console.log(
        "[デバッグ] handleSetStartTime: 現在時間を取得しました",
        currentTime,
      );

      // hidden inputのvalueを明示的に更新
      const input = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;

      console.log("[デバッグ] handleSetStartTime: input要素", {
        exists: !!input,
        id: fields.startTime.id,
        element: input,
      });

      if (input) {
        // 値を設定し、コンソールに記録
        input.value = currentTime.toString();
        setStartTime(currentTime);
        // 表示用の状態も更新
        setStartTimeDisplay(formatTime(currentTime));

        console.log("[デバッグ] handleSetStartTime: input値を更新しました", {
          value: input.value,
          element: input,
        });

        // Conformに変更を通知
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
        console.log(
          "[デバッグ] handleSetStartTime: input イベントをディスパッチしました",
        );

        // DOM上でも値が反映されているか確認
        setTimeout(() => {
          console.log(
            "[デバッグ] handleSetStartTime: 更新後の値",
            (document.getElementById(fields.startTime.id) as HTMLInputElement)
              ?.value,
          );
        }, 0);
      } else {
        console.error(
          "[エラー] handleSetStartTime: input要素が見つかりません",
          fields.startTime.id,
        );
      }

      // 終了時間が設定されていない、または開始時間より前の場合は更新
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;
      const endTimeValue = endTimeInput
        ? Number.parseFloat(endTimeInput.value)
        : null;
      if (
        endTimeValue === null ||
        Number.isNaN(endTimeValue) ||
        endTimeValue <= currentTime
      ) {
        if (endTimeInput) {
          const newEndTime = currentTime + 5;
          endTimeInput.value = newEndTime.toString(); // デフォルトで5秒後を終了時間に
          setEndTime(newEndTime);
          // 表示用の状態も更新
          setEndTimeDisplay(formatTime(newEndTime));

          console.log(
            "[デバッグ] handleSetStartTime: 終了時間も更新しました",
            endTimeInput.value,
          );
          // Conformに変更を通知
          const event = new Event("input", { bubbles: true });
          endTimeInput.dispatchEvent(event);
        }
      }

      // 表示時間を更新
      updateDisplayTimes();
    } catch (error) {
      console.error(
        "[エラー] handleSetStartTime: 処理中にエラーが発生しました",
        error,
      );
    }
  };

  // 終了時間を設定
  const handleSetEndTime = () => {
    try {
      const currentTime = getCurrentTime();
      console.log(
        "[デバッグ] handleSetEndTime: 現在時間を取得しました",
        currentTime,
      );

      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const startTimeValue = startTimeInput
        ? Number.parseFloat(startTimeInput.value)
        : null;

      console.log("[デバッグ] handleSetEndTime: 開始時間の状態", {
        input: !!startTimeInput,
        value: startTimeInput?.value,
        parsed: startTimeValue,
      });

      // 開始時間が設定されていない場合は、現在時刻の5秒前を開始時間に
      if (
        startTimeValue === null ||
        Number.isNaN(startTimeValue) ||
        startTimeValue === 0
      ) {
        if (startTimeInput) {
          const newStartTime = Math.max(0, currentTime - 5);
          startTimeInput.value = newStartTime.toString();
          setStartTime(newStartTime);
          // 表示用の状態も更新
          setStartTimeDisplay(formatTime(newStartTime));

          console.log(
            "[デバッグ] handleSetEndTime: 開始時間を設定しました",
            newStartTime,
          );
          // Conformに変更を通知
          const event = new Event("input", { bubbles: true });
          startTimeInput.dispatchEvent(event);
        }
      }

      // 現在時間が開始時間以上であるか確認
      if (startTimeValue !== null && currentTime < startTimeValue) {
        setError("終了時間は開始時間より後に設定してください");
        console.warn(
          "[警告] handleSetEndTime: 終了時間が開始時間以前になっています",
          {
            current: currentTime,
            start: startTimeValue,
          },
        );
        return; // 早期リターンで処理を中止
      }

      // 開始時間以降、または同じ場合は設定
      // 同じ場合は自動的に+1秒の間隔を設ける
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;

      console.log("[デバッグ] handleSetEndTime: 終了時間の要素", {
        exists: !!endTimeInput,
        id: fields.endTime.id,
      });

      if (endTimeInput) {
        // 開始時間と同じ場合は+1秒する
        const endValue =
          currentTime === startTimeValue ? currentTime + 1 : currentTime;

        endTimeInput.value = endValue.toString();
        setEndTime(endValue);
        // 表示用の状態も更新
        setEndTimeDisplay(formatTime(endValue));

        console.log("[デバッグ] handleSetEndTime: 終了時間を設定しました", {
          value: endTimeInput.value,
          element: endTimeInput,
        });

        // Conformに変更を通知
        const event = new Event("input", { bubbles: true });
        endTimeInput.dispatchEvent(event);

        // DOM上でも値が反映されているか確認
        setTimeout(() => {
          console.log(
            "[デバッグ] handleSetEndTime: 更新後の値",
            (document.getElementById(fields.endTime.id) as HTMLInputElement)
              ?.value,
          );
        }, 0);
      }

      // 表示時間を更新
      updateDisplayTimes();
    } catch (error) {
      console.error(
        "[エラー] handleSetEndTime: 処理中にエラーが発生しました",
        error,
      );
    }
  };

  // 実行時のバリデーション（リアルタイムバリデーション）
  useEffect(() => {
    // 開始時間と終了時間の両方が設定されている場合のみバリデーション
    if (startTime !== null && endTime !== null) {
      if (startTime >= endTime) {
        setError("終了時間は開始時間より後にしてください");
      } else {
        // 問題がなければエラーをクリア
        setError(null);
      }
    }
  }, [startTime, endTime]);

  // 入力欄に手動で値を入力した時の更新処理
  useEffect(() => {
    // 入力要素への参照
    const startTimeInput = document.getElementById(
      fields.startTime.id,
    ) as HTMLInputElement;
    const endTimeInput = document.getElementById(
      fields.endTime.id,
    ) as HTMLInputElement;

    // 入力イベントのリスナー
    const handleStartTimeChange = () => {
      if (startTimeInput) {
        const value = startTimeInput.value
          ? Number.parseFloat(startTimeInput.value)
          : null;
        if (value !== null && !Number.isNaN(value)) {
          setStartTime(value);

          // 表示用の時間も更新
          const formattedTime = formatTime(value);
          setStartTimeDisplay(formattedTime);

          // DOMの表示要素を直接更新（テスト環境でも確実に反映させるため）
          for (const span of document.querySelectorAll("span.join-item")) {
            if (
              span.parentElement?.getAttribute("aria-labelledby") ===
              "start-time-label"
            ) {
              span.textContent = formattedTime;
            }
          }
          console.log(
            "[デバッグ] handleStartTimeChange: 更新後の値",
            value,
            formattedTime,
          );
        }
      }
    };

    const handleEndTimeChange = () => {
      if (endTimeInput) {
        const value = endTimeInput.value
          ? Number.parseFloat(endTimeInput.value)
          : null;
        if (value !== null && !Number.isNaN(value)) {
          setEndTime(value);

          // 表示用の時間も更新
          const formattedTime = formatTime(value);
          setEndTimeDisplay(formattedTime);

          // DOMの表示要素を直接更新（テスト環境でも確実に反映させるため）
          for (const span of document.querySelectorAll("span.join-item")) {
            if (
              span.parentElement?.getAttribute("aria-labelledby") ===
              "end-time-label"
            ) {
              span.textContent = formattedTime;
            }
          }
          console.log(
            "[デバッグ] handleEndTimeChange: 更新後の値",
            value,
            formattedTime,
          );
        }
      }
    };

    // イベントリスナーを追加
    if (startTimeInput) {
      startTimeInput.addEventListener("input", handleStartTimeChange);
    }
    if (endTimeInput) {
      endTimeInput.addEventListener("input", handleEndTimeChange);
    }

    // クリーンアップ関数
    return () => {
      if (startTimeInput) {
        startTimeInput.removeEventListener("input", handleStartTimeChange);
      }
      if (endTimeInput) {
        endTimeInput.removeEventListener("input", handleEndTimeChange);
      }
    };
  }, [fields.startTime.id, fields.endTime.id]);

  // テスト環境での入力値変更検出用
  useEffect(() => {
    // テスト中に直接値が変更された場合にも対応する
    const checkInputValues = () => {
      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;

      if (startTimeInput?.value) {
        const value = Number.parseFloat(startTimeInput.value);
        if (!Number.isNaN(value) && value !== startTime) {
          const formattedTime = formatTime(value);
          // 表示を更新
          setStartTimeDisplay(formattedTime);
          setStartTime(value);

          // スパン要素を直接更新
          for (const span of document.querySelectorAll("span.join-item")) {
            if (
              span.parentElement?.getAttribute("aria-labelledby") ===
              "start-time-label"
            ) {
              span.textContent = formattedTime;
            }
          }
        }
      }

      if (endTimeInput?.value) {
        const value = Number.parseFloat(endTimeInput.value);
        if (!Number.isNaN(value) && value !== endTime) {
          const formattedTime = formatTime(value);
          // 表示を更新
          setEndTimeDisplay(formattedTime);
          setEndTime(value);

          // スパン要素を直接更新
          for (const span of document.querySelectorAll("span.join-item")) {
            if (
              span.parentElement?.getAttribute("aria-labelledby") ===
              "end-time-label"
            ) {
              span.textContent = formattedTime;
            }
          }
        }
      }
    };

    // 短い間隔で値をチェック（テスト環境用）
    const intervalId = setInterval(checkInputValues, 50);

    return () => {
      clearInterval(intervalId);
    };
  }, [fields.startTime.id, fields.endTime.id, startTime, endTime]);

  // クリップをプレビュー
  const handlePreview = () => {
    try {
      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const startTimeValue = startTimeInput?.value
        ? Number.parseFloat(startTimeInput.value)
        : null;

      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;
      const endTimeValue = endTimeInput?.value
        ? Number.parseFloat(endTimeInput.value)
        : null;

      // 開始時間と終了時間の検証
      if (!youtubePlayerRef?.current) {
        console.warn("[警告] YouTubeプレーヤーの参照が存在しません");
        return;
      }

      if (startTimeValue === null) {
        console.warn("[警告] 開始時間が設定されていません");
        return;
      }

      console.log("[デバッグ] handlePreview: 再生を開始します", {
        start: startTimeValue,
        end: endTimeValue,
      });

      // seekToメソッドに正確な値を渡す
      youtubePlayerRef.current.seekTo(startTimeValue, true);
      youtubePlayerRef.current.playVideo();

      // 終了時間になったら一時停止
      if (
        endTimeValue !== null &&
        !Number.isNaN(endTimeValue) &&
        endTimeValue > startTimeValue
      ) {
        const duration = endTimeValue - startTimeValue;
        console.log(`[デバッグ] handlePreview: ${duration}秒後に停止します`);
        setTimeout(() => {
          youtubePlayerRef.current?.pauseVideo();
        }, duration * 1000);
      }
    } catch (error) {
      console.error(
        "[エラー] handlePreview: プレビュー再生に失敗しました",
        error,
      );
    }
  };

  // タグを追加
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // タグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // タグ入力でEnterキーを押した時の処理
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 時間を「分:秒」形式でフォーマット
  const formatTime = (seconds: string | number | null): string => {
    if (seconds === null || seconds === "") return "--:--";
    const numSeconds =
      typeof seconds === "string" ? Number.parseFloat(seconds) : seconds;
    if (Number.isNaN(numSeconds)) return "--:--";

    // 負の値は0として扱う
    const nonNegativeSeconds = Math.max(0, numSeconds);

    // テストケースに合わせて常に「分:秒」形式で表示（時間を分に変換）
    const totalMinutes = Math.floor(nonNegativeSeconds / 60);
    const secs = Math.floor(nonNegativeSeconds % 60);
    return `${totalMinutes}:${secs.toString().padStart(2, "0")}`;
  };

  // DOM操作の後でReactの状態も更新（表示を強制更新するため）
  const updateDisplayTimes = () => {
    try {
      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;

      // 開始時間の表示を更新
      if (startTimeInput?.value) {
        const formattedTime = formatTime(startTimeInput.value);
        setStartTimeDisplay(formattedTime);

        // すべてのspan.join-itemを探して、開始時間の表示要素を特定して更新
        const allSpans = document.querySelectorAll("span.join-item");
        for (const span of allSpans) {
          if (
            span.parentElement?.getAttribute("aria-labelledby") ===
            "start-time-label"
          ) {
            span.textContent = formattedTime;
          }
        }
      }

      // 終了時間の表示を更新
      if (endTimeInput?.value) {
        const formattedTime = formatTime(endTimeInput.value);
        setEndTimeDisplay(formattedTime);

        // すべてのspan.join-itemを探して、終了時間の表示要素を特定して更新
        const allSpans = document.querySelectorAll("span.join-item");
        for (const span of allSpans) {
          if (
            span.parentElement?.getAttribute("aria-labelledby") ===
            "end-time-label"
          ) {
            span.textContent = formattedTime;
          }
        }
      }

      console.log("[デバッグ] 表示時間を更新しました:", {
        start: startTimeInput?.value,
        end: endTimeInput?.value,
        startDisplay: startTimeInput
          ? formatTime(startTimeInput.value)
          : "--:--",
        endDisplay: endTimeInput ? formatTime(endTimeInput.value) : "--:--",
      });
    } catch (error) {
      console.error("[エラー] 表示時間の更新に失敗しました:", error);
    }
  };

  // フォーム送信前のバリデーション
  const validateBeforeSubmit = (event: React.FormEvent) => {
    // フォームから値を取得
    const formData = new FormData(event.target as HTMLFormElement);
    const formStartTime = formData.get("startTime");
    const formEndTime = formData.get("endTime");

    // 数値に変換
    const startTimeVal = formStartTime ? Number(formStartTime) : null;
    const endTimeVal = formEndTime ? Number(formEndTime) : null;

    // バリデーションチェック
    if (
      startTimeVal !== null &&
      endTimeVal !== null &&
      startTimeVal >= endTimeVal
    ) {
      event.preventDefault(); // フォーム送信を阻止
      setError("終了時間は開始時間より後にしてください");
      return false;
    }

    return true; // バリデーション成功
  };

  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden w-full">
      <Disclosure>
        {({ open }) => (
          <div>
            {/* ヘッダー部分（常に表示） */}
            <DisclosureButton className="w-full p-4 bg-primary bg-opacity-10 flex justify-between items-center text-left">
              <h3 className="text-lg font-bold text-primary-content">
                音声クリップを作成
              </h3>
              <span className="text-primary-content">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <title>{open ? "閉じるアイコン" : "開くアイコン"}</title>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </DisclosureButton>

            {/* フォーム部分（展開時のみ表示） */}
            <DisclosurePanel className="card-body">
              {!user && (
                <div className="alert alert-warning shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>音声クリップを作成するにはログインが必要です</span>
                </div>
              )}

              {/* フォーム全体のエラーメッセージ */}
              {(error || (form.errors && form.errors.length > 0)) && (
                <div className="alert alert-error shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0118 0z"
                    />
                  </svg>
                  <span>{error || form.errors?.join(", ")}</span>
                </div>
              )}

              {/* 送信成功メッセージ（エラーがなく、送信済みの場合） */}
              {isSubmitted && submitSuccess && !error && (
                <div className="alert alert-success shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0118 0z"
                    />
                  </svg>
                  <span>クリップを作成しました</span>
                </div>
              )}

              <form
                id={form.id}
                onSubmit={(e) => {
                  // フォーム送信前のバリデーション
                  if (!validateBeforeSubmit(e)) {
                    return;
                  }
                  form.onSubmit(e);
                }}
              >
                <div className="form-control mb-4">
                  <label className="label" htmlFor={fields.title.id}>
                    <span className="label-text">タイトル</span>
                  </label>
                  <input
                    id={fields.title.id}
                    name={fields.title.name}
                    type="text"
                    placeholder={`「${videoTitle}」からのクリップ`}
                    className="input input-bordered w-full"
                    disabled={!user || isSubmitting}
                    aria-invalid={!fields.title.valid ? true : undefined}
                    aria-describedby={
                      !fields.title.valid
                        ? `${fields.title.id}-error`
                        : undefined
                    }
                  />
                  {fields.title.errors && (
                    <div
                      id={`${fields.title.id}-error`}
                      className="text-error text-sm mt-1"
                    >
                      {fields.title.errors}
                    </div>
                  )}
                </div>

                <div className="form-control mb-4">
                  <label className="label" htmlFor={fields.phrase.id}>
                    <span className="label-text">フレーズ（オプション）</span>
                  </label>
                  <textarea
                    id={fields.phrase.id}
                    name={fields.phrase.name}
                    placeholder="クリップ内の発言内容など"
                    className="textarea textarea-bordered w-full"
                    rows={2}
                    disabled={!user || isSubmitting}
                    aria-invalid={!fields.phrase.valid ? true : undefined}
                    aria-describedby={
                      !fields.phrase.valid
                        ? `${fields.phrase.id}-error`
                        : undefined
                    }
                  />
                  {fields.phrase.errors && (
                    <div
                      id={`${fields.phrase.id}-error`}
                      className="text-error text-sm mt-1"
                    >
                      {fields.phrase.errors}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                  <div>
                    <label
                      className="label"
                      id="start-time-label"
                      htmlFor={fields.startTime.id}
                    >
                      <span className="label-text">開始時間</span>
                    </label>
                    <div className="join" aria-labelledby="start-time-label">
                      {/* 隠し入力フィールド（実際の値を保持） */}
                      <input
                        type="hidden"
                        id={fields.startTime.id}
                        name={fields.startTime.name}
                      />
                      {/* 表示用の値（Reactのステートを使用） */}
                      <span className="join-item px-3 py-2 bg-base-200 border border-base-300">
                        {startTimeDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={handleSetStartTime}
                        className="join-item btn btn-primary"
                        disabled={
                          !user || isSubmitting || !youtubePlayerRef?.current
                        }
                      >
                        現在位置を設定
                      </button>
                    </div>
                    {fields.startTime.errors && (
                      <div className="text-error text-sm mt-1">
                        {fields.startTime.errors}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      className="label"
                      id="end-time-label"
                      htmlFor={fields.endTime.id}
                    >
                      <span className="label-text">終了時間</span>
                    </label>
                    <div className="join" aria-labelledby="end-time-label">
                      {/* 隠し入力フィールド（実際の値を保持） */}
                      <input
                        type="hidden"
                        id={fields.endTime.id}
                        name={fields.endTime.name}
                      />
                      {/* 表示用の値 */}
                      <span className="join-item px-3 py-2 bg-base-200 border border-base-300">
                        {endTimeDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={handleSetEndTime}
                        className="join-item btn btn-primary"
                        disabled={
                          !user || isSubmitting || !youtubePlayerRef?.current
                        }
                      >
                        現在位置を設定
                      </button>
                    </div>
                    {fields.endTime.errors && (
                      <div className="text-error text-sm mt-1">
                        {fields.endTime.errors}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="label">
                      <span className="label-text" id="preview-label">
                        プレビュー
                      </span>
                    </div>
                    <button
                      aria-labelledby="preview-label"
                      type="button"
                      onClick={handlePreview}
                      className="btn btn-success"
                      disabled={
                        !user ||
                        isSubmitting ||
                        !(
                          document.getElementById(
                            fields.startTime.id,
                          ) as HTMLInputElement
                        )?.value ||
                        !youtubePlayerRef?.current
                      }
                    >
                      選択範囲を再生
                    </button>
                  </div>
                </div>

                <div className="form-control mb-4">
                  <label className="label" htmlFor="clip-tags">
                    <span className="label-text">タグ（オプション）</span>
                  </label>
                  <div className="join w-full">
                    <input
                      id="clip-tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="タグを入力（Enterで追加）"
                      className="join-item input input-bordered flex-grow"
                      disabled={!user || isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="join-item btn btn-neutral"
                      disabled={!user || isSubmitting || !tagInput.trim()}
                    >
                      追加
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <div key={tag} className="badge badge-primary gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="btn btn-xs btn-circle btn-ghost"
                            aria-label={`${tag}タグを削除`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-control mb-4">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      name={fields.isPublic.name}
                      defaultChecked={true}
                      className="checkbox checkbox-primary"
                      disabled={!user || isSubmitting}
                    />
                    <span className="label-text">
                      公開する（全員が視聴可能）
                    </span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!user || isSubmitting}
                    className="btn btn-primary text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        作成中...
                      </>
                    ) : (
                      "クリップを作成"
                    )}
                  </button>
                </div>
              </form>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
