/*
 * ReportPanel — Generate and print "SkyWave Intel Site Summary"
 * Professional PDF-quality report with site data, zoning, map captures
 */
import { useState, useCallback, useRef } from "react";
import { useSite, API_KEYS } from "@/contexts/SiteContext";
import { mapInstance } from "./MapCanvas";
import { X, FileText, Printer, Download, Loader2, MapPin, Building2, TreePine, Radio, Ruler } from "lucide-react";

interface ReportData {
  coords: string;
  elevation: string;
  radius: string;
  county: string;
  state: string;
  parcelInfo: Record<string, string>;
  zoningInfo: string;
  floodZone: string;
  wetlands: string;
  nearbyAirports: string;
  mapImageUrl: string;
  timestamp: string;
}

export function ReportPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { site } = useSite();
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = useCallback(async () => {
    if (!site) return;
    setGenerating(true);

    try {
      // Fetch parcel info from Regrid
      let parcelInfo: Record<string, string> = {};
      try {
        const parcelRes = await fetch(
          `https://app.regrid.com/api/v2/parcels/point?lat=${site.lat}&lon=${site.lon}&token=${API_KEYS.REGRID_TOKEN}&return_custom=false`
        );
        if (parcelRes.ok) {
          const parcelData = await parcelRes.json();
          const props = parcelData?.results?.[0]?.properties?.fields || {};
          parcelInfo = {
            'Owner': props.owner || 'N/A',
            'Address': props.address || props.mailadd || 'N/A',
            'APN': props.parcelnumb || 'N/A',
            'Acreage': props.ll_gisacre ? `${parseFloat(props.ll_gisacre).toFixed(2)} acres` : 'N/A',
            'Zoning': props.zoning || props.zoning_id || 'N/A',
            'Land Use': props.usecode || props.landuse || 'N/A',
            'County': props.county || 'N/A',
            'State': props.state2 || 'N/A',
            'Legal Desc': props.legaldesc || 'N/A',
          };
        }
      } catch (e) {
        console.warn('Regrid fetch failed:', e);
      }

      // Fetch elevation
      let elevation = 'N/A';
      try {
        const elevRes = await fetch(
          `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${site.lon},${site.lat}.json?layers=contour&access_token=${API_KEYS.MAPBOX_TOKEN}`
        );
        if (elevRes.ok) {
          const elevData = await elevRes.json();
          if (elevData.features?.length) {
            const maxElev = Math.max(...elevData.features.map((f: any) => f.properties.ele));
            elevation = `${Math.round(maxElev * 3.28084)} ft (${Math.round(maxElev)} m)`;
          }
        }
      } catch {}

      // Capture map screenshot
      let mapImageUrl = '';
      if (mapInstance) {
        mapImageUrl = mapInstance.getCanvas().toDataURL('image/png');
      }

      const data: ReportData = {
        coords: `${site.lat.toFixed(6)}, ${site.lon.toFixed(6)}`,
        elevation,
        radius: `${site.radiusMiles} miles`,
        county: parcelInfo['County'] || site.county || 'N/A',
        state: parcelInfo['State'] || site.state || 'N/A',
        parcelInfo,
        zoningInfo: parcelInfo['Zoning'] || 'See local municipality',
        floodZone: 'Check FEMA layer',
        wetlands: 'Check NWI layer',
        nearbyAirports: 'Check airports layer',
        mapImageUrl,
        timestamp: new Date().toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        }),
      };

      setReportData(data);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [site]);

  const handlePrint = useCallback(() => {
    if (!reportRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SkyWave Intel Site Summary</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; }
          .header { background: #0B1120; color: white; padding: 24px 32px; display: flex; align-items: center; gap: 16px; }
          .header img { height: 40px; }
          .header h1 { font-size: 20px; font-weight: 800; color: #f59e0b; }
          .header .subtitle { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
          .header .timestamp { margin-left: auto; font-size: 10px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
          .section { padding: 20px 32px; border-bottom: 1px solid #e2e8f0; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0B1120; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
          .section-title::before { content: ''; display: block; width: 3px; height: 16px; background: #f59e0b; border-radius: 2px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .field { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .field-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
          .field-value { font-size: 12px; font-weight: 600; color: #1e293b; font-family: 'JetBrains Mono', monospace; text-align: right; }
          .map-image { width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
          .footer { padding: 16px 32px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 2px solid #f59e0b; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${reportRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, []);

  return (
    <div
      className={`
        absolute top-14 right-14 z-20 w-[520px]
        glass-panel rounded-2xl overflow-hidden
        transition-all duration-300 ease-out
        ${open ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-4 pointer-events-none'}
      `}
      style={{ maxHeight: 'calc(100vh - 80px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber">Site Summary</span>
        </div>
        <div className="flex items-center gap-2">
          {reportData && (
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber/10 text-amber text-xs font-semibold hover:bg-amber/20 transition-colors">
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {!site ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <div className="text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Enter coordinates to generate a site summary</p>
            </div>
          </div>
        ) : !reportData ? (
          <div className="p-6 text-center">
            <button
              onClick={generateReport}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber text-navy font-bold text-sm hover:bg-amber/90 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gathering Intel...</>
              ) : (
                <><FileText className="w-4 h-4" /> Generate Site Summary</>
              )}
            </button>
            <p className="text-[10px] text-muted-foreground mt-3">
              Fetches parcel data from Regrid, elevation from Mapbox, and captures map imagery.
            </p>
          </div>
        ) : (
          /* Report preview */
          <div ref={reportRef}>
            {/* Print header */}
            <div className="header" style={{ background: '#0B1120', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/87610715/NPGBkWnUUSSKqFn2FdfTCY/skywave-icon-dVLiBsccZiieCnhuuqCXQH.webp" alt="" style={{ height: 36, borderRadius: 8 }} />
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', margin: 0 }}>SkyWave Intel Site Summary</h1>
                <p style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Site Candidate Information Package</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                {reportData.timestamp}
              </span>
            </div>

            {/* Site Location */}
            <div className="section" style={{ padding: '16px 24px', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <div className="section-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
                Site Location
              </div>
              <ReportField label="Coordinates" value={reportData.coords} />
              <ReportField label="Elevation" value={reportData.elevation} />
              <ReportField label="Search Radius" value={reportData.radius} />
              <ReportField label="County" value={reportData.county} />
              <ReportField label="State" value={reportData.state} />
            </div>

            {/* Parcel Information */}
            <div className="section" style={{ padding: '16px 24px', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <div className="section-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
                Parcel Information (Regrid)
              </div>
              {Object.entries(reportData.parcelInfo).map(([key, value]) => (
                <ReportField key={key} label={key} value={value} />
              ))}
            </div>

            {/* Environmental */}
            <div className="section" style={{ padding: '16px 24px', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              <div className="section-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
                Environmental & Zoning
              </div>
              <ReportField label="Zoning" value={reportData.zoningInfo} />
              <ReportField label="Flood Zone" value={reportData.floodZone} />
              <ReportField label="Wetlands" value={reportData.wetlands} />
              <ReportField label="Nearby Airports" value={reportData.nearbyAirports} />
            </div>

            {/* Map Image */}
            {reportData.mapImageUrl && (
              <div className="section" style={{ padding: '16px 24px', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="section-title" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
                  Site Map
                </div>
                <img src={reportData.mapImageUrl} alt="Site Map" style={{ width: '100%', borderRadius: 8, border: '1px solid oklch(1 0 0 / 10%)' }} />
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '12px 24px', textAlign: 'center', fontSize: 10, color: '#64748b', borderTop: '2px solid #f59e0b' }}>
              SkyWave Intel — Site Selection Platform | Confidential | Generated {reportData.timestamp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
