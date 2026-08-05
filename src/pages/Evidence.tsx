import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Camera, Video, StopCircle, Upload, Image as ImageIcon,
  SwitchCamera, Trash2, Download, Share2, ShieldCheck, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Item { name: string; url: string; type: "image" | "video"; created: string; size: number }
type Filter = "all" | "image" | "video";

const fmtSize = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const Evidence = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [camOn, setCamOn] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Item | null>(null);

  const loadItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.storage.from("recordings").list(`${user.id}/evidence`, {
      limit: 100, sortBy: { column: "created_at", order: "desc" },
    });
    setLoading(false);
    if (!data) return setItems([]);
    const enriched = await Promise.all(
      data.filter((f) => f.name !== ".emptyFolderPlaceholder").map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("recordings")
          .createSignedUrl(`${user.id}/evidence/${f.name}`, 60 * 60);
        return {
          name: f.name,
          url: signed?.signedUrl ?? "",
          type: (f.name.endsWith(".webm") ? "video" : "image") as "image" | "video",
          created: f.created_at ?? "",
          size: (f.metadata as any)?.size ?? 0,
        };
      })
    );
    setItems(enriched.filter((i) => i.url));
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line */ }, [user]);

  const startCam = async (mode: "environment" | "user" = facing) => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: true });
      streamRef.current = stream;
      setCamOn(true);
      setFacing(mode);
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: any) { toast.error("Camera denied: " + e.message); }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  };
  useEffect(() => () => closeCamera(), []);

  const upload = async (blob: Blob, ext: string) => {
    if (!user) return;
    setBusy(true);
    const name = `incident-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("recordings")
      .upload(`${user.id}/evidence/${name}`, blob, { contentType: blob.type, upsert: false });
    setBusy(false);
    if (error) return toast.error("Upload failed: " + error.message);
    toast.success("Evidence saved securely");
    loadItems();
  };

  const snapPhoto = async () => {
    if (!streamRef.current || !videoRef.current) return toast.error("Open camera first");
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
    navigator.vibrate?.(60);
    await upload(blob, "jpg");
  };

  const stopRec = () => { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); };

  const startRec = async () => {
    if (!streamRef.current) await startCam();
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setRecording(false); setSecs(0);
      await upload(new Blob(chunksRef.current, { type: mime }), "webm");
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
    setSecs(0);
    timerRef.current = window.setInterval(() => {
      setSecs((s) => {
        if (s + 1 >= 60) stopRec();
        return s + 1;
      });
    }, 1000);
  };

  const remove = async (it: Item) => {
    if (!user) return;
    const { error } = await supabase.storage.from("recordings").remove([`${user.id}/evidence/${it.name}`]);
    if (error) return toast.error("Delete failed: " + error.message);
    setItems((l) => l.filter((x) => x.name !== it.name));
    setPreview(null);
    toast.success("Evidence deleted");
  };

  const share = async (it: Item) => {
    const text = `Jeevan Raksha evidence (valid 1 hour): ${it.url}`;
    if (navigator.share) { try { await navigator.share({ title: "Emergency evidence", text }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(it.url);
    toast.success("Secure link copied");
  };

  const shown = useMemo(() => items.filter((i) => filter === "all" || i.type === filter), [items, filter]);
  const photos = items.filter((i) => i.type === "image").length;
  const videos = items.length - photos;
  const totalSize = items.reduce((a, b) => a + b.size, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-emergency text-primary-foreground">
        <div className="container py-5 flex items-center gap-3">
          <Link to="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2"><Camera className="w-5 h-5" /> Evidence Vault</h1>
            <p className="text-[11px] opacity-85">{photos} photos · {videos} videos · {fmtSize(totalSize)} encrypted</p>
          </div>
        </div>
      </header>

      <main className="container -mt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="relative aspect-video bg-black flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            {!camOn && <span className="absolute text-xs text-white/60">Camera off</span>}
            {recording && (
              <span className="absolute top-2 left-2 flex items-center gap-1.5 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" /> REC {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
              </span>
            )}
            {camOn && !recording && (
              <button
                onClick={() => startCam(facing === "environment" ? "user" : "environment")}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                aria-label="Switch camera"
              ><SwitchCamera className="w-4 h-4" /></button>
            )}
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {!camOn ? (
              <Button onClick={() => startCam()} className="col-span-3"><Camera className="w-4 h-4 mr-2" />Open Camera</Button>
            ) : (
              <>
                <Button onClick={snapPhoto} disabled={busy || recording}>
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-1" />}Photo
                </Button>
                {!recording ? (
                  <Button onClick={startRec} className="bg-gradient-emergency" disabled={busy}><Video className="w-4 h-4 mr-1" />Record</Button>
                ) : (
                  <Button onClick={stopRec} variant="destructive"><StopCircle className="w-4 h-4 mr-1" />Stop</Button>
                )}
                <Button onClick={closeCamera} variant="outline" disabled={recording}>Close</Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(["all", "image", "video"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-border"}`}
              >{f === "all" ? `All (${items.length})` : f === "image" ? `Photos (${photos})` : `Videos (${videos})`}</button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={loadItems}><Upload className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-xs text-muted-foreground bg-muted/40 p-6 rounded-xl text-center">
            No evidence yet. Open the camera to capture a photo or video.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((it) => (
              <div key={it.name} className="rounded-xl overflow-hidden border border-border bg-card">
                <button onClick={() => setPreview(it)} className="block w-full">
                  {it.type === "image"
                    ? <img src={it.url} alt="Captured emergency evidence" loading="lazy" className="w-full aspect-square object-cover" />
                    : <video src={it.url} className="w-full aspect-square object-cover" />}
                </button>
                <div className="p-2 flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{it.created ? new Date(it.created).toLocaleString() : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{it.type === "video" ? "Video" : "Photo"} · {fmtSize(it.size)}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => share(it)} className="p-1.5 text-secondary" aria-label="Share"><Share2 className="w-3.5 h-3.5" /></button>
                    <a href={it.url} download={it.name} className="p-1.5 text-muted-foreground" aria-label="Download"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => remove(it)} className="p-1.5 text-primary" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground p-3 bg-muted/40 rounded-xl flex gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-secondary" />
          Files stay in your private cloud vault. Share links expire in 1 hour — safe to send to police or family.
        </p>
      </main>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 text-white" aria-label="Close preview"><X className="w-6 h-6" /></button>
          <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            {preview.type === "image"
              ? <img src={preview.url} alt="Evidence preview" className="max-h-[75vh] rounded-xl" />
              : <video src={preview.url} controls autoPlay className="max-h-[75vh] rounded-xl" />}
            <div className="flex justify-center gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={() => share(preview)}><Share2 className="w-4 h-4 mr-1" />Share</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(preview)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Evidence;
