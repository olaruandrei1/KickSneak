"use client";

import { useState } from "react";
import { 
  Percent, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import { SystemSettings, saveSystemSettings } from "@/app/settings/actions";

interface Brand {
  Id: string;
  Name: string | null;
}

interface SettingsClientProps {
  initialSettings: SystemSettings;
  brands: Brand[];
}

export default function SettingsClient({ initialSettings, brands }: SettingsClientProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Simulation values for visual feedback
  const testSaleAmount = 1000;
  const calculatedCommission = (testSaleAmount * settings.commissionPercent) / 100;
  const calculatedBuyerFee = (testSaleAmount * settings.buyerFeePercent) / 100;
  const sellerReceives = testSaleAmount - calculatedCommission;
  const buyerPays = testSaleAmount + calculatedBuyerFee;

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBrandToggle = (brandId: string) => {
    setSettings((prev) => {
      const isFeatured = prev.featuredBrands.includes(brandId);
      const updatedBrands = isFeatured
        ? prev.featuredBrands.filter((id) => id !== brandId)
        : [...prev.featuredBrands, brandId];
      return {
        ...prev,
        featuredBrands: updatedBrands,
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const result = await saveSystemSettings(settings);

    setIsSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: result.message || "Setările au fost salvate!" });
      // Clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: "error", text: result.error || "A apărut o eroare la salvare." });
    }
  };

  return (
    <form onSubmit={handleSave} className="settings-container">
      {message && (
        <div className={`alert-banner ${message.type}`}>
          {message.type === "success" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Left Column: Fees & Maintenance */}
        <div className="settings-col">
          {/* Card 1: Comisioane */}
          <div className="glass-card settings-card">
            <div className="card-header-icon">
              <Percent size={20} className="icon-orange" />
              <h3>Comisioane Platformă</h3>
            </div>
            <p className="card-desc">Setează procentele reținute de la vânzători și taxele suplimentare percepute de la cumpărători.</p>

            <div className="form-group">
              <label className="form-label" htmlFor="commissionPercent">Comision Vânzător (%)</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  id="commissionPercent"
                  className="form-control"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commissionPercent}
                  onChange={(e) => handleInputChange("commissionPercent", parseFloat(e.target.value) || 0)}
                  required
                />
                <span className="suffix">%</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="buyerFeePercent">Taxă Serviciu Cumpărător (%)</label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  id="buyerFeePercent"
                  className="form-control"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.buyerFeePercent}
                  onChange={(e) => handleInputChange("buyerFeePercent", parseFloat(e.target.value) || 0)}
                  required
                />
                <span className="suffix">%</span>
              </div>
            </div>

            {/* Simulation Block */}
            <div className="simulation-box">
              <span className="sim-title">Simulare Tranzacție ({testSaleAmount} RON)</span>
              <div className="sim-row">
                <span>Cumpărătorul plătește ({settings.buyerFeePercent}% taxă):</span>
                <span className="text-secondary">{buyerPays.toFixed(2)} RON</span>
              </div>
              <div className="sim-row">
                <span>Vânzătorul primește ({settings.commissionPercent}% comision):</span>
                <span className="text-orange">{sellerReceives.toFixed(2)} RON</span>
              </div>
              <div className="sim-row final">
                <span>Profit Platformă (Total Taxe):</span>
                <span className="text-success">{(calculatedCommission + calculatedBuyerFee).toFixed(2)} RON</span>
              </div>
            </div>
          </div>

          {/* Card 2: Maintenance Mode */}
          <div className="glass-card settings-card">
            <div className="card-header-icon">
              <ShieldAlert size={20} className="icon-red" />
              <h3>Mod Mentenanță</h3>
            </div>
            <p className="card-desc">Blochează accesul public la aplicația magazinului pentru a efectua upgrade-uri sau modificări la baza de date.</p>

            <div className="maintenance-toggle-wrapper">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange("maintenanceMode", e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
              <div className="toggle-text">
                <span className="toggle-label">Activează Mentenanța</span>
                <span className="toggle-sub">Aplicația client va afișa un ecran de tip &quot;Mentenanță în curs&quot;.</span>
              </div>
            </div>

            {settings.maintenanceMode && (
              <div className="warning-box">
                <AlertTriangle size={18} />
                <span>Modul mentenanță este activ! Cumpărătorii nu pot plasa comenzi și vânzătorii nu pot adăuga stoc. Panoul de administrare rămâne accesibil.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Featured Brands & Terms */}
        <div className="settings-col">
          {/* Card 3: Featured Brands */}
          <div className="glass-card settings-card">
            <div className="card-header-icon">
              <Sparkles size={20} className="icon-cyan" />
              <h3>Branduri Recomandate</h3>
            </div>
            <p className="card-desc">Selectează brandurile afișate cu prioritate pe pagina principală a magazinului client.</p>

            <div className="brands-list-selector">
              {brands.map((brand) => {
                const isChecked = settings.featuredBrands.includes(brand.Id);
                return (
                  <label key={brand.Id} className={`brand-checkbox-card ${isChecked ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleBrandToggle(brand.Id)}
                    />
                    <span>{brand.Name}</span>
                  </label>
                );
              })}
              {brands.length === 0 && (
                <p className="no-brands-text">Nu s-au găsit branduri în baza de date. Adaugă-le mai întâi în Catalog.</p>
              )}
            </div>
            <div className="brands-counter">
              {settings.featuredBrands.length} branduri selectate ca recomandate.
            </div>
          </div>

          {/* Card 4: Terms & Conditions */}
          <div className="glass-card settings-card">
            <div className="card-header-icon">
              <FileText size={20} className="icon-purple" />
              <h3>Termeni și Condiții</h3>
            </div>
            <p className="card-desc">Editează textul de bază al termenilor legali afișați la înregistrarea utilizatorilor pe platformă.</p>

            <div className="form-group">
              <textarea
                className="form-control text-editor-area"
                rows={10}
                value={settings.termsAndConditions}
                onChange={(e) => handleInputChange("termsAndConditions", e.target.value)}
                placeholder="Introdu textul pentru Termeni și Condiții..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* Floating/Bottom Action Bar */}
      <div className="settings-actions-bar glass-card">
        <div className="bar-info">
          <span>Verifică setările cu atenție înainte de salvare.</span>
        </div>
        <button type="submit" disabled={isSaving} className="btn btn-primary btn-save">
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Se salvează...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Salvează Setările</span>
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.92rem;
          animation: fadeIn 0.3s ease;
          border: 1px solid transparent;
        }

        .alert-banner.success {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: var(--success);
        }

        .alert-banner.error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: var(--danger);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 968px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        .settings-col {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .settings-card {
          display: flex;
          flex-direction: column;
        }

        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .card-header-icon h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .card-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
        }

        .icon-orange { color: var(--primary-color); }
        .icon-red { color: var(--danger); }
        .icon-cyan { color: var(--secondary-color); }
        .icon-purple { color: var(--accent-color); }

        .input-with-suffix {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-suffix input {
          padding-right: 2.5rem;
        }

        .suffix {
          position: absolute;
          right: 1rem;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          pointer-events: none;
        }

        /* Simulation Box */
        .simulation-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1rem;
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .sim-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-main);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.4rem;
          margin-bottom: 0.2rem;
        }

        .sim-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .sim-row.final {
          border-top: 1px dashed var(--border-color);
          padding-top: 0.6rem;
          margin-top: 0.2rem;
          font-weight: 600;
        }

        .text-orange { color: var(--primary-color); }
        .text-secondary { color: var(--secondary-color); }
        .text-success { color: var(--success); }

        /* Switch toggle style */
        .maintenance-toggle-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.2rem;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 46px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.1);
          transition: .3s;
          border: 1px solid var(--border-color);
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
        }

        input:checked + .slider {
          background-color: var(--danger);
          border-color: rgba(239, 68, 68, 0.4);
        }

        input:checked + .slider:before {
          transform: translateX(22px);
        }

        .slider.round {
          border-radius: 24px;
        }

        .slider.round:before {
          border-radius: 50%;
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .toggle-label {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-main);
        }

        .toggle-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .warning-box {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-sm);
          color: #fca5a5;
          font-size: 0.82rem;
          line-height: 1.4;
        }

        .warning-box :global(svg) {
          flex-shrink: 0;
          color: var(--danger);
          margin-top: 0.1rem;
        }

        /* Brands selector style */
        .brands-list-selector {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 0.75rem;
        }

        .brand-checkbox-card {
          display: flex;
          align-items: center;
          padding: 0.4rem 0.8rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          user-select: none;
        }

        .brand-checkbox-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--border-hover);
        }

        .brand-checkbox-card.active {
          background: rgba(0, 240, 255, 0.1);
          border-color: rgba(0, 240, 255, 0.3);
          color: var(--secondary-color);
        }

        .brand-checkbox-card input {
          display: none;
        }

        .brands-counter {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: right;
        }

        .no-brands-text {
          font-size: 0.85rem;
          color: var(--text-dim);
          width: 100%;
          text-align: center;
          padding: 2rem 0;
        }

        .text-editor-area {
          font-family: inherit;
          resize: vertical;
          line-height: 1.5;
          font-size: 0.9rem;
        }

        /* Actions Bar */
        .settings-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          margin-top: 1rem;
          background: var(--glass-bg);
          border-color: var(--glass-border);
        }

        .bar-info {
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        .btn-save {
          padding: 0.75rem 2rem;
          font-size: 0.95rem;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
}
