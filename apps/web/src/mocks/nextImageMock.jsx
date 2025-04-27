import React from 'react';

// next/imageのモック
const NextImageMock = ({ src, alt, fill, sizes, className, priority, ...props }) => {
  // fillプロパティがある場合は、親要素に合わせたスタイルを適用
  const style = fill
    ? { objectFit: 'cover', position: 'absolute', width: '100%', height: '100%' }
    : { maxWidth: '100%', height: 'auto' };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        ...style,
        ...props.style,
      }}
      {...props}
    />
  );
};

export default NextImageMock;