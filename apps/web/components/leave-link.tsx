"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function LeaveLink({
  href,
  formId,
  className,
  children,
}: {
  href: string;
  formId: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "check" | "confirm">("idle");

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    const sync = () => {
      requestAnimationFrame(() => {
        if (form.dataset.dirty !== "1") setStep("idle");
      });
    };
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, [formId]);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (form?.dataset.dirty !== "1") return;
    event.preventDefault();
    setStep((current) => (current === "check" ? "confirm" : "check"));
  }

  return (
    <>
      <Link href={href} className={className} onClick={onClick}>{children}</Link>
      {step === "check" ? (
        <p className="fixed left-1/2 top-4 z-40 flex w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe5ef] bg-white px-4 py-3 text-sm shadow-lg" role="status">
          <span>Girdiğiniz bilgileri kaydet demediniz, kontrol edin.</span>
          <button type="button" className="admin-text-btn" onClick={() => setStep("confirm")}>Yine de çık</button>
        </p>
      ) : null}
      {step === "confirm" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101a42]/30 p-4" role="dialog" aria-modal="true" aria-labelledby="cikis-soru">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="cikis-soru" className="text-lg font-semibold text-[var(--heading)]">Emin misiniz?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Girdiğiniz bilgileri kaydet demediniz. Yine de kaydetmeden çıkmak istiyorsanız onaylayın.</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-club" onClick={() => setStep("check")}>Hayır, forma dön</button>
              <button type="button" className="btn-line" onClick={() => router.push(href)}>Evet, çık</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
