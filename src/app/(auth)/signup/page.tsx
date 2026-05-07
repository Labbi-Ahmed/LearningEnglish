"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "./actions";

const criteria = [
  { label: "At least 8 characters",      test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)",  test: (p: string) => /[a-z]/.test(p) },
  { label: "One number (0–9)",            test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordCriteria({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {criteria.map(({ label, test }) => {
        const passed = test(password);
        return (
          <li key={label} className={`flex items-center gap-2 text-xs ${passed ? "text-green-600" : "text-muted-foreground"}`}>
            {passed
              ? <Check className="h-3 w-3 shrink-0 text-green-600" />
              : <X className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpAction, undefined);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const allCriteriaMet = criteria.every(({ test }) => test(password));
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = allCriteriaMet && !confirmMismatch;

  if (state && "ok" in state && state.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click it to finish creating your
            account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Start your English journey. Free, no credit card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordCriteria password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            {confirmMismatch && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <X className="h-3 w-3" /> Passwords do not match
              </p>
            )}
            {confirm.length > 0 && !confirmMismatch && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          {state && "error" in state && (
            <p className="text-sm font-medium text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
            {pending ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
