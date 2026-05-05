import * as React from "react";

export function Avatar({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`} {...props} />;
}

export function AvatarImage({ className = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={`aspect-square h-full w-full ${className}`} {...props} />;
}

export function AvatarFallback({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`flex h-full w-full items-center justify-center bg-slate-200 text-slate-700 ${className}`} {...props} />
  );
}