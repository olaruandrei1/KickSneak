import { getSystemSettings, getBrands } from "./actions";
import SettingsClient from "@/components/SettingsClient";

export const revalidate = 0; // Disable caching to ensure fresh settings are loaded

export default async function SettingsPage() {
  const [settings, brands] = await Promise.all([
    getSystemSettings(),
    getBrands(),
  ]);

  return (
    <div className="page-container" style={{ padding: "0 0 2rem 0" }}>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Setări Platformă</h1>
        <p className="page-subtitle">Configurează comisioanele aplicate tranzacțiilor, activează modul de mentenanță și administrează setările globale ale aplicației KickSneak.</p>
      </div>
      <SettingsClient initialSettings={settings} brands={brands} />
    </div>
  );
}
