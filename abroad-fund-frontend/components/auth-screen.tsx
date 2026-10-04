"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginRequest, signupRequest, saveToken } from "@/lib/desk-api";

export function AuthScreen({ onLogin }: { onLogin: (isNewUser?: boolean) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isLogin) {
        const data = await loginRequest(username, password);
        saveToken(data.token);
        localStorage.setItem("user-role", data.user.role);
        onLogin(false);
      } else {
        const data = await signupRequest(username, password);
        // Automatically login after signup
        const loginData = await loginRequest(username, password);
        saveToken(loginData.token);
        localStorage.setItem("user-role", loginData.user.role);
        onLogin(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-md gap-3">
      <h2 className="font-heading text-3xl text-ink">{isLogin ? "Log in" : "Sign up"}</h2>
      <p className="text-sm text-muted-foreground">
        {isLogin ? "Access your personal fund data." : "Create an account to track your fund."}
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="auth-username">Username</Label>
        <Input
          id="auth-username"
          className="h-10"
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5 mt-2">
        <Label htmlFor="auth-password">Password</Label>
        <Input
          id="auth-password"
          className="h-10"
          type="password"
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-money-out" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-4 mt-2">
        <Button type="submit" className="h-10 w-fit" disabled={busy || username.trim().length === 0 || password.length === 0}>
          {busy ? "Please wait…" : (isLogin ? "Log in" : "Sign up")}
        </Button>
        <button 
          type="button" 
          onClick={() => { setIsLogin(!isLogin); setError(""); }}
          className="text-sm text-brass-deep underline hover:text-ink"
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </form>
  );
}
