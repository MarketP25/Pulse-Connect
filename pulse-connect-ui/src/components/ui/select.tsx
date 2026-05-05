"use client";

import * as React from "react";

type SelectContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error("Select components must be used within Select");
  }
  return ctx;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value = "", onValueChange, children }: SelectProps) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-1 flex min-h-10 w-full items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder = "Select" }: { placeholder?: string }) {
  const ctx = useSelectContext();
  return <span>{ctx.value || placeholder}</span>;
}

export function SelectContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-1 rounded-md border border-slate-200 bg-white p-1 ${className}`} {...props} />;
}

export interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function SelectItem({ value, className = "", children, ...props }: SelectItemProps) {
  const ctx = useSelectContext();
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange?.(value)}
      className={`flex w-full items-center rounded px-2 py-1.5 text-left text-sm ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}