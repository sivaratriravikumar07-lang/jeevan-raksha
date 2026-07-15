import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HeartPulse, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MedicalID {
  bloodGroup: string;
  allergies: string;
  conditions: string;
  medications: string;
  emergencyContact: string;
  doctorName: string;
  doctorPhone: string;
  insurance: string;
  notes: string;
}

const KEY = "jr_medical_id";
const empty: MedicalID = { bloodGroup: "", allergies: "", conditions: "", medications: "", emergencyContact: "", doctorName: "", doctorPhone: "", insurance: "", notes: "" };

const MedicalID = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MedicalID>(empty);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setData(JSON.parse(raw));
  }, []);

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(data));
    toast.success("Medical ID saved");
  };

  const copyCard = () => {
    const txt = `MEDICAL ID\nBlood: ${data.bloodGroup}\nAllergies: ${data.allergies}\nConditions: ${data.conditions}\nMedications: ${data.medications}\nEmergency: ${data.emergencyContact}\nDoctor: ${data.doctorName} ${data.doctorPhone}`;
    navigator.clipboard.writeText(txt);
    toast.success("Copied — share with responders");
  };

  const field = (k: keyof MedicalID, label: string, ph: string, multi = false) => (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {multi
        ? <Textarea value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} placeholder={ph} className="mt-1" />
        : <Input value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} placeholder={ph} className="mt-1" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-background/20 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><HeartPulse className="w-5 h-5" /> Medical ID</h1>
            <p className="text-xs opacity-90">Life-saving info for responders</p>
          </div>
        </div>
      </header>

      <main className="container py-5 space-y-4">
        {data.bloodGroup && (
          <div className="bg-gradient-emergency text-primary-foreground rounded-2xl p-5 shadow-emergency">
            <p className="text-xs opacity-90 uppercase tracking-wider">Emergency Medical Card</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><span className="opacity-75">Blood:</span> <b>{data.bloodGroup}</b></div>
              {data.allergies && <div><span className="opacity-75">Allergies:</span> {data.allergies}</div>}
              {data.conditions && <div className="col-span-2"><span className="opacity-75">Conditions:</span> {data.conditions}</div>}
              {data.medications && <div className="col-span-2"><span className="opacity-75">Meds:</span> {data.medications}</div>}
            </div>
            <Button size="sm" variant="secondary" onClick={copyCard} className="mt-3"><Copy className="w-3 h-3 mr-1" /> Copy Card</Button>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          {field("bloodGroup", "Blood Group", "e.g. O+, B-")}
          {field("allergies", "Allergies", "Penicillin, peanuts...", true)}
          {field("conditions", "Medical Conditions", "Diabetes, asthma...", true)}
          {field("medications", "Current Medications", "Metformin 500mg...", true)}
          {field("emergencyContact", "Primary Emergency Contact", "Name +91...")}
          {field("doctorName", "Doctor Name", "Dr. ...")}
          {field("doctorPhone", "Doctor Phone", "+91...")}
          {field("insurance", "Insurance / Policy", "Policy number")}
          {field("notes", "Other Notes", "Organ donor, DNR...", true)}
          <Button onClick={save} className="w-full"><Save className="w-4 h-4 mr-2" /> Save Medical ID</Button>
        </div>
      </main>
    </div>
  );
};

export default MedicalID;
