import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts'
import type { Parcel } from '../App'

interface AnalyticsProps {
  parcels: Parcel[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Analytics({ parcels }: AnalyticsProps) {
  // Zoning breakdown
  const zoningData = useMemo(() => {
    const counts: Record<string, number> = {}
    parcels.forEach(p => {
      const zoning = p.land?.zoning || 'Unknown'
      counts[zoning] = (counts[zoning] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [parcels])

  // Land use breakdown
  const landUseData = useMemo(() => {
    const counts: Record<string, number> = {}
    parcels.forEach(p => {
      const landUse = p.land?.land_use?.luse_desc || 'Unknown'
      counts[landUse] = (counts[landUse] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.substring(0, 20), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [parcels])

  // County breakdown
  const countyData = useMemo(() => {
    const counts: Record<string, number> = {}
    parcels.forEach(p => {
      const county = p.meta?.county || 'Unknown'
      counts[county] = (counts[county] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [parcels])

  // Acreage distribution
  const acreageData = useMemo(() => {
    const ranges = [
      { label: '< 1 acre', min: 0, max: 1 },
      { label: '1-5 acres', min: 1, max: 5 },
      { label: '5-10 acres', min: 5, max: 10 },
      { label: '10-50 acres', min: 10, max: 50 },
      { label: '50+ acres', min: 50, max: Infinity }
    ]

    return ranges.map(range => ({
      name: range.label,
      count: parcels.filter(p => {
        const acres = p.land?.acres_gis || p.land?.acres_deed || 0
        return acres >= range.min && acres < range.max
      }).length
    }))
  }, [parcels])

  // Value distribution
  const valueData = useMemo(() => {
    const ranges = [
      { label: '< $50K', min: 0, max: 50000 },
      { label: '$50K-$100K', min: 50000, max: 100000 },
      { label: '$100K-$250K', min: 100000, max: 250000 },
      { label: '$250K-$500K', min: 250000, max: 500000 },
      { label: '$500K-$1M', min: 500000, max: 1000000 },
      { label: '$1M+', min: 1000000, max: Infinity }
    ]

    return ranges.map(range => ({
      name: range.label,
      count: parcels.filter(p => {
        const value = p.valuation?.market?.total || 0
        return value >= range.min && value < range.max
      }).length
    }))
  }, [parcels])

  // Summary stats
  const stats = useMemo(() => {
    const totalAcres = parcels.reduce((sum, p) => sum + (p.land?.acres_gis || p.land?.acres_deed || 0), 0)
    const totalValue = parcels.reduce((sum, p) => sum + (p.valuation?.market?.total || 0), 0)
    const withGeometry = parcels.filter(p => p.geometry).length

    return {
      totalParcels: parcels.length,
      totalAcres: totalAcres.toFixed(2),
      totalValue: totalValue.toLocaleString(),
      avgAcres: parcels.length > 0 ? (totalAcres / parcels.length).toFixed(2) : '0',
      avgValue: parcels.length > 0 ? Math.round(totalValue / parcels.length).toLocaleString() : '0',
      withGeometry,
      uniqueCounties: new Set(parcels.map(p => p.meta?.county)).size,
      uniqueZoning: new Set(parcels.map(p => p.land?.zoning)).size
    }
  }, [parcels])

  if (parcels.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <i className="fas fa-chart-pie text-6xl text-gray-300 mb-4"></i>
        <h3 className="text-xl font-bold text-gray-600">No Data to Analyze</h3>
        <p className="text-gray-500 mt-2">Search for parcels to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Parcels', value: stats.totalParcels, icon: 'fa-layer-group', color: 'blue' },
          { label: 'Total Acres', value: stats.totalAcres, icon: 'fa-expand', color: 'green' },
          { label: 'Total Value', value: `$${stats.totalValue}`, icon: 'fa-dollar-sign', color: 'yellow' },
          { label: 'With Geometry', value: stats.withGeometry, icon: 'fa-map-marker-alt', color: 'purple' }
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-xl p-4 shadow-lg border-l-4 border-${stat.color}-500`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`fas ${stat.icon} text-${stat.color}-600 text-xl`}></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zoning Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-city mr-2 text-blue-600"></i>
            Zoning Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={zoningData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {zoningData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Land Use Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-tree mr-2 text-green-600"></i>
            Land Use Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={landUseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acreage Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-ruler-combined mr-2 text-yellow-600"></i>
            Acreage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={acreageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="#fef3c7" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Value Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-chart-bar mr-2 text-purple-600"></i>
            Market Value Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={valueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* County Breakdown (if multiple) */}
      {countyData.length > 1 && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            <i className="fas fa-map mr-2 text-indigo-600"></i>
            Parcels by County
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={countyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Parcels" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Averages */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          <i className="fas fa-calculator mr-2 text-teal-600"></i>
          Summary Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-teal-600">{stats.avgAcres}</p>
            <p className="text-sm text-gray-500">Avg Acres/Parcel</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-teal-600">${stats.avgValue}</p>
            <p className="text-sm text-gray-500">Avg Value/Parcel</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-teal-600">{stats.uniqueCounties}</p>
            <p className="text-sm text-gray-500">Counties</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-teal-600">{stats.uniqueZoning}</p>
            <p className="text-sm text-gray-500">Zoning Types</p>
          </div>
        </div>
      </div>
    </div>
  )
}
