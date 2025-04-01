"use client";
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { className, ...rest } = props;
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md bg-blue-500 text-white py-2 px-4 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${className || ""}`}
      {...rest}
    />
  );
});
Button.displayName = "Button";
