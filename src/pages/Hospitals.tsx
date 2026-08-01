import { NearbyPlacesPage } from "@/components/NearbyPlacesPage";

const Hospitals = () => (
  <NearbyPlacesPage
    kind="hospital"
    title="Nearby Hospitals"
    subtitle="Live results around your current GPS location"
    accent="#0ea5e9"
    showOpenStatus
  />
);

export default Hospitals;
