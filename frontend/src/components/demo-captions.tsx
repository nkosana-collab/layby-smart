"use client";

/**
 * Recording mode for the demo video. Open any page with ?demo=1 to switch it on
 * (?demo=0 switches it off). PageDown speaks the next line and shows it as a subtitle;
 * PageUp goes back. It only narrates: it never touches the wallet or the contract.
 */
import { useEffect, useSyncExternalStore } from "react";
import cues from "@/lib/demo-cues.json";

const KEY = "layby-demo-step"; // sessionStorage: absent = off, "0" = armed, "n" = showing cue n
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;

function read(): number | null {
  try {
    const flag = new URLSearchParams(window.location.search).get("demo");
    if (flag === "0") sessionStorage.removeItem(KEY);
    else if (flag === "1" && sessionStorage.getItem(KEY) === null) sessionStorage.setItem(KEY, "0");
    const v = sessionStorage.getItem(KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function go(step: number) {
  const next = Math.max(0, Math.min(cues.length + 1, step));
  try {
    sessionStorage.setItem(KEY, String(next));
  } catch {}
  audio?.pause();
  audio = null;
  if (next >= 1 && next <= cues.length) {
    audio = new Audio(`/demo/${next}.wav`);
    audio.play().catch(() => {});
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function DemoCaptions() {
  const step = useSyncExternalStore(subscribe, read, () => null);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PageDown") {
        e.preventDefault();
        go(step + 1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        go(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  if (step === null) return null;
  const text = step >= 1 && step <= cues.length ? cues[step - 1] : null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
      {text && (
        <p aria-live="polite" className="max-w-[900px] rounded-xl bg-black/85 px-5 py-3 text-center text-[20px] font-semibold leading-snug text-white shadow-lg">
          {text}
        </p>
      )}
      <button
        type="button"
        onClick={() => go(step + 1)}
        className="pointer-events-auto cursor-pointer rounded-full bg-black/40 px-3 py-1 text-[11px] text-white hover:bg-black/70"
      >
        {step === 0 ? "Recording mode · PageDown to start" : step > cues.length ? "End" : `${step}/${cues.length} ▸`}
      </button>
    </div>
  );
}
