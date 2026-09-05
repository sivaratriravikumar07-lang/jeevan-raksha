import { Link } from "react-router-dom";
import { Download, Smartphone, Shield, MapPin, Bell, ArrowRight, CheckCircle, QrCode, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const features = [
  "One-tap SOS to Police 100",
  "Live GPS sharing with trusted contacts",
  "Voice & sound-triggered alerts",
  "Real-time safe zone & journey tracking",
  "Nearby police stations & hospitals",
];

const steps = [
  { title: "Open Google Play", desc: "Search 'Jeevan Raksha' or tap the badge below." },
  { title: "Install the app", desc: "Tap Install — it's a small, fast download." },
  { title: "Allow permissions", desc: "Give Location, Microphone & Camera access for full safety." },
  { title: "Stay protected", desc: "Add contacts and you're ready for emergencies." },
];

const DownloadPage = () => {
  // Replace this with your real Play Store link after publishing
  const playStoreLink = "https://play.google.com/store/apps/details?id=app.lovable.p3d70628152cc47c6bee826f8e0319848";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between gap-2 h-16 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Logo className="w-9 h-9 shrink-0" />
            <span className="font-bold text-base sm:text-lg tracking-tight truncate">Jeevan Raksha</span>
          </Link>
          <Link to="/auth?mode=signup">
            <Button size="sm" className="px-3 bg-gradient-emergency shadow-emergency">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-emergency opacity-30 blur-[90px]" />
        <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-gradient-trust opacity-30 blur-[100px]" />

        <div className="container relative py-12 md:py-20">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-background/25 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <Smartphone className="w-3.5 h-3.5" /> Android App
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-gradient-emergency opacity-25 blur-2xl" />
                <Logo className="relative w-24 h-24 rounded-2xl" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Download <span className="text-gradient-emergency">Jeevan Raksha</span>
            </h1>
            <p className="text-base sm:text-lg text-background/70 max-w-md mx-auto">
              India's women safety companion, now on your Android phone. One tap SOS, live location sharing, and real-time emergency alerts.
            </p>

            {/* Play Store Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a
                href={playStoreLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-background text-foreground hover:bg-background/90 transition-colors shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                  <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 8.109 8.109L7.36 23.96l.02-.02 7.12-7.12 3.609 3.609 1.36-1.36-3.609-3.609 7.12-7.12-.02-.02-10.14 4.167zM17.69 2.36l-8.109 8.109L3.61 4.498l14.08 7.421-3.609-3.609-1.36 1.36 3.609 3.609L17.69 2.36z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Get it on</div>
                  <div className="text-lg font-bold leading-none">Google Play</div>
                </div>
              </a>

              <Link to="/auth?mode=signup">
                <Button size="lg" className="h-12 px-6 bg-gradient-emergency shadow-emergency">
                  Use Web App <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-background/50">
              Play Store link will be active once the app is published. Until then, use the web app above.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why download?</p>
            <h2 className="text-2xl md:text-4xl font-bold leading-tight">
              Your personal safety companion, always with you.
            </h2>
            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* QR + Install steps */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-primary" />
              <h3 className="font-bold text-lg">Scan to open</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="bg-white p-3 rounded-2xl shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin)}`}
                  alt="QR code to open Jeevan Raksha web app"
                  className="w-32 h-32"
                />
              </div>
              <div className="space-y-4 flex-1">
                {steps.map((s, i) => (
                  <div key={s.title} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Permission note */}
      <section className="container pb-16">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <MapPin className="w-6 h-6 text-primary mx-auto mb-3" />
            <h4 className="font-semibold text-sm mb-1">Location</h4>
            <p className="text-xs text-muted-foreground">For live GPS sharing and safe zones.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <Smartphone className="w-6 h-6 text-primary mx-auto mb-3" />
            <h4 className="font-semibold text-sm mb-1">Microphone</h4>
            <p className="text-xs text-muted-foreground">For "Help Me" voice & sound detection.</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <Bell className="w-6 h-6 text-primary mx-auto mb-3" />
            <h4 className="font-semibold text-sm mb-1">Notifications</h4>
            <p className="text-xs text-muted-foreground">For alerts from guardians & safe zones.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-trust p-8 md:p-14 shadow-trust">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative max-w-xl mx-auto text-center">
            <Shield className="w-10 h-10 text-secondary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-secondary-foreground mb-3">
              Ready to feel safer?
            </h2>
            <p className="text-secondary-foreground/85 mb-7">
              Download the app or create a free account and start protecting yourself today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a
                href={playStoreLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-background text-foreground font-semibold hover:bg-background/90 transition-colors"
              >
                <Download className="w-5 h-5" /> Google Play
              </a>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="secondary" className="h-12 px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Create Free Account <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Jeevan Raksha · Protecting women, one tap at a time.
      </footer>
    </div>
  );
};

export default DownloadPage;
