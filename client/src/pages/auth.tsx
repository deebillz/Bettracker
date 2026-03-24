import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, ArrowRight } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          setError("Display name is required");
          setLoading(false);
          return;
        }
        await register(username.trim(), pin, displayName.trim());
      } else {
        await login(username.trim(), pin);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
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
            <CardTitle className="text-lg">
              {mode === "login" ? "Welcome back" : "Create your tracker"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Enter your username and PIN to access your bets"
                : "Pick a username and a 4-8 digit PIN to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    placeholder="e.g. Big Dave"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-testid="input-display-name"
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username</label>
                <Input
                  placeholder="e.g. bigdave23"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  maxLength={20}
                  data-testid="input-username"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="4-8 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  maxLength={8}
                  data-testid="input-pin"
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive font-medium bg-destructive/10 rounded-md px-3 py-2" data-testid="text-error">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !username || pin.length < 4} data-testid="button-auth-submit">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              {mode === "login" ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setMode("register"); setError(""); }}
                  data-testid="button-switch-register"
                >
                  Don't have an account? <span className="underline underline-offset-2">Create one</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => { setMode("login"); setError(""); }}
                  data-testid="button-switch-login"
                >
                  Already have an account? <span className="underline underline-offset-2">Sign in</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <PerplexityAttribution />
      </div>
    </div>
  );
}
