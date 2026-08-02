import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name required").max(80),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(8, "Phone required").max(20),
  password: z.string().min(6, "Min 6 characters").max(100),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(100),
});

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Account created! Welcome to Jeevan Raksha.");
        navigate("/dashboard");
      } else {
        const parsed = signInSchema.safeParse({ email: form.email, password: form.password });
        if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) { toast.error(error.message); return; }
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-card flex flex-col">
      <header className="container py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-emergency" />
            <h1 className="text-2xl font-bold mb-1">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">{mode === "signup" ? "Stay protected in seconds." : "Sign in to access your safety dashboard."}</p>
          </div>

          <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" placeholder="+91..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-emergency shadow-emergency">
              {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "New to Jeevan Raksha? Create account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Auth;
