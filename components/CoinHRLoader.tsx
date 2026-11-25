"use client";

import React from "react";
import Image from "next/image";
import LogoLoader from "./LogoLoader";

export { LogoLoader };

export interface CoinHRLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  variant?: "fill" | "spin" | "pulse" | "gif";
  label?: string;
  layout?: "horizontal" | "vertical";
  className?: string;
  fullScreen?: boolean;
}

const SIZE_MAP: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 28,
  sm: 44,
  md: 80,
  lg: 140,
  xl: 200,
};

export function CoinHRLoader({
  size = "md",
  variant = "gif",
  label,
  layout = label && (size === "lg" || size === "xl" || (typeof size === "number" && size >= 40)) ? "vertical" : "horizontal",
  className = "",
  fullScreen = false,
}: CoinHRLoaderProps) {
  const rawSize = typeof size === "number" ? size : SIZE_MAP[size] || 80;
  const height = Math.round((rawSize * 360) / 640);

  if (fullScreen) {
    return <LogoLoader fullScreen={true} size={rawSize} message={label} className={className} />;
  }

  return (
    <div
      role="status"
      aria-label={label || "Loading..."}
      className={`inline-flex items-center justify-center ${
        layout === "vertical" ? "flex-col gap-2.5" : "flex-row gap-2.5"
      } ${className}`}
    >
      <div className="overflow-hidden rounded-lg inline-flex items-center justify-center">
        <Image
          src="/images/logo-loader.gif"
          alt="Loading..."
          width={rawSize}
          height={height}
          unoptimized
          priority
          className={`object-contain ${
            variant === "spin" ? "animate-spin" : variant === "pulse" ? "animate-pulse" : ""
          }`}
          style={{ width: `${rawSize}px`, height: "auto" }}
        />
      </div>

      {label && (
        <span
          className={`font-medium ${
            layout === "vertical"
              ? "text-xs text-slate-500 text-center tracking-tight"
              : "text-xs text-inherit"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function FullPageLoader({
  title = "Loading CoinHR...",
  subtitle,
  size = 200,
}: {
  title?: string;
  subtitle?: string;
  size?: number;
}) {
  return (
    <LogoLoader
      fullScreen={true}
      size={size}
      message={subtitle ? `${title} · ${subtitle}` : title}
    />
  );
}

export function SectionLoader({
  message = "Loading...",
  className = "",
  size = 140,
}: {
  message?: string;
  className?: string;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const rawSize = typeof size === "number" ? size : SIZE_MAP[size] || 140;
  return (
    <LogoLoader
      fullScreen={false}
      size={rawSize}
      message={message}
      className={className}
    />
  );
}

export default LogoLoader;
