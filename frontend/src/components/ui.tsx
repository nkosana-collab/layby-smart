/**
 * Small primitives styled from the prototype: buttons, cards, tags, notices,
 * label/value lines. Server-safe (no hooks).
 */
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "link";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-border-button bg-surface text-primary-deep hover:bg-primary-soft",
  danger: "bg-danger-soft text-danger hover:bg-danger-bg",
  link: "!p-0 bg-transparent text-primary hover:underline",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-button px-[17px] py-[11px] font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-45",
    VARIANT[variant],
    className,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-border bg-surface p-[21px] shadow-card", className)} {...props} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-extrabold uppercase tracking-[1.7px] text-primary">{children}</p>;
}

export function PageTitle({ eyebrow, title, lede, action }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 text-[30px] font-bold leading-[1.13] tracking-[-1.5px] md:text-4xl">{title}</h1>
        {lede && <p className="mt-2 text-muted">{lede}</p>}
      </div>
      {action}
    </div>
  );
}

type NoticeTone = "info" | "warning" | "danger";
const NOTICE: Record<NoticeTone, string> = {
  info: "bg-notice text-notice-text",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Notice({ tone = "info", children, className }: { tone?: NoticeTone; children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[10px] px-[15px] py-[13px] text-[13px]", NOTICE[tone], className)}>{children}</div>;
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[20px] px-2.5 py-[5px] text-xs font-semibold", className ?? "bg-primary-soft text-primary-text")}>
      {children}
    </span>
  );
}

/** A label/value row, as in the prototype's agreement terms. */
export function Line({ label, children, muted = false }: { label: ReactNode; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-divider py-3 last:border-0">
      <dt className={muted ? "text-subtle" : undefined}>{label}</dt>
      <dd className="m-0 min-w-0 text-right font-bold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function Lines({ children }: { children: ReactNode }) {
  return <dl className="m-0">{children}</dl>;
}
