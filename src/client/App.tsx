import React, { useState, useEffect } from 'react'
import ParcelMap from './components/ParcelMap'
import Analytics from './components/Analytics'
import ParcelSearch from './components/ParcelSearch'
import StateToggle from './components/StateToggle'
import ExportPanel from './components/ExportPanel'

export interface Parcel {
  parcelid?: string
  identifiers?: { pin?: string }
  owner?: { primary_name?: string; address_line1?: string; city?: string; zipcode?: string }
  site?: { address?: string; city?: string; zipcode?: string }
  land?: { acres_gis?: number; acres_deed?: number; zoning?: string; land_use?: { luse_desc?: string } }
  valuation?: { market?: { total?: number }; assessed_total?: number }
  building?: { year_built_actual?: number }
  meta?: { county?: string; pa_pin_link?: string }
  geometry?: { type: string; coordinates: number[][][] }
}

type Tab = 'search' | 'map' | 'analytics'
type StateFilter = 'NC' | 'GA' | 'FL' | 'ALL'

// County lists for state detection
const NC_COUNTIES = ['WAKE', 'MECKLENBURG', 'GUILFORD', 'DURHAM', 'FORSYTH', 'CUMBERLAND', 'BUNCOMBE', 'GASTON', 'NEW HANOVER', 'UNION', 'CABARRUS', 'ONSLOW', 'PITT', 'CATAWBA', 'DAVIDSON', 'ALAMANCE', 'ROWAN', 'RANDOLPH', 'JOHNSTON', 'CLEVELAND']
const GA_COUNTIES = ['FULTON', 'GWINNETT', 'COBB', 'DEKALB', 'CHATHAM', 'RICHMOND', 'MUSCOGEE', 'CHEROKEE', 'HENRY', 'FORSYTH', 'HALL', 'CLAYTON', 'BIBB', 'COLUMBIA', 'COWETA', 'PAULDING', 'DOUGLAS', 'BARTOW', 'CARROLL', 'FAYETTE']
const FL_COUNTIES = ['MIAMI-DADE', 'BROWARD', 'PALM BEACH', 'HILLSBOROUGH', 'ORANGE', 'PINELLAS', 'DUVAL', 'LEE', 'POLK', 'BREVARD', 'VOLUSIA', 'PASCO', 'SEMINOLE', 'SARASOTA', 'MANATEE', 'COLLIER', 'MARION', 'LAKE', 'OSCEOLA', 'ESCAMBIA', 'ALACHUA', 'ST. LUCIE', 'LEON', 'CLAY', 'ST. JOHNS', 'OKALOOSA', 'SANTA ROSA', 'BAY', 'HERNANDO', 'CHARLOTTE']

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL')
  const [loading, setLoading] = useState(false)

  // Filter parcels by state
  const filteredParcels = parcels.filter(p => {
    if (stateFilter === 'ALL') return true
    const county = p.meta?.county?.toUpperCase() || ''

    if (stateFilter === 'NC') {
      return NC_COUNTIES.some(c => county.includes(c)) || county.includes('NC')
    }
    if (stateFilter === 'GA') {
      return GA_COUNTIES.some(c => county.includes(c)) || county.includes('GA')
    }
    if (stateFilter === 'FL') {
      return FL_COUNTIES.some(c => county.includes(c)) || county.includes('FL')
    }
    return true
  })

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'search', label: 'Search', icon: 'fa-search' },
    { id: 'map', label: 'Map', icon: 'fa-map' },
    { id: 'analytics', label: 'Analytics', icon: 'fa-chart-bar' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <header className="bg-black bg-opacity-30 backdrop-blur-lg border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🐕</span>
              <div>
                <h1 className="text-2xl font-bold text-white">MapDog</h1>
                <p className="text-blue-200 text-sm">Parcel Intelligence Platform</p>
              </div>
            </div>

            {/* State Toggle */}
            <StateToggle value={stateFilter} onChange={setStateFilter} />
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-2 mt-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-900'
                    : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ParcelSearch
                onResults={(results) => setParcels(results)}
                loading={loading}
                setLoading={setLoading}
              />
            </div>
            <div>
              <ExportPanel parcels={filteredParcels} />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl" style={{ height: '70vh' }}>
            <ParcelMap parcels={filteredParcels} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <Analytics parcels={filteredParcels} />
        )}

        {/* Results Summary */}
        {parcels.length > 0 && (
          <div className="mt-6 bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-4">
            <div className="flex items-center justify-between text-white">
              <span>
                <strong>{filteredParcels.length}</strong> parcels
                {stateFilter !== 'ALL' && ` (filtered for ${stateFilter})`}
                {filteredParcels.length !== parcels.length && ` of ${parcels.length} total`}
              </span>
              <span className="text-blue-200">
                {filteredParcels.filter(p => p.geometry).length} with geometry
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
