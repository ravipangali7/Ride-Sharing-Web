import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { adminLogin, storeTokens } from "@/lib/api";

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) { setError("Please fill in all fields"); return; }
    setError("");
    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail
        ? { email: identifier, password }
        : { phone: identifier, password };
      const result = await adminLogin(payload);
      sessionStorage.setItem("admin_user", JSON.stringify(result.user));
      storeTokens(result.access, result.refresh, remember);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl bg-card shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-primary-foreground">P</span>
            </div>
            <h1 className="text-xl font-bold">Admin Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage Pugau</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">Phone or Email</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="+977 98XXXXXXXX or admin@pugau.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember this device (stay signed in after closing the browser)
              </label>
            </div>

            <Button type="submit" className="w-full gradient-primary border-0" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</> : "Sign In"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
