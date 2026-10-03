import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Vol { user_id: string; display_name: string; verified: boolean; available: boolean; created_at: string; }
const db = supabase as any;

const AdminVolunteers = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<Vol[]>([]);

  const load = async () => {
    const { data } = await db.from("volunteers").select("user_id,display_name,verified,available,created_at").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (data) load();
    })();
  }, [user]);

  const setVerified = async (v: Vol, verified: boolean) => {
    const { error } = await db.from("volunteers").update({ verified }).eq("user_id", v.user_id);
    if (error) return toast.error(error.message);
    toast.success(verified ? `${v.display_name} verified` : `${v.display_name} unverified`);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-trust text-secondary-foreground">
        <div className="container py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <h1 className="text-2xl font-bold">Verify Volunteers</h1>
          <p className="text-sm opacity-80 mt-1">Approve volunteers so they show a Verified badge.</p>
        </div>
      </header>
      <main className="container py-6 space-y-3">
        {isAdmin === false && (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Only admins can open this page.</p>
          </div>
        )}
        {isAdmin && items.length === 0 && <p className="text-center py-12 text-muted-foreground">No volunteers registered yet.</p>}
        {isAdmin && items.map((v) => (
          <div key={v.user_id} className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-1 truncate">
                {v.display_name} {v.verified && <BadgeCheck className="w-4 h-4 text-success shrink-0" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {v.available ? "Available" : "Offline"} · joined {new Date(v.created_at).toLocaleDateString()}
              </div>
            </div>
            {v.verified
              ? <Button size="sm" variant="outline" onClick={() => setVerified(v, false)}>Remove</Button>
              : <Button size="sm" onClick={() => setVerified(v, true)}>Verify</Button>}
          </div>
        ))}
      </main>
    </div>
  );
};

export default AdminVolunteers;
