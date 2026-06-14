import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

interface Contact { id: string; name: string; phone: string; email: string | null; relationship: string | null; }

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  relationship: z.string().trim().max(40).optional(),
});

const Contacts = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("emergency_contacts").select("*").eq("user_id", user.id).order("priority");
    setContacts(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user!.id, name: parsed.data.name, phone: parsed.data.phone,
      email: parsed.data.email || null, relationship: parsed.data.relationship || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact added");
    setForm({ name: "", phone: "", email: "", relationship: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold">Trusted Contacts</h1>
          <p className="text-sm opacity-80 mt-1">People who get alerted in an emergency.</p>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {contacts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No contacts yet. Add your first one.</p>
          </div>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center font-bold text-secondary">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.phone}{c.relationship ? ` · ${c.relationship}` : ""}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 bg-gradient-emergency shadow-emergency">
              <Plus className="w-5 h-5 mr-2" /> Add Trusted Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
            <form onSubmit={add} className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><Label>Phone</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
              <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Relationship (optional)</Label><Input placeholder="Mom, Friend..." value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>
              <Button type="submit" disabled={saving} className="w-full bg-gradient-emergency">{saving ? "Saving..." : "Save Contact"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <BottomNav />
    </div>
  );
};

export default Contacts;
