import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
  MAPWISE_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Main UI renderer
app.use(renderer)

// Root route - MapDog main interface
app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div class="container mx-auto px-4 py-8">
        {/* Header */}
        <header class="text-center mb-12">
          <h1 class="text-6xl font-bold text-white mb-4">
            🐕 <span class="text-yellow-400">MapDog</span>
          </h1>
          <p class="text-xl text-blue-200">Site Acquisition Parcel Intelligence</p>
          <p class="text-sm text-blue-300 mt-2">Sniffing out the best wireless tower sites</p>
        </header>

        {/* Search Section */}
        <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div class="mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-map-marker-alt text-blue-600 mr-2"></i>
              Search County
            </label>
            <div class="flex gap-3">
              <input 
                type="text" 
                id="countyInput"
                placeholder="Enter county name (e.g., ALACHUA, ORANGE, MIAMI-DADE)"
                class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              />
              <input 
                type="number" 
                id="limitInput"
                placeholder="Limit"
                value="10"
                min="1"
                max="100"
                class="w-24 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
              />
              <button 
                onclick="searchParcels()"
                class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-search mr-2"></i>Search
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Validated input • Proper error handling • Rate limit aware
            </p>
          </div>

          {/* Mode Toggle */}
          <div class="flex gap-2 mb-6 border-b-2 border-gray-200 pb-2">
            <button 
              id="countyModeBtn"
              onclick="switchMode('county')"
              class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-map-marker-alt mr-2"></i>County Search
            </button>
            <button 
              id="coordinateModeBtn"
              onclick="switchMode('coordinate')"
              class="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-crosshairs mr-2"></i>RF Coordinates
            </button>
            <button
              id="bulkModeBtn"
              onclick="switchMode('bulk')"
              class="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-layer-group mr-2"></i>Bulk PINs
            </button>
            <button
              id="scipModeBtn"
              onclick="switchMode('scip')"
              class="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-map-marked-alt mr-2"></i>SCIP Maps
            </button>
          </div>

          {/* Coordinate Search (Hidden by default) */}
          <div id="coordinateSearchSection" class="hidden mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-crosshairs text-red-600 mr-2"></i>
              RF Coordinates - Search Ring
            </label>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <input 
                type="text" 
                id="coordCounty"
                placeholder="County (e.g., ORANGE)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              <input 
                type="text" 
                id="coordSiteName"
                placeholder="Site Name (e.g., Orlando Tower 1)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
              <input 
                type="text" 
                id="coordLat"
                placeholder="Latitude (e.g., 28.5383)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              <input 
                type="text" 
                id="coordLon"
                placeholder="Longitude (e.g., -81.3792)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              />
              <div class="flex gap-2">
                <input 
                  type="number" 
                  id="coordRadius"
                  placeholder="Radius"
                  value="1"
                  min="0.1"
                  max="10"
                  step="0.1"
                  class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                />
                <select 
                  id="coordUnit"
                  class="px-2 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                >
                  <option value="miles">miles</option>
                  <option value="km">km</option>
                </select>
              </div>
            </div>
            <div class="flex gap-3">
              <button 
                onclick="coordinateSearch()"
                class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-radar mr-2"></i>Find Parcels in Radius
              </button>
              <button 
                onclick="clearCoordinateSearch()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Paste coordinates from RF Engineer • Searches county for parcels within radius
            </p>
          </div>

          {/* Bulk PIN Search (Hidden by default) */}
          <div id="bulkSearchSection" class="hidden mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-layer-group text-purple-600 mr-2"></i>
              Search Ring - Bulk PIN Lookup
            </label>
            <div class="mb-3">
              <input 
                type="text" 
                id="searchRingName"
                placeholder="Search Ring Name (e.g., Orlando Tower Site 1)"
                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div class="mb-3">
              <input 
                type="text" 
                id="bulkCounty"
                placeholder="County (e.g., ORANGE)"
                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            </div>
            <textarea 
              id="pinListInput"
              placeholder="Paste PIN list (one per line):&#10;03869-010-000&#10;03869-020-000&#10;03869-030-000"
              rows="6"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm font-mono"
            ></textarea>
            <div class="flex gap-3 mt-3">
              <button 
                onclick="bulkSearchParcels()"
                class="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-search-plus mr-2"></i>Fetch All Parcels
              </button>
              <button 
                onclick="clearBulkSearch()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Paste PINs from your search ring tool • Max 50 PINs per search
            </p>
          </div>

          {/* SCIP Maps Section (Hidden by default) */}
          <div id="scipMapsSection" class="hidden mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-map-marked-alt text-emerald-600 mr-2"></i>
              SCIP Maps Generator - Site Candidate Information Package
            </label>
            <div class="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-4">
              <p class="text-sm text-emerald-800 mb-2">
                <i class="fas fa-info-circle mr-2"></i>
                Generate all 10 standard SCIP maps for wireless site acquisition:
              </p>
              <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-emerald-700">
                <span><i class="fas fa-satellite mr-1"></i>Aerial</span>
                <span><i class="fas fa-mountain mr-1"></i>Topography</span>
                <span><i class="fas fa-water mr-1"></i>Floodplain</span>
                <span><i class="fas fa-city mr-1"></i>Zoning</span>
                <span><i class="fas fa-map mr-1"></i>FLU</span>
                <span><i class="fas fa-leaf mr-1"></i>Wetlands</span>
                <span><i class="fas fa-vector-square mr-1"></i>Parcel</span>
                <span><i class="fas fa-wind mr-1"></i>Wind Speed</span>
                <span><i class="fas fa-plane mr-1"></i>Airport</span>
                <span><i class="fas fa-broadcast-tower mr-1"></i>Cell Tower</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                id="scipSiteName"
                placeholder="Site Name (e.g., Orlando Tower Site 1)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipCounty"
                placeholder="County (e.g., ORANGE)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                id="scipLat"
                placeholder="Latitude (e.g., 28.5383)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipLon"
                placeholder="Longitude (e.g., -81.3792)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipAddress"
                placeholder="Site Address (optional)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div class="flex gap-3 mb-3">
              <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Zoom Level:</label>
                <input
                  type="range"
                  id="scipZoom"
                  min="12"
                  max="19"
                  value="17"
                  class="w-24"
                  oninput="document.getElementById('scipZoomValue').textContent = this.value"
                />
                <span id="scipZoomValue" class="text-sm font-semibold text-emerald-600">17</span>
              </div>
            </div>
            <div class="flex gap-3">
              <button
                onclick="generateScipMaps()"
                class="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-map-marked-alt mr-2"></i>Generate SCIP Maps
              </button>
              <button
                onclick="clearScipForm()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Opens authoritative map sources for each layer • Export SCIP package as PDF
            </p>
          </div>

          {/* Quick Actions */}
          <div class="flex gap-3 mb-6">
            <button 
              onclick="viewSavedParcels()"
              class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-star mr-2"></i>Saved Parcels
            </button>
            <button 
              onclick="viewSearchHistory()"
              class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-history mr-2"></i>Search History
            </button>
            <button 
              onclick="exportResults()"
              class="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all"
            >
              <i class="fas fa-download mr-2"></i>Export CSV
            </button>
          </div>

          {/* Loading Indicator */}
          <div id="loading" class="hidden text-center py-4">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
            <p class="text-gray-600 mt-2">Fetching parcels...</p>
          </div>

          {/* Results Display */}
          <div id="results" class="mt-6"></div>
        </div>

        {/* Stats Footer */}
        <div class="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div class="bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4">
            <p class="text-3xl font-bold text-yellow-400" id="totalSearches">0</p>
            <p class="text-blue-200 text-sm">Total Searches</p>
          </div>
          <div class="bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4">
            <p class="text-3xl font-bold text-green-400" id="savedCount">0</p>
            <p class="text-blue-200 text-sm">Saved Parcels</p>
          </div>
          <div class="bg-white bg-opacity-20 backdrop-blur-lg rounded-lg p-4">
            <p class="text-3xl font-bold text-purple-400" id="lastSearch">N/A</p>
            <p class="text-blue-200 text-sm">Last County</p>
          </div>
        </div>
      </div>

      <script src="/static/app.js"></script>
    </div>
  )
})

// API: Search parcels from MapWise
app.get('/api/parcels/search', async (c) => {
  const county = c.req.query('county')
  const limitStr = c.req.query('limit') || '10'
  
  // ✅ BEST PRACTICE 1: Validate all user-supplied input
  if (!county) {
    return c.json({ 
      error: 'County parameter is required',
      hint: 'Provide a county name (e.g., ALACHUA, ORANGE, MIAMI-DADE)'
    }, 400)
  }

  // Validate county format (letters, hyphens, spaces only)
  const countyClean = county.trim().toUpperCase()
  if (!/^[A-Z\s\-]+$/.test(countyClean)) {
    return c.json({ 
      error: 'Invalid county name format',
      hint: 'County name should contain only letters, spaces, and hyphens'
    }, 400)
  }

  // Validate limit parameter
  const limit = parseInt(limitStr, 10)
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return c.json({ 
      error: 'Invalid limit parameter',
      hint: 'Limit must be a number between 1 and 100'
    }, 400)
  }

  const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
  
  try {
    // Call MapWise API
    const response = await fetch(
      `https://maps.mapwise.com/api_v2/parcels?searchCounty=${encodeURIComponent(countyClean)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // ✅ BEST PRACTICE 3: Handle non-200 HTTP status codes gracefully
    if (!response.ok) {
      const statusCode = response.status
      let errorMessage = 'MapWise API error'
      let userMessage = 'Failed to search parcels'

      switch (statusCode) {
        case 400:
          errorMessage = 'Bad request - invalid parameters'
          userMessage = 'Invalid search parameters. Please check county name.'
          break
        case 401:
          errorMessage = 'Unauthorized - invalid API key'
          userMessage = 'API authentication failed. Please contact support.'
          break
        case 403:
          errorMessage = 'Forbidden - access denied'
          userMessage = 'Access denied. Please check your subscription.'
          break
        case 404:
          errorMessage = 'Not found - endpoint or resource not found'
          userMessage = `No data available for ${countyClean} county.`
          break
        case 429:
          errorMessage = 'Rate limit exceeded'
          userMessage = 'Too many requests. Please wait a moment and try again.'
          break
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'MapWise server error'
          userMessage = 'MapWise service temporarily unavailable. Please try again later.'
          break
        default:
          errorMessage = `HTTP ${statusCode} error`
          userMessage = 'An unexpected error occurred. Please try again.'
      }

      console.error(`MapWise API Error: ${statusCode} - ${errorMessage}`)
      
      return c.json({ 
        error: userMessage,
        statusCode,
        details: errorMessage
      }, statusCode >= 500 ? 503 : statusCode)
    }

    const data = await response.json()

    // ✅ BEST PRACTICE 2: Check meta.record_count to determine if results were returned
    const recordCount = data.meta?.record_count || 0
    const totalCount = data.meta?.total_count || 0

    if (recordCount === 0) {
      console.log(`No results found for ${countyClean}`)
      // Still return success, but with empty data array
      return c.json({
        success: true,
        data: [],
        meta: {
          record_count: 0,
          total_count: totalCount,
          message: `No parcels found matching criteria in ${countyClean} county`
        }
      })
    }

    // Save successful search to database
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(countyClean, JSON.stringify({ limit }), recordCount).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
      // Don't fail the request if DB save fails
    }

    console.log(`Successfully retrieved ${recordCount} parcels for ${countyClean}`)
    return c.json(data)

  } catch (error) {
    console.error('API Error:', error)
    
    // Handle network errors, timeouts, etc.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return c.json({ 
      error: 'Failed to connect to MapWise API',
      details: errorMessage,
      hint: 'Please check your internet connection and try again'
    }, 500)
  }
})

// API: Coordinate-based search for RF search rings
app.post('/api/parcels/coordinate-search', async (c) => {
  try {
    const { lat, lon, radius, unit, county, siteName } = await c.req.json()
    
    // Validate inputs
    if (!lat || !lon || !radius || !county) {
      return c.json({ 
        error: 'Missing required parameters',
        hint: 'Provide lat, lon, radius, and county'
      }, 400)
    }
    
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    const searchRadius = parseFloat(radius)
    
    if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
      return c.json({ 
        error: 'Invalid coordinates or radius',
        hint: 'Coordinates must be valid numbers'
      }, 400)
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return c.json({ error: 'Latitude must be between -90 and 90' }, 400)
    }
    if (longitude < -180 || longitude > 180) {
      return c.json({ error: 'Longitude must be between -180 and 180' }, 400)
    }
    
    const countyClean = county.trim().toUpperCase()
    if (!/^[A-Z\s\-]+$/.test(countyClean)) {
      return c.json({ 
        error: 'Invalid county name format',
        hint: 'County name should contain only letters, spaces, and hyphens'
      }, 400)
    }
    
    // Convert radius to miles if needed
    const radiusMiles = unit === 'km' ? searchRadius * 0.621371 : searchRadius
    
    const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
    
    // Fetch parcels from county (limit to reasonable amount)
    const response = await fetch(
      `https://maps.mapwise.com/api_v2/parcels?searchCounty=${encodeURIComponent(countyClean)}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      return c.json({ 
        error: 'Failed to fetch parcels from MapWise',
        statusCode: response.status
      }, response.status)
    }
    
    const data = await response.json()
    const parcels = data.data || []
    
    // Filter parcels by checking if address is within radius
    // Since MapWise doesn't provide coordinates, we return all parcels
    // and let frontend do address-based filtering or use external geocoding
    const results = parcels.map((parcel: any) => ({
      ...parcel,
      _searchRing: {
        centerLat: latitude,
        centerLon: longitude,
        radiusMiles: radiusMiles,
        siteName: siteName || null
      }
    }))
    
    // Save search to database
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(
        countyClean,
        JSON.stringify({ 
          type: 'coordinate',
          lat: latitude,
          lon: longitude,
          radius: radiusMiles,
          unit: 'miles',
          siteName 
        }),
        results.length
      ).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }
    
    return c.json({
      success: true,
      results,
      meta: {
        centerLat: latitude,
        centerLon: longitude,
        radiusMiles: radiusMiles,
        county: countyClean,
        siteName: siteName || null,
        total: results.length,
        note: 'MapWise does not provide parcel coordinates. All parcels in county returned. Use address for distance filtering.'
      }
    })
    
  } catch (error) {
    console.error('Coordinate search error:', error)
    return c.json({ 
      error: 'Failed to perform coordinate search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API: Bulk PIN search for search rings
app.post('/api/parcels/bulk-search', async (c) => {
  try {
    const { pins, county, searchRingName } = await c.req.json()
    
    // Validate input
    if (!pins || !Array.isArray(pins) || pins.length === 0) {
      return c.json({ 
        error: 'PIN list is required',
        hint: 'Provide an array of parcel PINs'
      }, 400)
    }
    
    if (!county) {
      return c.json({ 
        error: 'County parameter is required',
        hint: 'Specify which county to search in'
      }, 400)
    }
    
    // Validate county format
    const countyClean = county.trim().toUpperCase()
    if (!/^[A-Z\s\-]+$/.test(countyClean)) {
      return c.json({ 
        error: 'Invalid county name format',
        hint: 'County name should contain only letters, spaces, and hyphens'
      }, 400)
    }
    
    const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
    const results = []
    const errors = []
    
    // Search for each PIN (MapWise doesn't support bulk, so we batch)
    for (const pin of pins.slice(0, 50)) { // Limit to 50 PINs per request
      try {
        const response = await fetch(
          `https://maps.mapwise.com/api_v2/parcels?searchCounty=${encodeURIComponent(countyClean)}&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          // Find matching PIN in results
          const match = data.data?.find((p: any) => 
            p.identifiers?.pin === pin || 
            p.identifiers?.pin_clean === pin.replace(/[^0-9]/g, '')
          )
          if (match) {
            results.push(match)
          }
        }
      } catch (error) {
        errors.push({ pin, error: 'Failed to fetch' })
      }
    }
    
    // Save search ring to database if name provided
    if (searchRingName) {
      try {
        await c.env.DB.prepare(
          'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
        ).bind(
          countyClean, 
          JSON.stringify({ type: 'bulk', pins, searchRingName }), 
          results.length
        ).run()
      } catch (dbError) {
        console.error('Database save error:', dbError)
      }
    }
    
    return c.json({
      success: true,
      results,
      meta: {
        requested: pins.length,
        found: results.length,
        errors: errors.length,
        searchRingName: searchRingName || null
      },
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error) {
    console.error('Bulk search error:', error)
    return c.json({ 
      error: 'Failed to perform bulk search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API: Save parcel to favorites
app.post('/api/parcels/save', async (c) => {
  try {
    const { parcelId, county, parcelData, notes } = await c.req.json()
    
    const result = await c.env.DB.prepare(
      'INSERT OR REPLACE INTO saved_parcels (parcel_id, county, parcel_data, notes) VALUES (?, ?, ?, ?)'
    ).bind(parcelId, county, JSON.stringify(parcelData), notes || '').run()

    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    return c.json({ error: 'Failed to save parcel' }, 500)
  }
})

// API: Get saved parcels
app.get('/api/parcels/saved', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM saved_parcels ORDER BY created_at DESC'
    ).all()

    return c.json(result.results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch saved parcels' }, 500)
  }
})

// API: Delete saved parcel
app.delete('/api/parcels/saved/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM saved_parcels WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to delete parcel' }, 500)
  }
})

// API: Get search history
app.get('/api/searches/history', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM searches ORDER BY created_at DESC LIMIT 20'
    ).all()

    return c.json(result.results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch search history' }, 500)
  }
})

// API: Generate SCIP Maps
app.post('/api/scip/generate', async (c) => {
  try {
    const { lat, lon, siteName, county, address, zoom = 17, radiusMiles = 0.5 } = await c.req.json()

    // Validate inputs
    if (!lat || !lon) {
      return c.json({
        error: 'Missing required parameters',
        hint: 'Provide lat and lon coordinates'
      }, 400)
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return c.json({
        error: 'Invalid coordinates',
        hint: 'Coordinates must be valid numbers'
      }, 400)
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return c.json({ error: 'Latitude must be between -90 and 90' }, 400)
    }
    if (longitude < -180 || longitude > 180) {
      return c.json({ error: 'Longitude must be between -180 and 180' }, 400)
    }

    // Clean inputs
    const siteNameClean = siteName?.trim() || 'Unnamed Site'
    const countyClean = county?.trim().toUpperCase() || ''
    const addressClean = address?.trim() || ''
    const zoomLevel = Math.min(Math.max(parseInt(zoom) || 17, 10), 20)
    const searchRadius = parseFloat(radiusMiles) || 0.5

    // Map dimensions for static maps (high resolution for Verizon quality)
    const mapWidth = 1024
    const mapHeight = 768

    // Calculate half-mile radius in degrees for bounding box
    // 1 degree latitude ≈ 69 miles, 1 degree longitude varies by latitude
    const latDegPerMile = 1 / 69.0
    const lonDegPerMile = 1 / (69.0 * Math.cos(latitude * Math.PI / 180))
    const radiusLatDeg = searchRadius * latDegPerMile
    const radiusLonDeg = searchRadius * lonDegPerMile

    // Calculate bounding box for half-mile radius
    const bbox = {
      minLon: longitude - radiusLonDeg,
      minLat: latitude - radiusLatDeg,
      maxLon: longitude + radiusLonDeg,
      maxLat: latitude + radiusLatDeg
    }

    // Convert radius to feet and meters for display
    const radiusFeet = Math.round(searchRadius * 5280)
    const radiusMeters = Math.round(searchRadius * 1609.34)

    // Generate professional SCIP map configurations for Verizon review
    const scipMaps = [
      {
        id: 'aerial',
        name: 'Aerial Map',
        description: `High-resolution satellite imagery with ${searchRadius}-mile search ring radius centered on site coordinates. Red waypoint marker indicates proposed tower location.`,
        icon: 'fa-satellite',
        color: 'blue',
        // Google Earth Web with coordinates
        viewerUrl: `https://earth.google.com/web/@${latitude},${longitude},100a,${radiusFeet * 2}d,35y,0h,0t,0r`,
        // ArcGIS World Imagery with marker
        altViewerUrl: `https://www.arcgis.com/home/webmap/viewer.html?center=${longitude},${latitude}&level=${zoomLevel}&basemapUrl=https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer`,
        // ESRI World Imagery export with bounding box
        esriUrl: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&bboxSR=4326&imageSR=4326&size=${mapWidth},${mapHeight}&format=png&f=image`,
        source: 'ESRI World Imagery / Google Earth',
        requiresKey: false,
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'topography',
        name: 'Topography Map',
        description: `USGS topographic map showing contour lines with elevation in feet above Mean Sea Level (AMSL). ${searchRadius}-mile search ring radius displayed.`,
        icon: 'fa-mountain',
        color: 'green',
        // USGS National Map with topo
        viewerUrl: `https://apps.nationalmap.gov/viewer/?ll=${latitude},${longitude}&z=${zoomLevel}`,
        // USGS Topo Map Service
        altViewerUrl: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/export?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&bboxSR=4326&imageSR=4326&size=${mapWidth},${mapHeight}&format=png&f=image`,
        // OpenTopoMap for contours
        esriUrl: `https://opentopomap.org/#map=${zoomLevel}/${latitude}/${longitude}`,
        // Caltopo for professional topo
        caltopoUrl: `https://caltopo.com/map.html#ll=${latitude},${longitude}&z=${zoomLevel}&b=t`,
        source: 'USGS National Map / OpenTopoMap',
        requiresKey: false,
        note: 'Contour interval typically 10-40 feet. Elevation shown in feet AMSL.',
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'floodplain',
        name: 'Floodplain Map (FEMA FIRMette)',
        description: `Official FEMA Flood Insurance Rate Map (FIRM) showing flood zone designations. Use FIRMette tool to generate print-quality flood map for ${searchRadius}-mile radius.`,
        icon: 'fa-water',
        color: 'cyan',
        // FEMA FIRMette Generator - direct link
        viewerUrl: `https://msc.fema.gov/portal/availabilitySearch?latitude=${latitude}&longitude=${longitude}#searchresultsanchor`,
        // FEMA National Flood Hazard Layer viewer
        altViewerUrl: `https://hazards-fema.maps.arcgis.com/apps/webappviewer/index.html?id=8b0adb51996444d4879338b5529aa9cd&extent=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
        // FEMA NFHL REST Service for static image
        esriUrl: `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&bboxSR=4326&imageSR=4326&size=${mapWidth},${mapHeight}&format=png&f=image&layers=show:28`,
        source: 'FEMA National Flood Hazard Layer (NFHL)',
        requiresKey: false,
        note: 'Generate FIRMette PDF for official flood zone determination. Zones: A, AE, AH, AO, V, VE, X (shaded/unshaded).',
        legend: {
          'Zone A/AE': 'High Risk - 1% annual flood chance (100-year)',
          'Zone V/VE': 'High Risk Coastal - Wave action',
          'Zone X (shaded)': 'Moderate Risk - 0.2% annual chance (500-year)',
          'Zone X (unshaded)': 'Minimal Risk - Outside flood zones'
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'zoning',
        name: 'Zoning Map',
        description: `Local zoning district map with color-coded classifications. ${countyClean || 'County'} zoning ordinance applies. ${searchRadius}-mile search ring shown.`,
        icon: 'fa-city',
        color: 'purple',
        // County-specific GIS portal search
        viewerUrl: countyClean
          ? `https://www.google.com/search?q=${encodeURIComponent(countyClean)}+county+florida+GIS+zoning+map+viewer`
          : `https://www.arcgis.com/home/webmap/viewer.html?center=${longitude},${latitude}&level=${zoomLevel}`,
        // ArcGIS Hub search for zoning
        altViewerUrl: `https://hub.arcgis.com/search?q=zoning%20${encodeURIComponent(countyClean || '')}%20florida&collection=Dataset`,
        source: `${countyClean || 'County'} Planning & Zoning Department`,
        requiresKey: false,
        note: 'Zoning maps are county-specific. Include color-coded legend showing: Residential (R-1, R-2, R-3), Commercial (C-1, C-2), Industrial (I-1, I-2), Agricultural (A), PUD, etc.',
        legend: {
          'Residential (Yellow)': 'R-1, R-2, R-3 - Single/Multi-family',
          'Commercial (Red)': 'C-1, C-2, C-3 - Retail/Office/Heavy',
          'Industrial (Purple)': 'I-1, I-2 - Light/Heavy Industrial',
          'Agricultural (Green)': 'A, AG - Farm/Rural',
          'PUD (Orange)': 'Planned Unit Development',
          'Conservation (Dark Green)': 'Protected/Environmental'
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'flu',
        name: 'FLU Map (Future Land Use)',
        description: `Future Land Use designations from ${countyClean || 'County'} Comprehensive Plan. Color-coded with ${searchRadius}-mile search ring.`,
        icon: 'fa-map',
        color: 'orange',
        viewerUrl: countyClean
          ? `https://www.google.com/search?q=${encodeURIComponent(countyClean)}+county+florida+future+land+use+map+comprehensive+plan`
          : `https://www.google.com/search?q=future+land+use+map+${latitude}+${longitude}`,
        altViewerUrl: `https://hub.arcgis.com/search?q=future%20land%20use%20${encodeURIComponent(countyClean || '')}%20florida`,
        source: `${countyClean || 'County'} Planning Department / Comprehensive Plan`,
        requiresKey: false,
        note: 'FLU maps show planned future development patterns. May differ from current zoning.',
        legend: {
          'Low Density Residential': '1-4 units/acre',
          'Medium Density Residential': '5-12 units/acre',
          'High Density Residential': '13+ units/acre',
          'Commercial': 'Retail/Office/Mixed Use',
          'Industrial': 'Manufacturing/Warehousing',
          'Agricultural': 'Farm/Rural/Silviculture',
          'Conservation': 'Wetlands/Environmental'
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'wetlands',
        name: 'Wetlands Map (NWI)',
        description: `National Wetlands Inventory (NWI) showing wetland boundaries, types, and classifications within ${searchRadius}-mile radius. USGS/USFWS data.`,
        icon: 'fa-leaf',
        color: 'teal',
        // USFWS Wetlands Mapper with coordinates
        viewerUrl: `https://fwsprimary.wim.usgs.gov/wetlands/apps/wetlands-mapper/?ll=${latitude},${longitude}&z=${zoomLevel}`,
        // NWI REST Service export
        esriUrl: `https://www.fws.gov/wetlands/arcgis/rest/services/Wetlands/MapServer/export?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&bboxSR=4326&imageSR=4326&size=${mapWidth},${mapHeight}&format=png&f=image&layers=show:0`,
        // Alternative: USGS National Hydrography
        altViewerUrl: `https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/export?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&bboxSR=4326&size=${mapWidth},${mapHeight}&format=png&f=image`,
        source: 'USFWS National Wetlands Inventory / USGS NHD',
        requiresKey: false,
        note: 'Wetlands shown in blue/teal. Classification codes: PFO (Forested), PEM (Emergent), PSS (Scrub-Shrub), L (Lacustrine), R (Riverine).',
        legend: {
          'PFO (Dark Blue)': 'Palustrine Forested Wetland',
          'PEM (Light Blue)': 'Palustrine Emergent Wetland',
          'PSS (Blue-Green)': 'Palustrine Scrub-Shrub',
          'L (Blue)': 'Lacustrine (Lake/Pond)',
          'R (Blue Line)': 'Riverine (Stream/River)',
          'E (Teal)': 'Estuarine (Coastal)'
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'parcel',
        name: 'Parcel Map',
        description: `Property parcel boundaries showing target parcel and surrounding parcels within ${searchRadius}-mile radius. Includes PIN, owner, and acreage data.`,
        icon: 'fa-vector-square',
        color: 'yellow',
        // County Property Appraiser search
        viewerUrl: countyClean
          ? `https://www.google.com/search?q=${encodeURIComponent(countyClean)}+county+florida+property+appraiser+GIS+map`
          : `https://www.arcgis.com/home/webmap/viewer.html?center=${longitude},${latitude}&level=${zoomLevel}`,
        // ArcGIS parcels search
        altViewerUrl: `https://hub.arcgis.com/search?q=parcels%20${encodeURIComponent(countyClean || '')}%20florida`,
        // Regrid (formerly Loveland) parcel data
        regridUrl: `https://app.regrid.com/us/fl/${countyClean?.toLowerCase() || ''}#${zoomLevel}/${latitude}/${longitude}`,
        source: `${countyClean || 'County'} Property Appraiser / Regrid`,
        requiresKey: false,
        note: 'Use MapDog County Search to pull detailed parcel data for target and surrounding properties.',
        parcelData: {
          targetCoords: { lat: latitude, lon: longitude },
          searchRadius: searchRadius,
          requiredFields: ['PIN', 'Owner Name', 'Site Address', 'Acres', 'Zoning', 'Land Use', 'Market Value']
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'wind',
        name: 'Wind Speed Map',
        description: `Wind resource data showing average wind speeds at hub height. Design wind speed per ASCE 7 for ${countyClean || 'location'}.`,
        icon: 'fa-wind',
        color: 'sky',
        // NREL Wind Prospector
        viewerUrl: `https://maps.nrel.gov/wind-prospector/?aL=hHsZ8C%255Bv%255D%3Dt&bL=clight&cE=0&lR=0&mC=${latitude}%2C${longitude}&zL=${Math.min(zoomLevel, 14)}`,
        // Global Wind Atlas
        altViewerUrl: `https://globalwindatlas.info/en/area/United%20States%20of%20America?print=true&lon=${longitude}&lat=${latitude}`,
        // AWS Truepower Wind Navigator
        source: 'NREL Wind Prospector / Global Wind Atlas',
        requiresKey: false,
        note: 'Show wind speed in mph at 80m/100m hub height. Include ASCE 7-22 basic wind speed for structural design.',
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'airport',
        name: 'Closest Airport Map',
        description: `Proximity to airports, heliports, and seaplane bases within 20 miles. Shows distance in statute miles from site coordinates with airport identifiers.`,
        icon: 'fa-plane',
        color: 'indigo',
        // SkyVector with site coordinates
        viewerUrl: `https://skyvector.com/?ll=${latitude},${longitude}&chart=301&zoom=1`,
        // AirNav airport search
        altViewerUrl: `https://www.airnav.com/cgi-bin/airport-search?place=${latitude}+${longitude}&range=20`,
        // FAA OE/AAA Tool
        faaUrl: `https://oeaaa.faa.gov/oeaaa/external/gisTools/gisAction.jsp?action=showLandingPage`,
        source: 'FAA / SkyVector / AirNav',
        requiresKey: false,
        note: 'List all airports within 5 miles showing: Name, Identifier (e.g., KMCO), Distance (miles), Bearing. Check FAA Part 77 imaginary surfaces for tower height restrictions.',
        airportInfo: {
          searchCenter: { lat: latitude, lon: longitude },
          searchRadiusMiles: 20,
          requiredFields: ['Airport Name', 'FAA Identifier', 'Distance (miles)', 'Bearing', 'Runway Length', 'Type'],
          part77Note: 'Notify FAA if structure >200ft AGL or within Part 77 surfaces'
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      },
      {
        id: 'celltower',
        name: 'Cell Tower & Antenna Map',
        description: `Existing cell towers, rooftop antennas, and wireless facilities within ${searchRadius}-mile radius. FCC ASR and carrier data.`,
        icon: 'fa-broadcast-tower',
        color: 'red',
        // CellMapper with coordinates
        viewerUrl: `https://www.cellmapper.net/map?MCC=311&MNC=480&type=LTE&latitude=${latitude}&longitude=${longitude}&zoom=${Math.min(zoomLevel, 14)}&showTowers=true&showTowerLabels=true`,
        // AntennaSearch radius search
        altViewerUrl: `https://www.antennasearch.com/HTML/search/search.php?lat=${latitude}&lon=${longitude}`,
        // FCC ASR Database
        fccUrl: `https://wireless2.fcc.gov/UlsApp/AsrSearch/asrRegistrationSearch.jsp`,
        source: 'FCC Antenna Structure Registration / CellMapper / AntennaSearch',
        requiresKey: false,
        note: `Show all towers within ${searchRadius} miles with: Structure height (ft AGL), Owner, ASR#, Distance from site. AntennaSearch provides 4-mile radius report.`,
        towerSearch: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          requiredFields: ['Structure Type', 'Height (ft AGL)', 'Owner', 'ASR Number', 'Distance (miles)', 'Bearing']
        },
        searchRing: {
          centerLat: latitude,
          centerLon: longitude,
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          color: 'red'
        }
      }
    ]

    // Build response with enhanced map data
    const response = {
      success: true,
      site: {
        name: siteNameClean,
        county: countyClean,
        address: addressClean,
        coordinates: {
          latitude,
          longitude,
          dms: {
            lat: decimalToDMS(latitude, 'lat'),
            lon: decimalToDMS(longitude, 'lon')
          }
        },
        searchRing: {
          radiusMiles: searchRadius,
          radiusFeet: radiusFeet,
          radiusMeters: radiusMeters,
          boundingBox: bbox
        },
        zoom: zoomLevel
      },
      maps: scipMaps,
      meta: {
        generated: new Date().toISOString(),
        mapCount: scipMaps.length,
        client: 'Verizon',
        note: 'Professional SCIP package maps with half-mile search ring radius. Each map should include red waypoint marker at center coordinates.',
        requirements: [
          'Red waypoint marker at center coordinates',
          `${searchRadius}-mile radius circle (${radiusFeet} feet) around waypoint`,
          'North arrow and scale bar',
          'Site name and coordinates in title block',
          'Date generated',
          'Legend/key for color-coded maps'
        ]
      }
    }

    // Log SCIP generation to database
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(
        countyClean || 'N/A',
        JSON.stringify({
          type: 'scip',
          lat: latitude,
          lon: longitude,
          siteName: siteNameClean,
          address: addressClean,
          radiusMiles: searchRadius
        }),
        scipMaps.length
      ).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }

    return c.json(response)

  } catch (error) {
    console.error('SCIP generation error:', error)
    return c.json({
      error: 'Failed to generate SCIP maps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper function to convert decimal degrees to DMS
function decimalToDMS(decimal: number, type: 'lat' | 'lon'): string {
  const absolute = Math.abs(decimal)
  const degrees = Math.floor(absolute)
  const minutesNotTruncated = (absolute - degrees) * 60
  const minutes = Math.floor(minutesNotTruncated)
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2)

  let direction = ''
  if (type === 'lat') {
    direction = decimal >= 0 ? 'N' : 'S'
  } else {
    direction = decimal >= 0 ? 'E' : 'W'
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`
}

// API: Get statistics
app.get('/api/stats', async (c) => {
  try {
    const searchCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM searches').first()
    const savedCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM saved_parcels').first()
    const lastSearch = await c.env.DB.prepare(
      'SELECT county FROM searches ORDER BY created_at DESC LIMIT 1'
    ).first()

    return c.json({
      totalSearches: searchCount?.count || 0,
      savedParcels: savedCount?.count || 0,
      lastCounty: lastSearch?.county || 'N/A'
    })
  } catch (error) {
    return c.json({
      totalSearches: 0,
      savedParcels: 0,
      lastCounty: 'N/A'
    })
  }
})

export default app
