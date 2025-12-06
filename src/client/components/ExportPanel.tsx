import React from 'react'
import * as XLSX from 'xlsx'
import type { Parcel } from '../App'

interface ExportPanelProps {
  parcels: Parcel[]
}

export default function ExportPanel({ parcels }: ExportPanelProps) {
  // Export to CSV
  const exportCSV = () => {
    if (parcels.length === 0) {
      alert('No parcels to export')
      return
    }

    const headers = [
      'PIN', 'County', 'Owner', 'Address', 'City', 'Zipcode',
      'Acres (GIS)', 'Acres (Deed)', 'Zoning', 'Land Use',
      'Market Value', 'Assessed Value', 'Year Built', 'Property Link'
    ]

    const rows = parcels.map(p => [
      p.identifiers?.pin || '',
      p.meta?.county || '',
      p.owner?.primary_name || '',
      p.site?.address || p.owner?.address_line1 || '',
      p.site?.city || p.owner?.city || '',
      p.site?.zipcode || p.owner?.zipcode || '',
      p.land?.acres_gis || '',
      p.land?.acres_deed || '',
      p.land?.zoning || '',
      p.land?.land_use?.luse_desc || '',
      p.valuation?.market?.total || '',
      p.valuation?.assessed_total || '',
      p.building?.year_built_actual || '',
      p.meta?.pa_pin_link || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    downloadFile(csv, `mapdog-parcels-${Date.now()}.csv`, 'text/csv')
    alert(`Exported ${parcels.length} parcels to CSV`)
  }

  // Export to GeoJSON
  const exportGeoJSON = () => {
    if (parcels.length === 0) {
      alert('No parcels to export')
      return
    }

    const geojson = {
      type: 'FeatureCollection',
      features: parcels.map(p => ({
        type: 'Feature',
        properties: {
          pin: p.identifiers?.pin || '',
          parcelid: p.parcelid || '',
          county: p.meta?.county || '',
          owner: p.owner?.primary_name || '',
          address: p.site?.address || p.owner?.address_line1 || '',
          city: p.site?.city || p.owner?.city || '',
          zipcode: p.site?.zipcode || p.owner?.zipcode || '',
          acres_gis: p.land?.acres_gis || null,
          acres_deed: p.land?.acres_deed || null,
          zoning: p.land?.zoning || '',
          land_use: p.land?.land_use?.luse_desc || '',
          market_value: p.valuation?.market?.total || null,
          assessed_value: p.valuation?.assessed_total || null,
          year_built: p.building?.year_built_actual || null,
          property_link: p.meta?.pa_pin_link || ''
        },
        geometry: p.geometry || null
      }))
    }

    const json = JSON.stringify(geojson, null, 2)
    downloadFile(json, `mapdog-parcels-${Date.now()}.geojson`, 'application/geo+json')

    const withGeometry = parcels.filter(p => p.geometry).length
    alert(`Exported ${parcels.length} parcels to GeoJSON (${withGeometry} with geometry)`)
  }

  // Export to XLSX (Excel)
  const exportXLSX = () => {
    if (parcels.length === 0) {
      alert('No parcels to export')
      return
    }

    const data = parcels.map(p => ({
      'PIN': p.identifiers?.pin || '',
      'County': p.meta?.county || '',
      'Owner': p.owner?.primary_name || '',
      'Address': p.site?.address || p.owner?.address_line1 || '',
      'City': p.site?.city || p.owner?.city || '',
      'Zipcode': p.site?.zipcode || p.owner?.zipcode || '',
      'Acres (GIS)': p.land?.acres_gis || '',
      'Acres (Deed)': p.land?.acres_deed || '',
      'Zoning': p.land?.zoning || '',
      'Land Use': p.land?.land_use?.luse_desc || '',
      'Market Value': p.valuation?.market?.total || '',
      'Assessed Value': p.valuation?.assessed_total || '',
      'Year Built': p.building?.year_built_actual || '',
      'Property Link': p.meta?.pa_pin_link || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Parcels')
    XLSX.writeFile(wb, `mapdog-parcels-${Date.now()}.xlsx`)

    alert(`Exported ${parcels.length} parcels to Excel`)
  }

  // Export to SCIP format (Site Candidate Information Package)
  const exportSCIP = () => {
    if (parcels.length === 0) {
      alert('No parcels to export')
      return
    }

    // SCIP format for wireless site acquisition
    const scipData = parcels.map((p, index) => ({
      'Site ID': `SITE-${String(index + 1).padStart(4, '0')}`,
      'Site Name': `${p.meta?.county || 'Unknown'}-${p.identifiers?.pin || index}`,
      'Status': 'Candidate',
      'Property Type': p.land?.land_use?.luse_desc || 'Unknown',
      'Zoning': p.land?.zoning || '',
      'PIN/APN': p.identifiers?.pin || '',
      'County': p.meta?.county || '',
      'State': detectState(p.meta?.county || ''),
      'Street Address': p.site?.address || p.owner?.address_line1 || '',
      'City': p.site?.city || p.owner?.city || '',
      'Zip': p.site?.zipcode || p.owner?.zipcode || '',
      'Owner Name': p.owner?.primary_name || '',
      'Owner Address': p.owner?.address_line1 || '',
      'Owner City': p.owner?.city || '',
      'Owner Zip': p.owner?.zipcode || '',
      'Parcel Size (Acres)': p.land?.acres_gis || p.land?.acres_deed || '',
      'Assessed Value': p.valuation?.assessed_total || '',
      'Market Value': p.valuation?.market?.total || '',
      'Year Built': p.building?.year_built_actual || '',
      'Has Geometry': p.geometry ? 'Yes' : 'No',
      'Source': 'MapDog/MapWise',
      'Export Date': new Date().toISOString().split('T')[0],
      'Notes': ''
    }))

    const ws = XLSX.utils.json_to_sheet(scipData)

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
      { wch: 18 }, { wch: 15 }, { wch: 6 }, { wch: 30 }, { wch: 15 },
      { wch: 10 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SCIP Export')

    // Add summary sheet
    const summaryData = [
      { 'Field': 'Total Sites', 'Value': parcels.length },
      { 'Field': 'Export Date', 'Value': new Date().toISOString() },
      { 'Field': 'Source', 'Value': 'MapDog Parcel Intelligence' },
      { 'Field': 'Counties', 'Value': [...new Set(parcels.map(p => p.meta?.county))].join(', ') },
      { 'Field': 'Sites with Geometry', 'Value': parcels.filter(p => p.geometry).length }
    ]
    const summaryWs = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    XLSX.writeFile(wb, `SCIP-export-${Date.now()}.xlsx`)
    alert(`Exported ${parcels.length} sites to SCIP format`)
  }

  // Helper to detect state from county name
  const detectState = (county: string): string => {
    const nc = ['WAKE', 'MECKLENBURG', 'GUILFORD', 'DURHAM', 'FORSYTH', 'CUMBERLAND', 'BUNCOMBE', 'GASTON']
    const ga = ['FULTON', 'GWINNETT', 'COBB', 'DEKALB', 'CHATHAM', 'RICHMOND', 'MUSCOGEE']
    const fl = ['MIAMI-DADE', 'BROWARD', 'PALM BEACH', 'HILLSBOROUGH', 'ORANGE', 'ALACHUA']

    const upper = county.toUpperCase()
    if (nc.some(c => upper.includes(c))) return 'NC'
    if (ga.some(c => upper.includes(c))) return 'GA'
    if (fl.some(c => upper.includes(c))) return 'FL'
    return ''
  }

  // Helper to download file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportOptions = [
    { id: 'csv', label: 'CSV', icon: 'fa-file-csv', color: 'orange', action: exportCSV },
    { id: 'geojson', label: 'GeoJSON', icon: 'fa-globe', color: 'teal', action: exportGeoJSON },
    { id: 'xlsx', label: 'Excel', icon: 'fa-file-excel', color: 'green', action: exportXLSX },
    { id: 'scip', label: 'SCIP', icon: 'fa-broadcast-tower', color: 'purple', action: exportSCIP }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        <i className="fas fa-download mr-2 text-blue-600"></i>
        Export Data
      </h3>

      {parcels.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          Search for parcels to enable export
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            {parcels.length} parcels ready to export
          </p>

          {exportOptions.map(opt => (
            <button
              key={opt.id}
              onClick={opt.action}
              className={`w-full py-3 px-4 bg-${opt.color}-600 hover:bg-${opt.color}-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2`}
              style={{
                backgroundColor: opt.color === 'orange' ? '#ea580c' :
                                 opt.color === 'teal' ? '#0d9488' :
                                 opt.color === 'green' ? '#16a34a' :
                                 opt.color === 'purple' ? '#9333ea' : undefined
              }}
            >
              <i className={`fas ${opt.icon}`}></i>
              Export {opt.label}
            </button>
          ))}

          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Format Info:</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li><strong>CSV:</strong> Universal spreadsheet format</li>
              <li><strong>GeoJSON:</strong> For GIS/mapping software</li>
              <li><strong>Excel:</strong> Full formatting support</li>
              <li><strong>SCIP:</strong> Site Candidate Info Package</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
