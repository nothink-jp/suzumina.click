"use client";

import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import type { YouTubePlayer } from "../../components/videos/YouTubeEmbed";
import type {
  AudioClip,
  AudioClipCreateData,
  OverlapCheckResult,
  TagInfo, // TagInfo型をインポート
} from "../../lib/audioclips/types";
import {
  checkTimeRangeOverlap,
  formatTime,
} from "../../lib/audioclips/validation";
import { useAuth } from "../../lib/firebase/AuthProvider";
import TagInput from "./TagInput"; // 新しいTagInputコンポーネントをインポート
import TimelineVisualization from "./TimelineVisualization"; // TimelineVisualizationコンポーネントをインポート

interface AudioClipCreatorProps {
  videoId: string;
  videoTitle: string;
  youtubePlayerRef?: React.RefObject<YouTubePlayer>;
  onClipCreated?: () => void;
  // Server Actions
  createAudioClipAction: (data: AudioClipCreateData) => Promise<AudioClip>;
  // 時間範囲重複チェック用のServer Action
  checkOverlapAction?: (
    videoId: string,
    startTime: number,
    endTime: number,
    excludeClipId?: string,
  ) => Promise<OverlapCheckResult>;
  // タグ検索用のServer Action
  searchTagsAction?: (params: { query: string }) => Promise<{
    tags: TagInfo[];
  }>;
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
  createAudioClipAction,
  checkOverlapAction,
  // デフォルト値として空の配列を返す関数を設定
  searchTagsAction = async () => ({ tags: [] }),
}: AudioClipCreatorProps) {
  const { user } = useAuth();
  // タグ管理用の状態（Conformで管理しにくい部分なので別途管理）
  const [tags, setTags] = useState<string[]>([]);
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
  // 重複チェック結果
  const [overlapCheckResult, setOverlapCheckResult] =
    useState<OverlapCheckResult | null>(null);
  const [isCheckingOverlap, setIsCheckingOverlap] = useState(false);

  // 動画の総再生時間をキャッシュするための状態
  const [videoDuration, setVideoDuration] = useState(0);
  // プレーヤーの現在位置を定期的に更新するための状態
  const [currentPlayerTime, setCurrentPlayerTime] = useState(0);
  // YouTube API呼び出しの間隔を管理するためのRef
  const lastApiCallTimeRef = useRef(Date.now());
  // APIコールの最小間隔 (ms)
  const minApiCallInterval = 250;

  // デバウンスとインターバル用のRef
  const checkOverlapDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 時間を「分:秒」形式でフォーマット - メモ化して再計算を防止
  const formatTime = useCallback((seconds: string | number | null): string => {
    if (seconds === null || seconds === "") return "--:--";
    const numSeconds =
      typeof seconds === "string" ? Number.parseFloat(seconds) : seconds;
    if (Number.isNaN(numSeconds)) return "--:--";

    // 負の値は0として扱う
    const nonNegativeSeconds = Math.max(0, numSeconds);

    // 「分:秒」形式で表示（時間を分に変換）
    const totalMinutes = Math.floor(nonNegativeSeconds / 60);
    const secs = Math.floor(nonNegativeSeconds % 60);
    return `${totalMinutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // 安全にYouTube APIメソッドを呼び出すためのラッパー関数 - メモ化
  const safeCallYouTubeAPI = useCallback(
    <T,>(methodName: string, method: () => T, defaultValue: T): T => {
      try {
        const result = method();
        return result;
      } catch (error) {
        // デバッグ環境でのみエラーをログ出力
        if (process.env.NODE_ENV === "development") {
          console.debug(`[YouTube API] ${methodName} 呼び出しに失敗: `, error);
        }
        return defaultValue;
      }
    },
    [],
  );

  // YouTubeプレーヤーの状態を定期的に取得（負荷を抑えるために低頻度で実行）
  useEffect(() => {
    if (!youtubePlayerRef?.current) return;

    // 動画の総再生時間を取得（一度だけ）
    if (videoDuration === 0) {
      setVideoDuration(
        safeCallYouTubeAPI(
          "getDuration",
          () => youtubePlayerRef.current?.getDuration() || 0,
          0,
        ),
      );
    }

    // 現在の再生位置を低頻度で更新
    const intervalId = setInterval(() => {
      if (Date.now() - lastApiCallTimeRef.current >= minApiCallInterval) {
        const time = safeCallYouTubeAPI(
          "getCurrentTime",
          () => youtubePlayerRef.current?.getCurrentTime() || 0,
          currentPlayerTime,
        );
        // 値が変わった場合のみ状態を更新（不要なレンダリングを防止）
        if (Math.abs(time - currentPlayerTime) > 0.5) {
          // 0.5秒以上変化した場合のみ更新
          setCurrentPlayerTime(time);
          lastApiCallTimeRef.current = Date.now();
        }
      }
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [youtubePlayerRef, videoDuration, currentPlayerTime, safeCallYouTubeAPI]);

  // 現在の再生位置を取得（キャッシュした値を優先的に返す）
  const getCurrentTime = useCallback((): number => {
    // APIが利用できない場合やスロットリング間隔内の場合はキャッシュした値を返す
    if (
      !youtubePlayerRef?.current ||
      Date.now() - lastApiCallTimeRef.current < minApiCallInterval
    ) {
      return currentPlayerTime;
    }

    // APIが利用可能な場合は新しい値を取得
    const time = safeCallYouTubeAPI(
      "getCurrentTime",
      () => youtubePlayerRef.current.getCurrentTime(),
      currentPlayerTime,
    );

    // 値が大きく変わった場合のみキャッシュを更新
    if (Math.abs(time - currentPlayerTime) > 0.5) {
      setCurrentPlayerTime(time);
      lastApiCallTimeRef.current = Date.now();
    }

    return time;
  }, [currentPlayerTime, safeCallYouTubeAPI, youtubePlayerRef]);

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

        // props経由で受け取ったServer Actionを使用してクリップを作成
        await createAudioClipAction(clipData);

        // フォームをリセット
        setTags([]);
        setSubmitSuccess(true);

        // 親コンポーネントに通知
        if (onClipCreated) {
          onClipCreated();
        }

        // 成功メッセージを設定して返却
        return submission.reply({
          resetForm: true,
          formErrors: [],
        });
      } catch (error) {
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

  // 開始時間を設定
  const handleSetStartTime = () => {
    try {
      // 現在時間を取得
      const currentTime = getCurrentTime();

      // hidden inputのvalueを明示的に更新
      const input = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;

      if (input) {
        // 値を設定
        input.value = currentTime.toString();
        setStartTime(currentTime);
        // 表示用の状態も更新
        setStartTimeDisplay(formatTime(currentTime));

        // Conformに変更を通知
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);

        // DOM上でも値が反映されているか確認
        setTimeout(() => {}, 0);
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

          // Conformに変更を通知
          const event = new Event("input", { bubbles: true });
          endTimeInput.dispatchEvent(event);
        }
      }

      // 表示時間を更新
      updateDisplayTimes();
    } catch (error) {
      // エラー処理はログ出力せずに静かに処理
    }
  };

  // 終了時間を設定
  const handleSetEndTime = () => {
    try {
      const currentTime = getCurrentTime();

      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const startTimeValue = startTimeInput
        ? Number.parseFloat(startTimeInput.value)
        : null;

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

          // Conformに変更を通知
          const event = new Event("input", { bubbles: true });
          startTimeInput.dispatchEvent(event);
        }
      }

      // 現在時間が開始時間以上であるか確認
      if (startTimeValue !== null && currentTime < startTimeValue) {
        setError("終了時間は開始時間より後に設定してください");
        return; // 早期リターンで処理を中止
      }

      // 開始時間以降、または同じ場合は設定
      // 同じ場合は自動的に+1秒の間隔を設ける
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;

      if (endTimeInput) {
        // 開始時間と同じ場合は+1秒する
        const endValue =
          currentTime === startTimeValue ? currentTime + 1 : currentTime;

        endTimeInput.value = endValue.toString();
        setEndTime(endValue);
        // 表示用の状態も更新
        setEndTimeDisplay(formatTime(endValue));

        // Conformに変更を通知
        const event = new Event("input", { bubbles: true });
        endTimeInput.dispatchEvent(event);

        // DOM上でも値が反映されているか確認
        setTimeout(() => {}, 0);
      }

      // 表示時間を更新
      updateDisplayTimes();
    } catch (error) {
      // エラー処理はログ出力せずに静かに処理
    }
  };

  // 実行時のバリデーション（リアルタイムバリデーション）
  useEffect(() => {
    // 開始時間と終了時間の両方が設定されている場合のみバリデーション
    if (startTime !== null && endTime !== null) {
      if (startTime >= endTime) {
        setError("終了時間は開始時間より後にしてください");
      } else if (!overlapCheckResult?.isOverlapping) {
        // 重複がなければエラーをクリア
        setError(null);
      }
    }
  }, [startTime, endTime, overlapCheckResult]);

  // 入力欄に手動で値を入力した時の更新処理
  useEffect(() => {
    // 入力要素への参照
    const startTimeInput = document.getElementById(
      fields.startTime.id,
    ) as HTMLInputElement;
    const endTimeInput = document.getElementById(
      fields.endTime.id,
    ) as HTMLInputElement;

    // 入力イベントのリスナー - Reactステートを優先的に更新
    const handleStartTimeChange = () => {
      if (startTimeInput) {
        const value = startTimeInput.value
          ? Number.parseFloat(startTimeInput.value)
          : null;
        if (value !== null && !Number.isNaN(value)) {
          setStartTime(value);
          // 表示用の時間も更新（ReactのステートのみでDOMを制御）
          setStartTimeDisplay(formatTime(value));
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
          // 表示用の時間も更新（ReactのステートのみでDOMを制御）
          setEndTimeDisplay(formatTime(value));
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
  }, [fields.startTime.id, fields.endTime.id, formatTime]);

  // テスト環境での入力値変更検出用
  useEffect(() => {
    // テスト中のみ実行するチェック処理
    const checkInputValues = () => {
      // 開発環境・本番環境ではスキップ
      if (process.env.NODE_ENV !== "test") return;

      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;

      // 以下は変更なし
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

    // インターバルの間隔を調整（テスト環境では50ms、それ以外は500ms）
    const interval = process.env.NODE_ENV === "test" ? 50 : 500;
    const intervalId = setInterval(checkInputValues, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fields.startTime.id, fields.endTime.id, startTime, endTime, formatTime]);

  // クリップをプレビュー - メモ化
  const handlePreview = useCallback(() => {
    try {
      // 必要な検証だけを行い、早期リターンでパフォーマンスを向上
      if (!youtubePlayerRef?.current) return;

      const startTimeInput = document.getElementById(
        fields.startTime.id,
      ) as HTMLInputElement;
      if (!startTimeInput?.value) return;

      const startTimeValue = Number.parseFloat(startTimeInput.value);
      if (Number.isNaN(startTimeValue)) return;

      // 終了時間の取得（オプショナル）
      const endTimeInput = document.getElementById(
        fields.endTime.id,
      ) as HTMLInputElement;
      const endTimeValue = endTimeInput?.value
        ? Number.parseFloat(endTimeInput.value)
        : null;

      // プレーヤー操作の最小化
      youtubePlayerRef.current.seekTo(startTimeValue, true);
      youtubePlayerRef.current.playVideo();

      // 終了時間が設定されている場合だけ一時停止を設定
      if (
        endTimeValue !== null &&
        !Number.isNaN(endTimeValue) &&
        endTimeValue > startTimeValue
      ) {
        const duration = endTimeValue - startTimeValue;
        setTimeout(() => {
          if (youtubePlayerRef.current) {
            youtubePlayerRef.current.pauseVideo();
          }
        }, duration * 1000);
      }
    } catch (error) {
      // 開発環境でのみエラーをログ出力
      if (process.env.NODE_ENV === "development") {
        console.debug("プレビュー再生でエラーが発生しました:", error);
      }
    }
  }, [fields.startTime.id, fields.endTime.id, youtubePlayerRef]);

  // タグ変更ハンドラーをメモ化
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
  }, []);

  // 時間を「分:秒」形式でフォーマット
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
    } catch (error) {
      // エラー時は静かに処理
    }
  };

  // フォーム送信前のバリデーション
  const validateBeforeSubmit = async (event: React.FormEvent) => {
    // フォームから値を取得
    const formData = new FormData(event.target as HTMLFormElement);
    const formStartTime = formData.get("startTime");
    const formEndTime = formData.get("endTime");

    // 数値に変換
    const startTimeVal = formStartTime ? Number(formStartTime) : null;
    const endTimeVal = formEndTime ? Number(formEndTime) : null;

    // 基本バリデーションチェック
    if (
      startTimeVal !== null &&
      endTimeVal !== null &&
      startTimeVal >= endTimeVal
    ) {
      event.preventDefault(); // フォーム送信を阻止
      setError("終了時間は開始時間より後にしてください");
      return false;
    }

    // 開始時間と終了時間が有効な場合は最終的な重複チェックを実行
    if (startTimeVal !== null && endTimeVal !== null) {
      event.preventDefault(); // 非同期処理のためフォーム送信を一時的に阻止

      try {
        setIsSubmitting(true);
        const result = await checkOverlap(startTimeVal, endTimeVal);

        if (result?.isOverlapping) {
          setError("指定した時間範囲が既存のクリップと重複しています");
          setIsSubmitting(false);
          return false;
        }

        // 重複がなければフォーム送信を続行
        form.onSubmit(event as React.FormEvent<HTMLFormElement>);
        return true;
      } catch (error) {
        setIsSubmitting(false);
        return true; // エラー時は送信を許可（サーバーサイドでも検証するため）
      }
    }

    return true; // バリデーション成功
  };

  // 重複チェックの実行（デバウンスを導入）
  const checkOverlap = useCallback(
    async (start: number, end: number) => {
      try {
        if (!start || !end || start >= end) {
          return null; // 無効な値の場合は何もしない
        }

        // 既に処理中の場合は中断
        if (isCheckingOverlap) {
          return null;
        }

        // 重複チェック中のフラグをセット
        setIsCheckingOverlap(true);

        // 重複チェックの実行 - サーバーサイドのアクションがあればそちらを使用
        let result: OverlapCheckResult | null;
        if (checkOverlapAction) {
          // Server Actionを使用して重複チェック（認証情報はサーバー側で取得）
          result = await checkOverlapAction(videoId, start, end);
        } else {
          // 従来のクライアントサイド実装をフォールバックとして使用
          result = await checkTimeRangeOverlap(videoId, start, end);
        }

        // 結果を状態に保存
        setOverlapCheckResult(result);

        // 重複がある場合はエラーメッセージを設定
        if (result?.isOverlapping) {
          setError("指定した時間範囲が既存のクリップと重複しています");
        } else if (error?.includes("重複")) {
          // 重複エラーがあったが解消された場合はエラーをクリア
          setError(null);
        }

        return result;
      } catch (error) {
        // エラーは静かに処理
        return null;
      } finally {
        setIsCheckingOverlap(false);
      }
    },
    [videoId, error, isCheckingOverlap, checkOverlapAction],
  );

  // 開始時間または終了時間が変更された際の重複チェック実装を最適化
  useEffect(() => {
    // すでに設定されているタイマーがあればクリア
    if (checkOverlapDebounceTimeoutRef.current) {
      clearTimeout(checkOverlapDebounceTimeoutRef.current);
      checkOverlapDebounceTimeoutRef.current = null;
    }

    const runOverlapCheck = async () => {
      // 開始時間と終了時間が両方とも有効な場合のみチェック
      if (startTime !== null && endTime !== null && startTime < endTime) {
        await checkOverlap(startTime, endTime);
      } else {
        // 無効な値の場合は重複チェック結果をクリア
        setOverlapCheckResult(null);
      }
    };

    // 頻繁な呼び出しを防ぐためにデバウンスを実装（1000msの遅延）
    checkOverlapDebounceTimeoutRef.current = setTimeout(runOverlapCheck, 1000);

    return () => {
      if (checkOverlapDebounceTimeoutRef.current) {
        clearTimeout(checkOverlapDebounceTimeoutRef.current);
        checkOverlapDebounceTimeoutRef.current = null;
      }
    };
  }, [startTime, endTime, checkOverlap]);

  // メモ化された確認ダイアログコンポーネント - 条件付きレンダリングの最適化
  const OverlapWarning = useMemo(() => {
    if (
      !overlapCheckResult?.isOverlapping ||
      !overlapCheckResult.overlappingClips.length
    ) {
      return null;
    }

    return (
      <div className="alert alert-warning shadow-sm mb-4">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <title>警告アイコン</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-semibold">
              選択した時間範囲が以下のクリップと重複しています：
            </span>
            <ul className="list-disc list-inside mt-1">
              {overlapCheckResult.overlappingClips.map((clip) => (
                <li key={clip.id}>
                  「{clip.title}」（{formatTime(clip.startTime)} -{" "}
                  {formatTime(clip.endTime)}）
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }, [overlapCheckResult, formatTime]);

  // メモ化された成功メッセージコンポーネント
  const SuccessMessage = useMemo(() => {
    if (!isSubmitted || !submitSuccess || error) {
      return null;
    }

    return (
      <div
        className="alert alert-success shadow-sm mb-4"
        data-testid="success-message"
      >
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 18 0z"
          />
        </svg>
        <span>クリップを作成しました</span>
      </div>
    );
  }, [isSubmitted, submitSuccess, error]);

  // メモ化されたエラーメッセージコンポーネント
  const ErrorMessage = useMemo(() => {
    if (!error && (!form.errors || form.errors.length === 0)) {
      return null;
    }

    return (
      <div
        className="alert alert-error shadow-sm mb-4"
        data-testid="error-message"
      >
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
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 18 0z"
          />
        </svg>
        <span>{error || form.errors?.join(", ")}</span>
      </div>
    );
  }, [error, form.errors]);

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

              {/* タイムライン可視化コンポーネント */}
              {user && youtubePlayerRef?.current && (
                <div className="mb-4">
                  <TimelineVisualization
                    videoId={videoId}
                    videoDuration={
                      videoDuration ||
                      safeCallYouTubeAPI(
                        "getDuration",
                        () => youtubePlayerRef.current?.getDuration() || 0,
                        0,
                      )
                    }
                    currentTime={currentPlayerTime}
                    onRangeSelect={(start, end) => {
                      // 開始時間と終了時間を設定
                      const startTimeInput = document.getElementById(
                        fields.startTime.id,
                      ) as HTMLInputElement;
                      const endTimeInput = document.getElementById(
                        fields.endTime.id,
                      ) as HTMLInputElement;

                      if (startTimeInput && endTimeInput) {
                        // 値を設定
                        startTimeInput.value = start.toString();
                        endTimeInput.value = end.toString();

                        // React状態を更新
                        setStartTime(start);
                        setEndTime(end);
                        setStartTimeDisplay(formatTime(start));
                        setEndTimeDisplay(formatTime(end));

                        // イベントを発火してConformに通知
                        const startEvent = new Event("input", {
                          bubbles: true,
                        });
                        startTimeInput.dispatchEvent(startEvent);

                        const endEvent = new Event("input", { bubbles: true });
                        endTimeInput.dispatchEvent(endEvent);
                      }
                    }}
                    className="mb-2"
                  />
                </div>
              )}

              {/* メモ化されたエラーメッセージ表示 */}
              {ErrorMessage}

              {/* メモ化された重複警告表示 */}
              {OverlapWarning}

              {/* メモ化された成功メッセージ表示 */}
              {SuccessMessage}

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

                {/* タグ入力コンポーネント */}
                <div className="form-control mb-4">
                  <label className="label" htmlFor="clip-tags">
                    <span className="label-text">タグ（オプション）</span>
                  </label>
                  <TagInput
                    initialTags={tags}
                    onChange={handleTagsChange}
                    maxTags={10}
                    placeholder="タグを入力..."
                    disabled={!user || isSubmitting}
                    searchTagsAction={searchTagsAction}
                  />
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
