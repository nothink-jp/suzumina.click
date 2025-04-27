import React from "react";

// next/linkのモック
const NextLinkMock = ({ href, children, className, ...props }) => {
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
};

export default NextLinkMock;
