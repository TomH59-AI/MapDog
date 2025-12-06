import React, { useState } from 'react'
import type { Parcel } from '../App'
import { populateFromSearchRing, populateFromParcel } from '../scipSchema'

interface ParcelSearchProps {
  onResults: (parcels: Parcel[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

type SearchMode = 'county' | 'coordinate' | 'bulk'

export default function ParcelSearch({ onResults, loading, setLoading }: ParcelSearchProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('county')
  const [county, setCounty] = useState('')
  const [limit, setLimit] = useState(25)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [radius, setRadius] = useState('1')
  const [unit, setUnit] = useState('miles')
  const [pinList, setPinList] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState<Parcel[]>([])

  const handleCountySearch = async () => {
    if (!county.trim()) {
      setError('Please enter a county name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/parcels/search?county=${encodeURIComponent(county)}&limit=${limit}`)
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const parcels = data.data || []
      setResults(parcels)
      onResults(parcels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCoordinateSearch = async () => {
    if (!lat || !lon || !radius || !county) {
      setError('Please fill in all coordinate search fields')
      return
    }

    setLoading(true)
    setError('')

    // Auto-populate SCIP search ring data
    populateFromSearchRing({
      siteName: `${county} Search Ring`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      radius: parseFloat(radius)
    })

    try {
      const response = await fetch('/api/parcels/coordinate-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, radius, unit, county })
      })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const parcels = data.results || []
      setResults(parcels)
      onResults(parcels)

      // Auto-populate SCIP site info from first parcel
      if (parcels.length > 0) {
        populateFromParcel(parcels[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coordinate search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSearch = async () => {
    const pins = pinList.split('\n').map(p => p.trim()).filter(p => p)
    if (pins.length === 0 || !county.trim()) {
      setError('Please enter PINs and county')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/parcels/bulk-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pins: pins.slice(0, 50), county })
      })
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const parcels = data.results || []
      setResults(parcels)
      onResults(parcels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk search failed')
    } finally {
      setLoading(false)
    }
  }

  const searchModes: { id: SearchMode; label: string; icon: string }[] = [
    { id: 'county', label: 'County Search', icon: 'fa-map-marked-alt' },
    { id: 'coordinate', label: 'RF Coordinates', icon: 'fa-crosshairs' },
    { id: 'bulk', label: 'Bulk PIN Lookup', icon: 'fa-list' }
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Search Mode Tabs */}
      <div className="flex border-b">
        {searchModes.map(mode => (
          <button
            key={mode.id}
            onClick={() => setSearchMode(mode.id)}
            className={`flex-1 px-4 py-3 font-medium transition-all flex items-center justify-center gap-2 ${
              searchMode === mode.id
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className={`fas ${mode.icon}`}></i>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* County Search Form */}
        {searchMode === 'county' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County Name</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g., WAKE, FULTON, MECKLENBURG"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>{n} parcels</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCountySearch}
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-search mr-2"></i>}
              Search County
            </button>
          </div>
        )}

        {/* Coordinate Search Form */}
        {searchMode === 'coordinate' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="35.7796"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="-78.6382"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius</label>
                <input
                  type="text"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="miles">Miles</option>
                  <option value="km">Kilometers</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="County name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCoordinateSearch}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-crosshairs mr-2"></i>}
              Search Ring
            </button>
          </div>
        )}

        {/* Bulk PIN Search Form */}
        {searchMode === 'bulk' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="County name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN List (one per line, max 50)
              </label>
              <textarea
                value={pinList}
                onChange={(e) => setPinList(e.target.value)}
                placeholder="03869-010-000&#10;03869-010-001&#10;03869-010-002"
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleBulkSearch}
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-list mr-2"></i>}
              Lookup PINs
            </button>
          </div>
        )}

        {/* Results Preview */}
        {results.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">
              <i className="fas fa-check-circle text-green-600 mr-2"></i>
              {results.length} parcels found
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.slice(0, 5).map((parcel, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium">{parcel.identifiers?.pin || 'Unknown PIN'}</p>
                  <p className="text-gray-600">{parcel.owner?.primary_name || 'Unknown Owner'}</p>
                  <p className="text-gray-500 text-xs">
                    {parcel.site?.address || parcel.owner?.address_line1 || 'No address'}
                  </p>
                </div>
              ))}
              {results.length > 5 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  + {results.length - 5} more parcels
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
