import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const sections = [
  ["Who we are", "Jeevan Raksha is an emergency safety app for women, elders and children in India. It helps you alert trusted contacts, police and nearby volunteers in an emergency."],
  ["Information we collect", "Account details (name, email, phone), emergency contacts you add, your location when you trigger SOS, share live location, use Safe Journey or Safe Zones, incident history, Medical ID details you choose to save, and evidence files you choose to record."],
  ["Location", "Location is used only to send your Google Maps link to your emergency contacts, show nearby police stations and hospitals, alert nearby volunteers during an SOS, and power live tracking links you share. Background location is used only while a safety feature you turned on is active."],
  ["Microphone", "When Voice Protection Mode is ON, the microphone listens on your device for emergency words like \"Help Me\". Voice is processed on the device. Audio is not recorded, stored or uploaded by this feature. You can turn it off any time."],
  ["SMS and phone calls", "When an SOS is triggered, the app sends an SMS with your location to your saved emergency contacts and can call an emergency number (112 / 100). These are used only for emergency alerts."],
  ["Sharing", "We share your location and name only with the people involved in your emergency: your emergency contacts, and a nearby volunteer who accepts your request. We never sell your data or use it for advertising."],
  ["Storage and security", "Data is stored securely on our cloud servers with access rules so only you (and the people you choose) can see your information."],
  ["Your choices", "You can edit or delete your contacts, Medical ID and evidence, turn off any safety feature, and change permissions in your phone settings. To delete your account and data, contact us."],
  ["Children", "Child Safety features are meant to be set up by a parent or guardian."],
  ["Contact", "For privacy questions or data deletion requests, contact the Jeevan Raksha team through the app's download page."],
];

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <header className="bg-gradient-trust text-secondary-foreground">
      <div className="container py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm opacity-90 mb-3"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm opacity-80 mt-1">Last updated: October 2026</p>
      </div>
    </header>
    <main className="container py-6 space-y-5 max-w-2xl">
      {sections.map(([h, p]) => (
        <section key={h}>
          <h2 className="font-bold mb-1">{h}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{p}</p>
        </section>
      ))}
    </main>
  </div>
);

export default Privacy;
