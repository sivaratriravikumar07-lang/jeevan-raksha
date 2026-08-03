import { Link } from "react-router-dom";
import { Shield, Zap, MapPin, Mic, Bell, Users, AlertTriangle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";


const features = [
  { icon: Zap, title: "One-Tap SOS", desc: "Instantly alert your trusted circle with a single press." },
  { icon: MapPin, title: "Live GPS Sharing", desc: "Real-time location streamed to family and authorities." },
  { icon: Mic, title: "Voice Activation", desc: "Say \"Help Me\" and Jeevan Raksha takes action." },
  { icon: Bell, title: "Multi-Channel Alerts", desc: "Notifications via app, email, and push." },
  { icon: Users, title: "Trusted Contacts", desc: "Manage who gets alerted in an emergency." },
  { icon: Shield, title: "Police & Hospital Network", desc: "Direct routing to nearest verified responders." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between gap-2 h-16 min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <Logo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 shadow-emergency" />
            <span className="font-bold text-base sm:text-lg tracking-tight truncate">Jeevan Raksha</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link to="/auth"><Button variant="ghost" size="sm" className="px-2 sm:px-3">Login</Button></Link>
            <Link to="/auth?mode=signup"><Button size="sm" className="px-3 bg-gradient-emergency shadow-emergency">Sign Up</Button></Link>
          </div>
        </div>

      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container relative py-10 sm:py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
              <Heart className="w-3.5 h-3.5" /> India's Women Safety Companion
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight break-words">
              Safety in <span className="bg-gradient-emergency bg-clip-text text-transparent">one tap.</span>
              <br />
              Help in <span className="bg-gradient-trust bg-clip-text text-transparent">seconds.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Jeevan Raksha protects women with real-time SOS alerts, live GPS sharing, voice activation, and direct lines to police and hospitals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-emergency shadow-emergency text-base h-12 px-8">
                  <AlertTriangle className="w-5 h-5 mr-2" /> Get Protected Now
                </Button>
              </Link>
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8">Sign In</Button>
              </Link>
            </div>
          </div>

          {/* Brand mark + pulsing SOS preview */}
          <div className="flex flex-col items-center gap-8 mt-10 sm:mt-16">
            <Logo className="w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 rounded-3xl shadow-elevated" alt="Jeevan Raksha emergency response logo" />

            <div className="relative">
              <div className="w-48 h-48 rounded-full bg-gradient-emergency shadow-emergency flex items-center justify-center animate-sos-pulse">
                <div className="text-center text-primary-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-2" />
                  <div className="text-3xl font-extrabold tracking-wider">SOS</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for emergencies that can't wait</h2>
          <p className="text-muted-foreground">Every feature designed to reach help fast.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-gradient-card border border-border shadow-card hover:shadow-elevated transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-3xl bg-gradient-trust p-8 md:p-12 text-center shadow-trust">
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-foreground mb-3">Your safety, our promise.</h2>
          <p className="text-secondary-foreground/90 mb-6 max-w-xl mx-auto">Join thousands of women using Jeevan Raksha to stay protected, every day, everywhere.</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="h-12 px-8 bg-background text-foreground hover:bg-background/90">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Jeevan Raksha · Protecting women, one tap at a time.
      </footer>
    </div>
  );
};

export default Index;
