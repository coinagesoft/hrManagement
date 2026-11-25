import Image from "next/image";

export interface LogoLoaderProps {
  fullScreen?: boolean;
  size?: number;
  message?: string;
  className?: string;
}

export function LogoLoader({
  fullScreen = true,
  size = 180,
  message,
  className = "",
}: LogoLoaderProps) {
  const width = size;
  const height = Math.round((size * 360) / 640);

  return (
    <div
      className={
        fullScreen
          ? `fixed inset-0 z-50 flex flex-col items-center justify-center bg-white ${className}`
          : `flex flex-col items-center justify-center p-4 ${className}`
      }
      role="status"
      aria-label={message || "Loading"}
    >
      <div className="overflow-hidden rounded-lg flex items-center justify-center">
        <Image
          src="/images/logo-loader.gif"
          alt="Loading..."
          width={width}
          height={height}
          unoptimized
          priority
          className="object-contain"
          style={{ width: `${width}px`, height: "auto" }}
        />
      </div>
      {message && (
        <p className="mt-3 text-xs font-medium text-slate-500 tracking-tight text-center">
          {message}
        </p>
      )}
    </div>
  );
}

export default LogoLoader;
