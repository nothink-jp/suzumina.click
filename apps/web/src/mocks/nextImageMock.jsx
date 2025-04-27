import React from "react";

// next/imageのモック
const NextImageMock = ({
  src,
  alt = "Image", // 常に意味のあるデフォルト値を設定
  fill,
  sizes,
  className,
  priority,
  ...props
}) => {
  // fillプロパティがある場合は、親要素に合わせたスタイルを適用
  const style = fill
    ? {
        objectFit: "cover",
        position: "absolute",
        width: "100%",
        height: "100%",
      }
    : { maxWidth: "100%", height: "auto" };

  // propsからalt属性を除外（上書き防止）
  const { alt: propsAlt, ...restProps } = props;

  // 必ず意味のあるalt属性を提供する
  const finalAlt = alt || propsAlt || "Image";

  return (
    <img
      {...restProps} // 他のpropsを先に展開
      src={src}
      className={className}
      style={{
        ...style,
        ...props.style,
      }}
      alt={finalAlt} // 明示的にalt属性を最後に設定（上書き防止）
    />
  );
};

export default NextImageMock;
