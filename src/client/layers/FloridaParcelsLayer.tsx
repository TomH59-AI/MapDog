import React, { useState, useEffect } from 'react'
import { GeoJSON } from 'react-leaflet'

/**
 * Florida Parcel Data Layer
 *
 * Data Source: Florida Geographic Data Library (FGDL)
 * - University of Florida GeoPlan Center
 * - Florida Department of Revenue
 * - County Property Appraisers
 *
 * Total Parcels: 10,803,218 statewide (2023)
 * Coordinate System: EPSG:3087 (Florida Albers) - converted to WGS84
 *
 * Download: https://www.fgdl.org/
 * Contact: Kate Norris, data@fgdl.org
 *
 * Fields available:
 * - PARCELID, ALTKEY, NPARNO
 * - ONAME (Owner name)
 * - OADDR1, OADDR2, OCITY, OSTATE, OZIPCD (Owner address)
 * - PHYADDR1, PHYADDR2, PHYCITY, PHYZIP (Physical/site address)
 * - SEC, TWN, RNG (Section/Township/Range)
 * - DORUC/LUCODE (Land use code)
 * - PARUSEDESC (Land use description)
 * - JV (Just Value / Market Value)
 * - LND_VAL (Land Value)
 * - IMPROVVAL (Improvement Value)
 * - ACRES
 * - ACTYRBLT, EFFYRBLT (Year built)
 * - SLEGAL (Short legal description)
 */

interface FloridaParcelsLayerProps {
  visible?: boolean
  opacity?: number
  county?: string // Filter by county name
}

// Florida county codes (FIPS)
const FL_COUNTIES: Record<string, string> = {
  'ALACHUA': '001', 'BAKER': '003', 'BAY': '005', 'BRADFORD': '007',
  'BREVARD': '009', 'BROWARD': '011', 'CALHOUN': '013', 'CHARLOTTE': '015',
  'CITRUS': '017', 'CLAY': '019', 'COLLIER': '021', 'COLUMBIA': '023',
  'DESOTO': '027', 'DIXIE': '029', 'DUVAL': '031', 'ESCAMBIA': '033',
  'FLAGLER': '035', 'FRANKLIN': '037', 'GADSDEN': '039', 'GILCHRIST': '041',
  'GLADES': '043', 'GULF': '045', 'HAMILTON': '047', 'HARDEE': '049',
  'HENDRY': '051', 'HERNANDO': '053', 'HIGHLANDS': '055', 'HILLSBOROUGH': '057',
  'HOLMES': '059', 'INDIAN RIVER': '061', 'JACKSON': '063', 'JEFFERSON': '065',
  'LAFAYETTE': '067', 'LAKE': '069', 'LEE': '071', 'LEON': '073',
  'LEVY': '075', 'LIBERTY': '077', 'MADISON': '079', 'MANATEE': '081',
  'MARION': '083', 'MARTIN': '085', 'MIAMI-DADE': '086', 'MONROE': '087',
  'NASSAU': '089', 'OKALOOSA': '091', 'OKEECHOBEE': '093', 'ORANGE': '095',
  'OSCEOLA': '097', 'PALM BEACH': '099', 'PASCO': '101', 'PINELLAS': '103',
  'POLK': '105', 'PUTNAM': '107', 'SANTA ROSA': '113', 'SARASOTA': '115',
  'SEMINOLE': '117', 'ST. JOHNS': '109', 'ST. LUCIE': '111', 'SUMTER': '119',
  'SUWANNEE': '121', 'TAYLOR': '123', 'UNION': '125', 'VOLUSIA': '127',
  'WAKULLA': '129', 'WALTON': '131', 'WASHINGTON': '133'
}

// FDOR Land Use Codes
const DORUC_CODES: Record<string, { name: string; color: string }> = {
  '001': { name: 'Single Family Residential', color: '#fef08a' },
  '002': { name: 'Mobile Homes', color: '#fde047' },
  '003': { name: 'Multi-Family (10+ units)', color: '#facc15' },
  '004': { name: 'Condominiums', color: '#eab308' },
  '005': { name: 'Cooperatives', color: '#ca8a04' },
  '006': { name: 'Retirement Homes', color: '#a16207' },
  '007': { name: 'Miscellaneous Residential', color: '#854d0e' },
  '008': { name: 'Multi-Family (< 10 units)', color: '#fbbf24' },
  '010': { name: 'Vacant Commercial', color: '#fed7aa' },
  '011': { name: 'Stores, One Story', color: '#fdba74' },
  '012': { name: 'Mixed Use (Store+Office)', color: '#fb923c' },
  '013': { name: 'Department Stores', color: '#f97316' },
  '014': { name: 'Supermarkets', color: '#ea580c' },
  '015': { name: 'Regional Shopping Centers', color: '#c2410c' },
  '016': { name: 'Community Shopping Centers', color: '#9a3412' },
  '017': { name: 'Office Buildings (1-Story)', color: '#7c2d12' },
  '018': { name: 'Office Buildings (Multi)', color: '#f97316' },
  '019': { name: 'Professional Services', color: '#fb923c' },
  '020': { name: 'Airports/Marinas/Bus Terminals', color: '#a855f7' },
  '021': { name: 'Restaurants/Cafeterias', color: '#f97316' },
  '022': { name: 'Drive-in Restaurants', color: '#fb923c' },
  '023': { name: 'Financial Institutions', color: '#3b82f6' },
  '024': { name: 'Insurance Company Offices', color: '#60a5fa' },
  '025': { name: 'Repair Service Shops', color: '#94a3b8' },
  '026': { name: 'Service Stations', color: '#f59e0b' },
  '027': { name: 'Auto Sales/Repair', color: '#d97706' },
  '028': { name: 'Parking Lots/Garages', color: '#64748b' },
  '029': { name: 'Wholesale/Manufacturing Outlets', color: '#8b5cf6' },
  '030': { name: 'Florist/Greenhouses', color: '#22c55e' },
  '031': { name: 'Drive-in Theaters', color: '#a855f7' },
  '032': { name: 'Enclosed Theaters', color: '#9333ea' },
  '033': { name: 'Nightclubs/Bars', color: '#7c3aed' },
  '034': { name: 'Bowling Alleys/Skating Rinks', color: '#6366f1' },
  '035': { name: 'Tourist Attractions', color: '#ec4899' },
  '036': { name: 'Camps', color: '#22c55e' },
  '037': { name: 'Race Tracks', color: '#ef4444' },
  '038': { name: 'Golf Courses', color: '#16a34a' },
  '039': { name: 'Hotels/Motels', color: '#0ea5e9' },
  '040': { name: 'Vacant Industrial', color: '#e2e8f0' },
  '041': { name: 'Light Manufacturing', color: '#c084fc' },
  '042': { name: 'Heavy Manufacturing', color: '#a855f7' },
  '043': { name: 'Lumber Yards', color: '#8b5cf6' },
  '044': { name: 'Packing Plants', color: '#7c3aed' },
  '045': { name: 'Bottling Plants', color: '#6d28d9' },
  '046': { name: 'Food Processing', color: '#5b21b6' },
  '047': { name: 'Mineral Processing', color: '#4c1d95' },
  '048': { name: 'Warehousing/Distribution', color: '#9333ea' },
  '049': { name: 'Open Storage', color: '#a78bfa' },
  '050': { name: 'Vacant Ag. Improved', color: '#bbf7d0' },
  '051': { name: 'Cropland - Soil Class 1', color: '#86efac' },
  '052': { name: 'Cropland - Soil Class 2', color: '#4ade80' },
  '053': { name: 'Cropland - Soil Class 3', color: '#22c55e' },
  '054': { name: 'Timberland - Site Index 90+', color: '#166534' },
  '055': { name: 'Timberland - Site Index 80-89', color: '#15803d' },
  '056': { name: 'Timberland - Site Index 70-79', color: '#16a34a' },
  '057': { name: 'Timberland - Site Index 60-69', color: '#22c55e' },
  '058': { name: 'Timberland - Site Index 50-59', color: '#4ade80' },
  '060': { name: 'Grazing Land - Soil Class 1', color: '#a3e635' },
  '061': { name: 'Grazing Land - Soil Class 2', color: '#84cc16' },
  '062': { name: 'Grazing Land - Soil Class 3', color: '#65a30d' },
  '063': { name: 'Grazing Land - Soil Class 4', color: '#4d7c0f' },
  '064': { name: 'Grazing Land - Soil Class 5', color: '#3f6212' },
  '065': { name: 'Grazing Land - Soil Class 6', color: '#365314' },
  '066': { name: 'Orchard/Groves - Soil Class 1', color: '#fb923c' },
  '067': { name: 'Orchard/Groves - Soil Class 2', color: '#f97316' },
  '068': { name: 'Orchard/Groves - Soil Class 3', color: '#ea580c' },
  '069': { name: 'Ornamentals/Misc. Ag.', color: '#10b981' },
  '070': { name: 'Vacant Institutional', color: '#e0f2fe' },
  '071': { name: 'Churches', color: '#7dd3fc' },
  '072': { name: 'Private Schools', color: '#38bdf8' },
  '073': { name: 'Private Hospitals', color: '#0ea5e9' },
  '074': { name: 'Homes for Aged', color: '#0284c7' },
  '075': { name: 'Orphanages', color: '#0369a1' },
  '076': { name: 'Mortuaries/Cemeteries', color: '#075985' },
  '077': { name: 'Clubs/Lodges/Union Halls', color: '#0c4a6e' },
  '078': { name: 'Sanitariums/Convalescent', color: '#0ea5e9' },
  '079': { name: 'Cultural Organizations', color: '#38bdf8' },
  '080': { name: 'Undefined', color: '#94a3b8' },
  '081': { name: 'Military', color: '#64748b' },
  '082': { name: 'Forest/Parks/Rec (Fed)', color: '#166534' },
  '083': { name: 'Public County Schools', color: '#0ea5e9' },
  '084': { name: 'Colleges', color: '#0284c7' },
  '085': { name: 'Hospitals (Public)', color: '#ef4444' },
  '086': { name: 'County (Other)', color: '#94a3b8' },
  '087': { name: 'State (Other)', color: '#64748b' },
  '088': { name: 'Federal (Other)', color: '#475569' },
  '089': { name: 'Municipal (Other)', color: '#334155' },
  '090': { name: 'Leasehold Interests', color: '#e2e8f0' },
  '091': { name: 'Utility/Gas/Electric', color: '#f59e0b' },
  '092': { name: 'Mining/Petroleum', color: '#78350f' },
  '093': { name: 'Subsurface Rights', color: '#451a03' },
  '094': { name: 'Rights-of-Way/Streets/Roads', color: '#9ca3af' },
  '095': { name: 'Rivers/Lakes/Submerged', color: '#0ea5e9' },
  '097': { name: 'Outdoor Recreation', color: '#22c55e' },
  '098': { name: 'Centrally Assessed', color: '#f59e0b' },
  '099': { name: 'Acreage Not Zoned Ag', color: '#d1d5db' },
  '100': { name: 'Unknown/Unclassified', color: '#e5e7eb' },
  '101': { name: 'Right-of-Way', color: '#9ca3af' },
  '102': { name: 'Water Bodies', color: '#38bdf8' },
  '103': { name: 'Rail', color: '#6b7280' },
  '999': { name: 'No Data', color: '#f3f4f6' }
}

export default function FloridaParcelsLayer({
  visible = true,
  opacity = 0.5,
  county
}: FloridaParcelsLayerProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return

    setLoading(true)
    setError(null)

    // Load county-specific or statewide data
    const filename = county
      ? `/data/fl-parcels-${county.toLowerCase().replace(/\s+/g, '-')}.geojson`
      : '/data/fl-parcels.geojson'

    fetch(filename)
      .then(res => {
        if (!res.ok) throw new Error(`Florida parcel data not available: ${filename}`)
        return res.json()
      })
      .then(geojson => {
        setData(geojson)
        setLoading(false)
      })
      .catch(err => {
        console.log('Florida parcel data not loaded:', err.message)
        setError(err.message)
        setLoading(false)
      })
  }, [visible, county])

  if (!visible || !data) return null

  const getStyle = (feature: any) => {
    const lucode = feature?.properties?.DORUC ||
                   feature?.properties?.LUCODE ||
                   feature?.properties?.OLD_LUCODE ||
                   '100'

    const codeInfo = DORUC_CODES[lucode] || DORUC_CODES['100']

    return {
      fillColor: codeInfo.color,
      weight: 1,
      opacity: 0.8,
      color: '#1e40af',
      fillOpacity: opacity
    }
  }

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const p = feature.properties || {}

    // Format values
    const formatCurrency = (val: any) => val ? `$${Number(val).toLocaleString()}` : '-'
    const lucode = p.DORUC || p.LUCODE || p.OLD_LUCODE || '100'
    const landUse = DORUC_CODES[lucode]?.name || p.PARUSEDESC || 'Unknown'

    const popupContent = `
      <div class="p-2 min-w-[280px] max-h-[400px] overflow-y-auto">
        <h3 class="font-bold text-lg text-blue-800 mb-2 border-b pb-1">
          ${p.PARCELID || p.NPARNO || 'Unknown Parcel'}
        </h3>

        <div class="mb-3">
          <h4 class="font-semibold text-gray-700">Owner</h4>
          <p class="text-sm">${p.ONAME || '-'}</p>
          <p class="text-xs text-gray-600">
            ${[p.OADDR1, p.OADDR2].filter(Boolean).join(' ')}<br/>
            ${[p.OCITY, p.OSTATE, p.OZIPCD].filter(Boolean).join(', ')}
          </p>
        </div>

        <div class="mb-3">
          <h4 class="font-semibold text-gray-700">Site Address</h4>
          <p class="text-sm">
            ${[p.PHYADDR1, p.PHYADDR2].filter(Boolean).join(' ') || '-'}<br/>
            ${[p.PHYCITY, 'FL', p.PHYZIP].filter(Boolean).join(', ')}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span class="font-semibold">Land Use:</span><br/>
            <span class="text-xs">${lucode} - ${landUse}</span>
          </div>
          <div>
            <span class="font-semibold">Acres:</span><br/>
            ${p.ACRES ? Number(p.ACRES).toFixed(2) : '-'}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span class="font-semibold">Just Value:</span><br/>
            ${formatCurrency(p.JV)}
          </div>
          <div>
            <span class="font-semibold">Land Value:</span><br/>
            ${formatCurrency(p.LND_VAL)}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span class="font-semibold">Year Built:</span><br/>
            ${p.ACTYRBLT || p.EFFYRBLT || '-'}
          </div>
          <div>
            <span class="font-semibold">S/T/R:</span><br/>
            ${[p.SEC, p.TWN, p.RNG].filter(Boolean).join('/') || '-'}
          </div>
        </div>

        ${p.SLEGAL ? `
        <div class="mb-2">
          <span class="font-semibold text-sm">Legal:</span>
          <p class="text-xs text-gray-600">${p.SLEGAL}</p>
        </div>
        ` : ''}

        <p class="text-xs text-gray-400 mt-2 pt-2 border-t">
          Source: FGDL / FL Dept of Revenue (2023)
        </p>
      </div>
    `
    layer.bindPopup(popupContent, { maxWidth: 350 })
  }

  return (
    <GeoJSON
      key={`fl-parcels-${county || 'all'}`}
      data={data}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  )
}

// Export utility for converting FGDL data
export { FL_COUNTIES, DORUC_CODES }
