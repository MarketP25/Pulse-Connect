import * as React from "react";

export function Alert({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900 ${className}`}
      role="alert"
      {...props}
    />
  );
}

export function AlertDescription({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`text-sm leading-relaxed ${className}`} {...props} />;
}