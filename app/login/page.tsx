"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

function LoginCard() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unauthorized = params.get("error") === "unauthorized";

  async function signIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, so nothing else to do.
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <Button size="lg" onClick={signIn} disabled={loading}>
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>

      {unauthorized && (
        <p className="text-center text-sm text-destructive">
          That account isn’t allowed to access this app.
        </p>
      )}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Compass</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Your personal life-management space. Sign in to continue.
        </p>
      </div>

      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
