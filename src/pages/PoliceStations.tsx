import { NearbyPlacesPage } from "@/components/NearbyPlacesPage";

const PoliceStations = () => (
  <NearbyPlacesPage
    kind="police"
    title="Nearby Police Stations"
    subtitle="Live results around your current GPS location"
    accent="#dc2626"
  />
);

export default PoliceStations;
