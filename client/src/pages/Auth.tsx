import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../lib/api";
import { authStorage } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";

export const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = { email: email.trim(), password };
      const result =
        mode === "login" ? await authApi.login(payload) : await authApi.register(payload);
      authStorage.setToken(result.token);
      toast.success(mode === "login" ? "Welcome back!" : "Account created.");
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden motion-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 dark:to-slate-950/30" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-center gap-6 rounded-3xl border border-border/60 bg-card/90 p-10 shadow-card backdrop-blur lg:flex">
            <div className="inline-flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-foreground text-background">
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
                  P
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  Progress Tracker
                </p>
                <h2 className="text-3xl font-semibold">Welcome back.</h2>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              Keep momentum with a clean weekly view, focused targets, and progress history that
              highlights your wins.
            </p>
            <div className="grid gap-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                “It feels like a calm, organized sprint each day.”
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                Weekly focus, quick updates, and a snapshot of what matters most.
              </div>
            </div>
          </div>

          <Card className="w-full rounded-3xl border border-border/60 bg-card/95 shadow-card backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl leading-tight">
                {mode === "login" ? "Sign in to continue" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Access your goals, progress history, and weekly focus."
                  : "Start tracking goals with clarity and momentum."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? (
                    <Skeleton className="mx-auto h-4 w-24" />
                  ) : mode === "login" ? (
                    "Sign in"
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
              <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                <span>{mode === "login" ? "Need an account?" : "Already have an account?"}</span>
                <button
                  className="font-medium text-foreground underline underline-offset-4"
                  type="button"
                  onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
