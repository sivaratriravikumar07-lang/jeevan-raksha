import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Emergency from "./pages/Emergency";
import Contacts from "./pages/Contacts";
import Nearby from "./pages/Nearby";
import History from "./pages/History";
import Responder from "./pages/Responder";
import FakeCall from "./pages/FakeCall";
import PoliceStations from "./pages/PoliceStations";
import Hospitals from "./pages/Hospitals";
import Profile from "./pages/Profile";
import SafetyTips from "./pages/SafetyTips";
import ShareLocation from "./pages/ShareLocation";
import TrackLocation from "./pages/TrackLocation";
import Journey from "./pages/Journey";
import WomenSafety from "./pages/WomenSafety";
import OfflineSOS from "./pages/OfflineSOS";
import Evidence from "./pages/Evidence";
import MicTest from "./pages/MicTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/nearby" element={<ProtectedRoute><Nearby /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/responder" element={<ProtectedRoute><Responder /></ProtectedRoute>} />
            <Route path="/fake-call" element={<ProtectedRoute><FakeCall /></ProtectedRoute>} />
            <Route path="/police-stations" element={<ProtectedRoute><PoliceStations /></ProtectedRoute>} />
            <Route path="/hospitals" element={<ProtectedRoute><Hospitals /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/safety-tips" element={<ProtectedRoute><SafetyTips /></ProtectedRoute>} />
            <Route path="/share-location" element={<ProtectedRoute><ShareLocation /></ProtectedRoute>} />
            <Route path="/track/:token" element={<TrackLocation />} />
            <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
            <Route path="/women-safety" element={<ProtectedRoute><WomenSafety /></ProtectedRoute>} />
            <Route path="/offline-sos" element={<ProtectedRoute><OfflineSOS /></ProtectedRoute>} />
            <Route path="/evidence" element={<ProtectedRoute><Evidence /></ProtectedRoute>} />
            <Route path="/mic-test" element={<ProtectedRoute><MicTest /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
