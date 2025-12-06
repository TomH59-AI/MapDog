/**
 * SCIP Generator Workspace
 * Dedicated environment for building Site Candidate Information Packages
 */
import React, { useState, useEffect } from 'react'
import scipData, { populateFromSearchRing, populateFromParcel, toJSON } from '../scipSchema'
import { exportSCIPXLSX } from '../xlsxExport'

export default function SCIPWorkspace() {
  // Search Ring state
  const [siteName, setSiteName] = useState(scipData.search_ring.site_name)
  const [latitude, setLatitude] = useState(scipData.search_ring.latitude)
  const [longitude, setLongitude] = useState(scipData.search_ring.longitude)
  const [radius, setRadius] = useState(scipData.search_ring.search_radius || '0.5')
  const [sarfHeight, setSarfHeight] = useState(scipData.search_ring.sarf_height)
  const [sarfRef, setSarfRef] = useState(scipData.search_ring.sarf)

  // UI state
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(scipData.lastUpdated)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Sync lastUpdated from scipData
  useEffect(() => {
    const interval = setInterval(() => {
      if (scipData.lastUpdated !== lastUpdated) {
        setLastUpdated(scipData.lastUpdated)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [lastUpdated])

  // Trigger lookups for coordinates
  const triggerLookups = async () => {
    if (!latitude || !longitude) {
      setError('Please enter latitude and longitude')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    // Update search ring in schema
    populateFromSearchRing({
      siteName: siteName || `Site ${latitude}, ${longitude}`,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseFloat(radius)
    })

    // Update SARF fields
    scipData.search_ring.sarf_height = sarfHeight
    scipData.search_ring.sarf = sarfRef

    try {
      // Call coordinate search API
      const response = await fetch('/api/parcels/coordinate-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: latitude,
          lon: longitude,
          radius: radius,
          unit: 'miles',
          county: '' // Will auto-detect
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const parcels = data.results || []

      if (parcels.length > 0) {
        populateFromParcel(parcels[0])
        setSuccess(`Found ${parcels.length} parcels. Auto-filled from closest parcel.`)
      } else {
        setSuccess('Search complete. No parcels found in radius.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  // Copy JSON to clipboard
  const copyJSON = () => {
    navigator.clipboard.writeText(toJSON())
    setSuccess('JSON copied to clipboard!')
    setTimeout(() => setSuccess(''), 2000)
  }

  // Export to Excel
  const exportExcel = () => {
    const filename = siteName
      ? `SCIP_${siteName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`
      : `SCIP_Package_${Date.now()}.xlsx`
    exportSCIPXLSX(filename)
    setSuccess('Excel exported!')
    setTimeout(() => setSuccess(''), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-broadcast-tower"></i>
          On-Air SCIP Generator Workspace
        </h1>
        <p className="mt-2 text-blue-100">
          Build Site Candidate Information Packages with auto-filled data from map layers
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">RF Coordinates</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Parcel Lookups</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Floodplain</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Airport</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Zoning</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Excel Export</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Search Ring Input */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-crosshairs text-red-500"></i>
            Search Ring Input
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g., Emerald Lake"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="27.89845"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-80.59092"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius (mi)</label>
                <input
                  type="text"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="0.5"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SARF Height (ft)</label>
                <input
                  type="text"
                  value={sarfHeight}
                  onChange={(e) => setSarfHeight(e.target.value)}
                  placeholder="199"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SARF Reference</label>
              <input
                type="text"
                value={sarfRef}
                onChange={(e) => setSarfRef(e.target.value)}
                placeholder="SARF document reference"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={triggerLookups}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Running Lookups...</>
              ) : (
                <><i className="fas fa-search-location"></i> Trigger Lookups</>
              )}
            </button>
          </div>
        </div>

        {/* Auto-Filled Fields */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-magic text-purple-500"></i>
            Auto-Filled Fields
          </h2>

          <div className="space-y-3 text-sm">
            <FieldDisplay label="Parcel ID" value={scipData.site_info.parcel_id} />
            <FieldDisplay label="Owner Name" value={scipData.site_info.owner_name} />
            <FieldDisplay label="Street Address" value={scipData.site_info.street_address} />
            <FieldDisplay label="City, State, ZIP" value={`${scipData.site_info.city}, ${scipData.site_info.state} ${scipData.site_info.zip}`} />
            <FieldDisplay label="Parcel Size (acres)" value={scipData.site_info.parcel_size_acres} />
            <FieldDisplay label="Flood Zone" value={scipData.existing_conditions.flood_zones} />
            <FieldDisplay label="Nearest Airport" value={scipData.existing_conditions.nearest_airport} />
            <FieldDisplay label="Zoning District" value={scipData.zoning_overview.district} />
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium text-gray-700 mb-2 text-sm">Maps Data</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MapBadge label="Aerial" value={scipData.maps.aerial} />
              <MapBadge label="Parcel" value={scipData.maps.parcel} />
              <MapBadge label="Floodplain" value={scipData.maps.floodplain} />
              <MapBadge label="Wetlands" value={scipData.maps.wetlands} />
              <MapBadge label="Zoning" value={scipData.maps.zoning} />
              <MapBadge label="Airport" value={scipData.maps.airport} />
            </div>
          </div>
        </div>

        {/* Agent Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-user-tie text-blue-500"></i>
            Agent Info
          </h2>

          <div className="space-y-3 text-sm">
            <FieldDisplay label="Agent Name" value={scipData.agent.name} />
            <FieldDisplay label="Phone" value={scipData.agent.phone} />
            <FieldDisplay label="Email" value={scipData.agent.email} />
            <FieldDisplay label="Submittal Date" value={scipData.agent.submittal_date} />
          </div>

          {/* Timestamp */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="fas fa-clock text-gray-400"></i>
              <span className="font-medium">Last Updated:</span>
              <span>
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleString()
                  : 'Not yet updated'}
              </span>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fas fa-file-export text-green-500"></i>
            Export Options
          </h2>

          <div className="space-y-3">
            <button
              onClick={exportExcel}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-file-excel"></i>
              Export to Excel (SCIP Format)
            </button>

            <button
              onClick={copyJSON}
              className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-copy"></i>
              Copy JSON
            </button>

            <button
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              onClick={() => window.print()}
            >
              <i className="fas fa-print"></i>
              Print Report
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium text-gray-700 mb-2 text-sm">Package Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500">Total Fields:</span>
                <span className="font-bold ml-1">138</span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-500">Filled:</span>
                <span className="font-bold ml-1 text-green-600">
                  {countFilledFields()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for field display
function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

// Helper component for map badges
function MapBadge({ label, value }: { label: string; value: string }) {
  const hasValue = Boolean(value)
  return (
    <div className={`px-2 py-1 rounded text-center ${hasValue ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
      {hasValue ? <i className="fas fa-check mr-1"></i> : <i className="fas fa-times mr-1"></i>}
      {label}
    </div>
  )
}

// Count filled fields in scipData
function countFilledFields(): number {
  let count = 0
  const checkObj = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        checkObj(obj[key])
      } else if (obj[key] && obj[key] !== '') {
        count++
      }
    }
  }
  checkObj(scipData)
  return count
}
