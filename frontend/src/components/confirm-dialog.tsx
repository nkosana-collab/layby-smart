"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, Notice } from "./ui";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  tone?: "primary" | "danger";
  /** If set, the user must tick this box before confirming. */
  acknowledgement?: string;
  busy?: boolean;
  error?: string | null;
  /** Shown under the details. In Phase 1 it says that nothing is sent. */
  footnote?: ReactNode;
}

/**
 * Modal built on the native <dialog>: focus trap, Escape to close and
 * inert background come from the browser.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  tone = "primary",
  acknowledgement,
  busy = false,
  error,
  footnote,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setChecked(false);
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-card border border-border bg-surface p-0 text-ink shadow-dialog"
    >
      <div className="grid gap-3 p-[21px]">
        <h2 id={titleId} className="text-[22px] font-bold tracking-[-0.6px]">
          {title}
        </h2>
        <div>{children}</div>
        {acknowledgement && (
          <label className="flex items-start gap-2 font-semibold">
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            {acknowledgement}
          </label>
        )}
        {footnote && <Notice>{footnote}</Notice>}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Back
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy || (!!acknowledgement && !checked)}
          >
            {busy ? "Waiting for wallet…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
