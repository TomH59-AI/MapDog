/*
 * DESIGN: "Mission Control" — Aerospace Command Center
 * Full-bleed map canvas with floating glass-morphic panels
 * Amber/gold on deep navy, JetBrains Mono for data
 */
import { useState, useCallback } from "react";
import { MapCanvas } from "@/components/map/MapCanvas";
import { CoordBar } from "@/components/map/CoordBar";
import { FeaturesPanel } from "@/components/map/FeaturesPanel";
import { InfoPanel } from "@/components/map/InfoPanel";
import { StyleSwitcher } from "@/components/map/StyleSwitcher";
import { ViewshedPanel } from "@/components/map/ViewshedPanel";
import { ReportPanel } from "@/components/map/ReportPanel";
import { useSite } from "@/contexts/SiteContext";
import { Layers, Eye, FileText, Radio } from "lucide-react";

export default function IntelMap() {
  const { activePanel, setActivePanel } = useSite();
  const [mapReady, setMapReady] = useState(false);

  const togglePanel = useCallback((panel: string) => {
    setActivePanel(activePanel === panel ? null : panel);
  }, [activePanel, setActivePanel]);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-background">
      {/* Map fills entire viewport */}
      <MapCanvas onReady={() => setMapReady(true)} />

      {/* Top gradient overlay for readability */}
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-[5]"
        style={{ background: 'linear-gradient(180deg, oklch(0.13 0.015 260 / 90%) 0%, oklch(0.13 0.015 260 / 50%) 60%, transparent 100%)' }}
      />

      {/* Top Bar: Logo + Coordinate Input */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-3 pb-1 flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/87610715/NPGBkWnUUSSKqFn2FdfTCY/skywave-icon-dVLiBsccZiieCnhuuqCXQH.webp"
            alt="SkyWave Intel"
            className="w-8 h-8 rounded-lg"
          />
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold tracking-tight text-amber">SkyWave</span>
            <span className="text-sm font-medium text-muted-foreground">Intel</span>
          </div>
        </div>
        <div className="pointer-events-auto flex-1 max-w-[740px]">
          <CoordBar />
        </div>
      </div>

      {/* Right toolbar buttons */}
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
        <ToolbarButton
          icon={<Layers className="w-4 h-4" />}
          label="Features"
          active={activePanel === 'features'}
          onClick={() => togglePanel('features')}
        />
        <ToolbarButton
          icon={<Eye className="w-4 h-4" />}
          label="3D View"
          active={activePanel === 'viewshed'}
          onClick={() => togglePanel('viewshed')}
        />
        <ToolbarButton
          icon={<FileText className="w-4 h-4" />}
          label="Report"
          active={activePanel === 'report'}
          onClick={() => togglePanel('report')}
        />
      </div>

      {/* Sliding Panels */}
      <FeaturesPanel open={activePanel === 'features'} onClose={() => setActivePanel(null)} />
      <ViewshedPanel open={activePanel === 'viewshed'} onClose={() => setActivePanel(null)} />
      <ReportPanel open={activePanel === 'report'} onClose={() => setActivePanel(null)} />

      {/* Bottom-left info panel */}
      <InfoPanel />

      {/* Bottom-right style switcher */}
      <StyleSwitcher />
    </div>
  );
}

function ToolbarButton({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
        transition-all duration-200 backdrop-blur-xl
        ${active
          ? 'glass-panel amber-glow text-amber border-amber/30'
          : 'glass-panel text-muted-foreground hover:text-foreground hover:border-foreground/20'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
