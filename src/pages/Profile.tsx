import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Save, Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", blood_group: "", emergency_message: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, blood_group, emergency_message")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        blood_group: data.blood_group ?? "",
        emergency_message: data.emergency_message ?? "",
      });
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      blood_group: form.blood_group.trim() || null,
      emergency_message: form.emergency_message.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2"><User className="w-6 h-6" /> Profile</h1>
          <p className="text-sm opacity-80 mt-1">Medical info shared with responders.</p>
        </div>
      </header>

      <main className="container py-6 space-y-5">
        <form onSubmit={save} className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9..." /></div>
          <div>
            <Label className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-primary" /> Blood Group</Label>
            <Input value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="O+, A-, etc." />
          </div>
          <div>
            <Label>Medical notes / allergies</Label>
            <Textarea
              value={form.emergency_message}
              onChange={(e) => setForm({ ...form, emergency_message: e.target.value })}
              placeholder="Allergic to penicillin, asthma, etc."
              rows={3}
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gradient-emergency shadow-emergency">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card text-xs text-muted-foreground">
          Signed in as <span className="font-mono text-foreground">{user?.email}</span>
        </div>

        <Button variant="outline" className="w-full h-11" onClick={async () => { await signOut(); }}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
