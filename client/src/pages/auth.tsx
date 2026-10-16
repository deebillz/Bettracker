import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
          password,
        });
      } else {
        await login(loginId.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = isRegister
    ? email && username.length >= 3 && displayName.trim() && password.length >= 8
    : loginId && password;

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">BetTracker</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Track your bets, see your stats, own your data.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Free to start. Your bets stay private to you."
                : "Sign in with your email or username"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister ? (
                <>
                  <Field label="Email">
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      data-testid="input-email"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Username">
                      <Input
                        placeholder="bigdave23"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                        maxLength={20}
                        autoComplete="username"
                        data-testid="input-username"
                      />
                    </Field>
                    <Field label="Display name">
                      <Input
                        placeholder="Big Dave"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={50}
                        autoComplete="nickname"
                        data-testid="input-display-name"
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <Field label="Email or username">
                  <Input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    autoComplete="username"
                    data-testid="input-login"
                  />
                </Field>
              )}

              <Field label="Password" hint={isRegister ? "At least 8 characters" : undefined}>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  data-testid="input-password"
                />
              </Field>

              {error && (
                <div
                  className="text-sm text-destructive font-medium bg-destructive/10 rounded-md px-3 py-2"
                  data-testid="text-error"
                >
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !canSubmit} data-testid="button-auth-submit">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isRegister ? "Create account" : "Sign in"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => switchMode(isRegister ? "login" : "register")}
                data-testid="button-switch-mode"
              >
                {isRegister ? "Already have an account? " : "Don't have an account? "}
                <span className="underline underline-offset-2">{isRegister ? "Sign in" : "Create one"}</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
