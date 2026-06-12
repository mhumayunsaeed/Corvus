"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Input } from "@/components/ui";
import { AuthDivider } from "./AuthDivider";
import { OAuthButton, GoogleMark, GitHubMark } from "./OAuthButton";
import { PasswordStrength } from "./PasswordStrength";

type Availability = "idle" | "checking" | "available" | "taken";

export function SignupForm() {
  const router = useRouter();
  const { register, googleLogin, githubLogin, checkUsername, isLoading } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [availability, setAvailability] = useState<Availability>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onUsername = (value: string) => {
    setUsername(value);
    setFormError(null);
    if (timer.current) clearTimeout(timer.current);
    if (value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(value)) {
      setAvailability("checking");
      timer.current = setTimeout(async () => {
        const ok = await checkUsername(value.toLowerCase());
        setAvailability(ok === null ? "idle" : ok ? "available" : "taken");
      }, 400);
    } else {
      setAvailability("idle");
    }
  };

  const passwordsMismatch = Boolean(confirm) && password !== confirm;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!agreed) {
      setFormError("Please accept the Terms to continue.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (passwordsMismatch) {
      setFormError("Passwords don't match.");
      return;
    }
    if (availability === "taken") {
      setFormError("That username is taken.");
      return;
    }
    try {
      const result = await register({
        displayName: username,
        username: username.toLowerCase(),
        email: email.trim(),
        password,
      });
      if (result.confirmEmail) {
        router.push(`/confirm-email?email=${encodeURIComponent(email.trim())}`);
      } else {
        router.push("/onboarding");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Username"
        autoComplete="username"
        placeholder="raven"
        value={username}
        onChange={(e) => onUsername(e.target.value)}
        hint="This is how others find you. You can change it later."
        adornment={<AvailabilityMark state={availability} />}
        error={availability === "taken" ? "Username taken" : null}
      />

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div>
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength password={password} />
      </div>

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={passwordsMismatch ? "Passwords don't match" : null}
      />

      <label className="flex cursor-pointer items-start gap-3 text-[13px] text-text-secondary">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border-border bg-surface-raised accent-accent"
        />
        <span>
          I agree to the{" "}
          <a href="#" className="text-accent hover:opacity-80">Terms of Service</a> and{" "}
          <a href="#" className="text-accent hover:opacity-80">Privacy Policy</a>.
        </span>
      </label>

      {formError && <p className="-mt-1 text-[12px] text-danger">{formError}</p>}

      <Button type="submit" variant="primary" full loading={isLoading} disabled={!agreed}>
        Create account
      </Button>

      <AuthDivider />

      <OAuthButton
        label="Continue with GitHub"
        icon={<GitHubMark />}
        onClick={async () => {
          try {
            await githubLogin();
          } catch (err) {
            setFormError(err instanceof Error ? err.message : "GitHub sign-up failed.");
          }
        }}
      />
      <OAuthButton
        label="Continue with Google"
        icon={<GoogleMark />}
        onClick={async () => {
          try {
            await googleLogin();
          } catch (err) {
            setFormError(err instanceof Error ? err.message : "Google sign-in failed.");
          }
        }}
      />

      <p className="mt-2 text-center text-[14px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent transition-colors hover:opacity-80">
          Sign in →
        </Link>
      </p>
    </form>
  );
}

function AvailabilityMark({ state }: { state: Availability }) {
  if (state === "idle") return null;
  if (state === "checking")
    return <span className="loading-dot font-mono text-[13px] text-text-muted">·</span>;
  if (state === "available")
    return <span className="font-mono text-[13px] text-status-online">✓</span>;
  return <span className="font-mono text-[13px] text-status-dnd">✗</span>;
}
