"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * First-run setup wizard (brief §Self-hosting) — four linear steps, one per
 * screen, centered 440px column. Progress is a mono "Step N of 4" line — no
 * dots, no progress bar.
 */
const FIELD =
  "mt-2 h-10 w-full rounded-md border border-border bg-surface-input px-3 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active";
const LABEL = "font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary";

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [allowSignups, setAllowSignups] = useState(false);

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-background px-6">
      <div className="w-full max-w-[440px] py-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Step {step} of 4
        </p>

        {step === 1 && (
          <StepFrame
            title="Admin account"
            sub="The instance owner. This account manages users, spaces, and updates."
          >
            <Field label="Email">
              <input className={FIELD} type="email" placeholder="you@example.com" />
            </Field>
            <Field label="Username">
              <input className={FIELD} placeholder="admin" />
            </Field>
            <Field label="Password">
              <input className={FIELD} type="password" placeholder="••••••••••••" />
            </Field>
            <Next onClick={() => setStep(2)} />
          </StepFrame>
        )}

        {step === 2 && (
          <StepFrame title="Instance config" sub="How your Corvus instance presents itself.">
            <Field label="Instance name">
              <input className={FIELD} placeholder="Acme HQ" />
            </Field>
            <Field label="URL">
              <input className={`${FIELD} font-mono text-[13px]`} placeholder="https://corvus.acme.com" />
            </Field>
            <button
              type="button"
              onClick={() => setAllowSignups((v) => !v)}
              className="flex w-full items-center justify-between border-b border-border py-4 text-left"
            >
              <span>
                <span className="block text-[14px] text-text-primary">Allow signups</span>
                <span className="mt-0.5 block text-[12px] text-text-muted">
                  Anyone with the URL can create an account.
                </span>
              </span>
              <span
                className={`font-mono text-[12px] ${allowSignups ? "text-accent" : "text-text-muted"}`}
              >
                {allowSignups ? "ON" : "OFF"}
              </span>
            </button>
            <Next onClick={() => setStep(3)} />
          </StepFrame>
        )}

        {step === 3 && (
          <StepFrame title="SMTP / email" sub="For invites and password resets. You can add this later.">
            <div className="grid grid-cols-[1fr_110px] gap-x-3">
              <Field label="Host">
                <input className={FIELD} placeholder="smtp.example.com" />
              </Field>
              <Field label="Port">
                <input className={`${FIELD} font-mono`} placeholder="587" />
              </Field>
            </div>
            <Field label="Username">
              <input className={FIELD} placeholder="corvus@example.com" />
            </Field>
            <Field label="Password">
              <input className={FIELD} type="password" placeholder="••••••••" />
            </Field>
            <Field label="From address">
              <input className={FIELD} placeholder="Corvus <no-reply@example.com>" />
            </Field>
            <div className="mt-6 flex items-center gap-3">
              <PrimaryBtn onClick={() => setStep(4)}>Continue →</PrimaryBtn>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="h-10 rounded-md px-3 text-[14px] text-text-muted transition-colors hover:text-text-primary"
              >
                Skip for now
              </button>
            </div>
          </StepFrame>
        )}

        {step === 4 && (
          <StepFrame title="Your Corvus instance is ready." sub="Sign in with the admin account to get started.">
            <div className="mt-2">
              <Link
                href="/login"
                className="inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
              >
                Open Corvus →
              </Link>
            </div>
          </StepFrame>
        )}
      </div>
    </div>
  );
}

function StepFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="mt-3 text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary">
        {title}
      </h1>
      <p className="mt-2 text-[14px] leading-[1.6] text-text-secondary">{sub}</p>
      <div className="mt-7 flex flex-col gap-5">{children}</div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function Next({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-6">
      <PrimaryBtn onClick={onClick}>Continue →</PrimaryBtn>
    </div>
  );
}

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-md bg-accent px-5 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
    >
      {children}
    </button>
  );
}
