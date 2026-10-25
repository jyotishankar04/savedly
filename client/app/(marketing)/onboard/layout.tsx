import { MaintenanceFullPage } from "@/components/maintenance/maintenance-full-page";
import { FORCED_MAINTENANCE, FORCED_MAINTENANCE_MESSAGE } from "@/lib/maintenance";

// Onboarding saves to the backend at every step: while maintenance is switched
// on in the website (the backend is down), it shows the maintenance page instead.
export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  if (FORCED_MAINTENANCE) return <MaintenanceFullPage message={FORCED_MAINTENANCE_MESSAGE} />;
  return children;
}
