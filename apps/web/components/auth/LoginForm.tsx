"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Input } from "@/components/ui";
import { AuthDivider } from "./AuthDivider";
import { OAuthButton, GoogleMark, GitHubMark } from "./OAuthButton";

export function LoginForm() {
  const { login, googleLogin, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const validate = () => {
    const e = email.trim();
    let ok = true;
    setEmailError(null);
    setPasswordError(null);
    if (!e) {
      setEmailError("Email is required.");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailError("Enter a valid email address.");
      ok = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      await login(email.trim(), password);
      // AuthGuard handles the redirect into /app.
    } catch (err) {
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : "Incorrect email or password."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        error={emailError}
        onChange={(e) => {
          setEmail(e.target.value);
          if (emailError) setEmailError(null);
          if (formError) setFormError(null);
        }}
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        error={passwordError}
        labelAction={
          <Link
            href="/forgot-password"
            className="text-[12px] text-accent transition-colors hover:opacity-80"
          >
            Forgot password?
          </Link>
        }
        onChange={(e) => {
          setPassword(e.target.value);
          if (passwordError) setPasswordError(null);
          if (formError) setFormError(null);
        }}
      />

      {formError && <p className="-mt-1 text-[12px] text-danger">{formError}</p>}

      <Button type="submit" variant="primary" full loading={isLoading} className="mt-2">
        Sign in
      </Button>

      <AuthDivider />

      <OAuthButton label="Continue with GitHub" icon={<GitHubMark />} onClick={() => setFormError("GitHub sign-in isn't available yet — use Google or email.")} />
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
        No account?{" "}
        <Link href="/register" className="text-accent transition-colors hover:opacity-80">
          Create one →
        </Link>
      </p>
    </form>
  );
}
