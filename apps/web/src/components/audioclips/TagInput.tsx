"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { normalizeTag, searchTags, validateTag } from "@/lib/audioclips/tags";
import type { TagInfo, TagInputState } from "@/lib/audioclips/types";
import { Loader2, Tag, X } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface TagInputProps {
  initialTags?: string[] | TagInfo[];
  maxTags?: number;
  onChange?: (tags: string[]) => void;
  onBlur?: (tags: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * タグ入力コンポーネント
 *
 * ユーザーがタグを入力・追加・削除できるコンポーネントです。
 * タグの入力候補を表示する機能も含まれます。
 */
export default function TagInput({
  initialTags = [],
  maxTags = 10,
  onChange,
  onBlur,
  className = "",
  placeholder = "タグを入力...",
  disabled = false,
  readOnly = false,
}: TagInputProps) {
  // 初期タグを正規化
  const normalizedInitialTags = initialTags.map((tag) =>
    typeof tag === "string" ? { id: tag, text: tag } : tag,
  );

  // 入力状態の初期化
  const [state, setState] = useState<TagInputState>({
    tags: normalizedInitialTags,
    inputValue: "",
    suggestions: [],
    isLoading: false,
    error: null,
  });

  // 入力値をデバウンスして検索を最適化
  const debouncedInput = useDebounce(state.inputValue, 300);

  // 入力欄への参照
  const inputRef = useRef<HTMLInputElement>(null);

  // サジェスチョンリストへの参照
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 外部へのタグ変更通知
  useEffect(() => {
    if (onChange) {
      onChange(state.tags.map((tag) => tag.text));
    }
  }, [state.tags, onChange]);

  // 入力値に基づいて候補を検索
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedInput.trim()) {
        setState((prev) => ({ ...prev, suggestions: [], isLoading: false }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const result = await searchTags({ query: debouncedInput });

        // 既に追加済みのタグを除外
        const filteredSuggestions = result.tags.filter(
          (suggestion) => !state.tags.some((tag) => tag.id === suggestion.id),
        );

        setState((prev) => ({
          ...prev,
          suggestions: filteredSuggestions,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          suggestions: [],
          isLoading: false,
          error: "タグ候補の取得に失敗しました",
        }));
      }
    };

    if (debouncedInput && !readOnly) {
      fetchSuggestions();
    }
  }, [debouncedInput, readOnly, state.tags]);

  // タグの追加処理
  const addTag = useCallback(
    (text: string) => {
      if (disabled || readOnly) return;

      // 値の正規化とバリデーション
      const normalizedText = normalizeTag(text);
      const error = validateTag(normalizedText);

      if (!normalizedText || error) {
        setState((prev) => ({
          ...prev,
          error: error || "無効なタグです",
        }));
        return;
      }

      // 既存タグチェック
      if (state.tags.some((tag) => tag.id === normalizedText)) {
        setState((prev) => ({
          ...prev,
          error: "このタグは既に追加されています",
          inputValue: "",
        }));
        return;
      }

      // 最大数チェック
      if (state.tags.length >= maxTags) {
        setState((prev) => ({
          ...prev,
          error: `タグは${maxTags}個までしか追加できません`,
          inputValue: "",
        }));
        return;
      }

      // タグ追加
      setState((prev) => ({
        ...prev,
        tags: [...prev.tags, { id: normalizedText, text: normalizedText }],
        inputValue: "",
        error: null,
        suggestions: [],
      }));

      // 入力欄にフォーカスを戻す
      inputRef.current?.focus();
    },
    [state.tags, disabled, readOnly, maxTags],
  );

  // タグの削除処理
  const removeTag = useCallback(
    (id: string) => {
      if (disabled || readOnly) return;

      setState((prev) => ({
        ...prev,
        tags: prev.tags.filter((tag) => tag.id !== id),
        error: null,
      }));
    },
    [disabled, readOnly],
  );

  // 入力値の変更ハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setState((prev) => ({
      ...prev,
      inputValue: value,
      error: null,
    }));
  };

  // キー入力ハンドラ
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && state.inputValue) {
      e.preventDefault();
      addTag(state.inputValue);
    } else if (
      e.key === "Backspace" &&
      !state.inputValue &&
      state.tags.length > 0
    ) {
      // 入力欄が空の場合、最後のタグを削除
      removeTag(state.tags[state.tags.length - 1].id);
    } else if (e.key === "Escape") {
      // サジェスチョンを閉じる
      setState((prev) => ({
        ...prev,
        suggestions: [],
      }));
    } else if (e.key === "ArrowDown" && state.suggestions.length > 0) {
      // サジェスチョン内を矢印キーで移動
      e.preventDefault();
      suggestionsRef.current?.querySelector("button")?.focus();
    }
  };

  // サジェスチョンアイテムのキーハンドラ
  const handleSuggestionKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    suggestion: TagInfo,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(suggestion.text);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setState((prev) => ({ ...prev, suggestions: [] }));
      inputRef.current?.focus();
    } else if (e.key === "ArrowDown" && index < state.suggestions.length - 1) {
      e.preventDefault();
      const nextSibling = e.currentTarget
        .nextElementSibling as HTMLButtonElement;
      nextSibling?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index === 0) {
        // 最初の候補で上矢印が押されたら入力欄に戻る
        inputRef.current?.focus();
      } else {
        const prevSibling = e.currentTarget
          .previousElementSibling as HTMLButtonElement;
        prevSibling?.focus();
      }
    }
  };

  // blur時のハンドラ
  const handleBlur = (e: React.FocusEvent) => {
    // サジェスチョンリスト内の要素にフォーカスが移る場合は無視
    if (suggestionsRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    // 少し遅延させてサジェスチョンリストのクリックを処理できるようにする
    setTimeout(() => {
      setState((prev) => ({ ...prev, suggestions: [] }));

      if (onBlur) {
        onBlur(state.tags.map((tag) => tag.text));
      }
    }, 200);
  };

  return (
    <div className={`form-control w-full ${className}`}>
      <div className="relative">
        {/* タグ入力コンテナ */}
        <div
          className={`
            flex flex-wrap items-center gap-1 p-2 border rounded-lg
            ${disabled ? "bg-base-200 cursor-not-allowed" : "bg-base-100"}
            ${readOnly ? "cursor-default" : "cursor-text"}
            focus-within:outline-2 focus-within:outline-offset-2
            focus-within:outline-primary hover:border-primary
          `}
          onClick={() => !disabled && !readOnly && inputRef.current?.focus()}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              !disabled &&
              !readOnly
            ) {
              inputRef.current?.focus();
            }
          }}
        >
          {/* タグリスト */}
          {state.tags.map((tag) => (
            <div
              key={tag.id}
              className={`
                badge badge-secondary gap-1 px-3 py-3
                ${!readOnly && !disabled ? "badge-outline" : ""}
              `}
            >
              <span>{tag.text}</span>
              {!readOnly && !disabled && (
                <button
                  type="button"
                  className="btn-ghost rounded-full p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      removeTag(tag.id);
                    }
                  }}
                  aria-label={`タグ「${tag.text}」を削除`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {/* 入力フィールド */}
          {!readOnly && state.tags.length < maxTags && (
            <input
              ref={inputRef}
              type="text"
              value={state.inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={state.tags.length === 0 ? placeholder : ""}
              className="flex-grow bg-transparent border-none outline-none min-w-20 p-1"
              disabled={disabled || readOnly}
              aria-label="タグを入力"
              aria-invalid={!!state.error}
              aria-describedby={state.error ? "tag-input-error" : undefined}
            />
          )}

          {/* タグアイコン */}
          <Tag
            className="h-5 w-5 text-secondary ml-auto mr-1"
            aria-hidden="true"
          />
        </div>

        {/* エラーメッセージ */}
        {state.error && (
          <p id="tag-input-error" className="text-error text-sm mt-1">
            {state.error}
          </p>
        )}

        {/* タグ候補リスト */}
        {state.suggestions.length > 0 && !readOnly && !disabled && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 left-0 right-0 mt-1 bg-base-100 shadow-md rounded-lg max-h-60 overflow-y-auto"
          >
            <ul className="menu menu-compact p-1">
              {state.suggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => addTag(suggestion.text)}
                    onKeyDown={(e) =>
                      handleSuggestionKeyDown(e, suggestion, index)
                    }
                    className="flex justify-between"
                  >
                    <span>{suggestion.text}</span>
                    {suggestion.count !== undefined && (
                      <span className="badge badge-sm">{suggestion.count}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ローディングインジケータ */}
        {state.isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-secondary" />
          </div>
        )}
      </div>

      {/* 説明文 */}
      <div className="text-xs text-base-content/70 mt-1">
        {!readOnly && !disabled && (
          <>
            <span>Enterキーで追加、</span>
            <span>バックスペースキーで削除、</span>
            <span>最大{maxTags}個まで</span>
          </>
        )}
        {state.tags.length >= maxTags && (
          <span className="text-warning">タグの上限に達しました</span>
        )}
      </div>
    </div>
  );
}
