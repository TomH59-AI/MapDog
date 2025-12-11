import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
  MAPWISE_API_KEY: string
  ATTOM_API_KEY: string
  OPENCELLID_API_KEY: string
  AVIATION_EDGE_API_KEY: string
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
              <i class="fas fa-bullseye mr-2"></i>SCIP Property
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

          {/* SCIP Property Search (Hidden by default) */}
          <div id="scipSearchSection" class="hidden mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-bullseye text-emerald-600 mr-2"></i>
              SCIP - Search Coordinate In Property
            </label>
            <p class="text-sm text-gray-600 mb-3 bg-emerald-50 p-2 rounded">
              <i class="fas fa-info-circle mr-1"></i>
              Find top 3-4 tower site candidates within 3 search rings (0.25mi, 0.50mi, 1.0mi)
            </p>
            <div class="mb-3">
              <input
                type="text"
                id="scipSiteName"
                placeholder="Site Name (e.g., Durham Tower Alpha)"
                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                id="scipLat"
                placeholder="Latitude (e.g., 35.965948)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipLon"
                placeholder="Longitude (e.g., -78.810527)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div class="mb-3 p-3 bg-gray-100 rounded-lg">
              <p class="text-sm font-semibold text-gray-700 mb-2">Search Rings:</p>
              <div class="flex gap-4 text-sm">
                <span class="px-2 py-1 bg-red-100 text-red-700 rounded">0.25 mi</span>
                <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">0.50 mi</span>
                <span class="px-2 py-1 bg-green-100 text-green-700 rounded">1.0 mi</span>
              </div>
            </div>
            <div class="flex gap-3">
              <button
                onclick="scipSearch()"
                class="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-search-location mr-2"></i>Find Candidates
              </button>
              <button
                onclick="clearScipSearch()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-database mr-1"></i>
              Powered by ATTOM Data • Returns top candidates ranked by parcel size and zoning
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

// API: SCIP - Search Coordinate In Property (ATTOM Data API)
// Searches for properties within 3 concentric radii: 0.25mi, 0.50mi, 1.0mi
app.post('/api/parcels/scip-search', async (c) => {
  try {
    const { lat, lon, siteName } = await c.req.json()

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

    const apiKey = c.env.ATTOM_API_KEY

    if (!apiKey) {
      return c.json({
        error: 'ATTOM API key not configured',
        hint: 'Please configure the ATTOM_API_KEY environment variable'
      }, 500)
    }

    // Helper function to query FEMA NFHL for flood zone (FREE - no API key needed)
    const getFemaFloodZone = async (propLat: number, propLon: number): Promise<string> => {
      try {
        const femaUrl = `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?` +
          `geometry=${propLon},${propLat}` +
          `&geometryType=esriGeometryPoint` +
          `&spatialRel=esriSpatialRelIntersects` +
          `&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF` +
          `&returnGeometry=false` +
          `&f=json`

        const femaResponse = await fetch(femaUrl)
        if (!femaResponse.ok) return 'Unable to retrieve'

        const femaData = await femaResponse.json()
        const features = femaData.features || []

        if (features.length === 0) return 'Zone X (Minimal Risk)'

        const zone = features[0].attributes?.FLD_ZONE || 'Unknown'
        const subtype = features[0].attributes?.ZONE_SUBTY || ''
        const sfha = features[0].attributes?.SFHA_TF === 'T'

        // Build descriptive flood zone string
        let description = `Zone ${zone}`
        if (subtype) description += ` (${subtype})`
        if (sfha) description += ' - Special Flood Hazard Area'
        else if (zone === 'X') description += ' - Minimal Flood Risk'
        else if (zone === 'A' || zone === 'AE' || zone === 'AO' || zone === 'AH') {
          description += ' - High Risk (1% annual chance)'
        } else if (zone === 'V' || zone === 'VE') {
          description += ' - Coastal High Risk'
        }

        return description
      } catch (error) {
        console.error('FEMA API error:', error)
        return 'Unable to retrieve'
      }
    }

    // Helper function to query USFWS National Wetlands Inventory (FREE - no API key needed)
    const getWetlandsInfo = async (propLat: number, propLon: number): Promise<string> => {
      try {
        // Query wetlands within a small buffer around the property (0.001 degrees ~ 100m)
        const buffer = 0.001
        const bbox = `${propLon - buffer},${propLat - buffer},${propLon + buffer},${propLat + buffer}`

        const wetlandsUrl = `https://www.fws.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query?` +
          `geometry=${propLon},${propLat}` +
          `&geometryType=esriGeometryPoint` +
          `&spatialRel=esriSpatialRelIntersects` +
          `&outFields=WETLAND_TYPE,ATTRIBUTE` +
          `&returnGeometry=false` +
          `&f=json`

        const wetlandsResponse = await fetch(wetlandsUrl)
        if (!wetlandsResponse.ok) return 'No wetlands data'

        const wetlandsData = await wetlandsResponse.json()
        const features = wetlandsData.features || []

        if (features.length === 0) return 'No wetlands identified'

        // Parse wetland types
        const wetlandTypes = features.map((f: any) => {
          const type = f.attributes?.WETLAND_TYPE || f.attributes?.ATTRIBUTE || 'Unknown'
          return type
        })

        // Get unique wetland types
        const uniqueTypes = [...new Set(wetlandTypes)]

        // Translate NWI codes to human-readable descriptions
        const translateCode = (code: string): string => {
          if (code.startsWith('PEM')) return 'Palustrine Emergent Wetland'
          if (code.startsWith('PFO')) return 'Palustrine Forested Wetland'
          if (code.startsWith('PSS')) return 'Palustrine Scrub-Shrub Wetland'
          if (code.startsWith('PUB')) return 'Palustrine Unconsolidated Bottom'
          if (code.startsWith('PAB')) return 'Palustrine Aquatic Bed'
          if (code.startsWith('POW')) return 'Palustrine Open Water'
          if (code.startsWith('L')) return 'Lacustrine (Lake)'
          if (code.startsWith('R')) return 'Riverine (River/Stream)'
          if (code.startsWith('E')) return 'Estuarine (Coastal)'
          if (code.startsWith('M')) return 'Marine'
          return code
        }

        const descriptions = uniqueTypes.slice(0, 3).map(translateCode)
        return descriptions.join('; ') || 'Wetland present - check NWI maps'

      } catch (error) {
        console.error('USFWS Wetlands API error:', error)
        return 'Unable to retrieve'
      }
    }

    // Helper function to query OpenCelliD for nearby cell towers
    const getNearbyTowers = async (propLat: number, propLon: number): Promise<{ summary: string; towers: any[] }> => {
      try {
        const openCellIdKey = c.env.OPENCELLID_API_KEY
        if (!openCellIdKey) {
          return { summary: 'API key not configured', towers: [] }
        }

        // OpenCelliD uses bounding box - search ~1 mile around property
        // 1 mile ≈ 0.0145 degrees latitude
        const delta = 0.0145
        const bbox = `${propLat - delta},${propLon - delta},${propLat + delta},${propLon + delta}`

        const cellUrl = `https://opencellid.org/cell/getInArea?key=${openCellIdKey}` +
          `&BBOX=${bbox}&format=json&limit=10`

        const cellResponse = await fetch(cellUrl)
        if (!cellResponse.ok) {
          console.error('OpenCelliD API error:', cellResponse.status)
          return { summary: 'Unable to retrieve tower data', towers: [] }
        }

        const cellData = await cellResponse.json()
        const cells = cellData.cells || []

        if (cells.length === 0) {
          return { summary: 'No towers found within 1 mile', towers: [] }
        }

        // Calculate distance and format towers
        const toRadians = (deg: number) => deg * (Math.PI / 180)
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 3959 // Earth radius in miles
          const dLat = toRadians(lat2 - lat1)
          const dLon = toRadians(lon2 - lon1)
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          return R * c
        }

        // Map MCC to country/carrier info
        const getCarrierInfo = (mcc: number, mnc: number): string => {
          // US carriers (MCC 310, 311, 312)
          if (mcc === 310 || mcc === 311 || mcc === 312) {
            const usCarriers: { [key: string]: string } = {
              '310-120': 'Sprint', '310-260': 'T-Mobile', '310-410': 'AT&T',
              '311-480': 'Verizon', '310-004': 'Verizon', '311-490': 'T-Mobile',
              '310-150': 'AT&T', '310-380': 'AT&T', '310-170': 'AT&T',
              '310-030': 'AT&T', '310-070': 'AT&T', '310-560': 'AT&T',
              '310-680': 'AT&T', '310-980': 'AT&T', '311-180': 'AT&T',
              '312-530': 'Sprint', '310-830': 'T-Mobile', '310-580': 'T-Mobile'
            }
            return usCarriers[`${mcc}-${mnc}`] || `US Carrier (MNC ${mnc})`
          }
          return `MCC ${mcc}`
        }

        // Get radio type description
        const getRadioType = (radio: string): string => {
          const types: { [key: string]: string } = {
            'LTE': '4G LTE', 'UMTS': '3G UMTS', 'GSM': '2G GSM',
            'CDMA': 'CDMA', 'NR': '5G NR'
          }
          return types[radio] || radio || 'Unknown'
        }

        const towersWithDistance = cells.map((cell: any) => ({
          cellId: cell.cellid,
          lac: cell.lac,
          mcc: cell.mcc,
          mnc: cell.mnc,
          radio: getRadioType(cell.radio),
          carrier: getCarrierInfo(cell.mcc, cell.mnc),
          lat: cell.lat,
          lon: cell.lon,
          range: cell.range, // in meters
          distance: haversine(propLat, propLon, cell.lat, cell.lon)
        })).sort((a: any, b: any) => a.distance - b.distance)

        // Find closest tower
        const closest = towersWithDistance[0]
        const uniqueCarriers = [...new Set(towersWithDistance.map((t: any) => t.carrier))]

        const summary = `${towersWithDistance.length} towers within 1mi | ` +
          `Nearest: ${closest.distance.toFixed(2)}mi (${closest.carrier}, ${closest.radio}) | ` +
          `Carriers: ${uniqueCarriers.slice(0, 3).join(', ')}`

        return { summary, towers: towersWithDistance.slice(0, 5) }

      } catch (error) {
        console.error('OpenCelliD API error:', error)
        return { summary: 'Unable to retrieve', towers: [] }
      }
    }

    // Helper function to query Aviation Edge for nearby airports (FAA compliance)
    const getNearbyAirports = async (propLat: number, propLon: number): Promise<{ summary: string; airports: any[]; faaWarning: boolean }> => {
      try {
        const aviationKey = c.env.AVIATION_EDGE_API_KEY
        if (!aviationKey) {
          return { summary: 'API key not configured', airports: [], faaWarning: false }
        }

        // Aviation Edge nearby airports endpoint
        const airportUrl = `https://aviation-edge.com/v2/public/nearby?key=${aviationKey}` +
          `&lat=${propLat}&lng=${propLon}&distance=50` // Search within 50km (~31 miles)

        const airportResponse = await fetch(airportUrl)
        if (!airportResponse.ok) {
          console.error('Aviation Edge API error:', airportResponse.status)
          return { summary: 'Unable to retrieve airport data', airports: [], faaWarning: false }
        }

        const airportData = await airportResponse.json()

        // Handle error response
        if (airportData.error) {
          return { summary: 'No airport data available', airports: [], faaWarning: false }
        }

        const airports = Array.isArray(airportData) ? airportData : []

        if (airports.length === 0) {
          return { summary: 'No airports within 31 miles - FAA clear', airports: [], faaWarning: false }
        }

        // Calculate distance using haversine
        const toRadians = (deg: number) => deg * (Math.PI / 180)
        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 3959 // Earth radius in miles
          const dLat = toRadians(lat2 - lat1)
          const dLon = toRadians(lon2 - lon1)
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          return R * c
        }

        // Process and sort airports by distance
        const airportsWithDistance = airports.map((airport: any) => {
          const lat = parseFloat(airport.latitudeAirport) || 0
          const lon = parseFloat(airport.longitudeAirport) || 0
          const distance = haversine(propLat, propLon, lat, lon)

          return {
            name: airport.nameAirport || 'Unknown Airport',
            code: airport.codeIataAirport || airport.codeIcaoAirport || 'N/A',
            icao: airport.codeIcaoAirport || 'N/A',
            city: airport.nameCity || 'Unknown',
            country: airport.nameCountry || 'Unknown',
            type: airport.codeIataAirport ? 'Commercial' : 'General Aviation',
            lat,
            lon,
            distance,
            distanceKm: distance * 1.60934
          }
        }).filter((a: any) => a.distance > 0)
          .sort((a: any, b: any) => a.distance - b.distance)

        // Determine FAA warning level
        // FAA Part 77 surfaces extend based on runway length and airport type
        // Generally: within 3 nautical miles (3.45 statute miles) of airport requires notification
        const closest = airportsWithDistance[0]
        const faaWarning = closest && closest.distance < 6 // Within 6 miles - caution zone

        // Build summary
        let summary = ''
        if (closest) {
          summary = `Nearest: ${closest.name} (${closest.code}) - ${closest.distance.toFixed(1)} mi`
          if (faaWarning) {
            summary += ' ⚠️ FAA NOTIFICATION MAY BE REQUIRED'
          }
        } else {
          summary = 'No airports found nearby'
        }

        return {
          summary,
          airports: airportsWithDistance.slice(0, 5),
          faaWarning
        }

      } catch (error) {
        console.error('Aviation Edge API error:', error)
        return { summary: 'Unable to retrieve', airports: [], faaWarning: false }
      }
    }

    // Search at 1 mile radius (will capture all 3 rings)
    const attomUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/snapshot?latitude=${latitude}&longitude=${longitude}&radius=1&pagesize=100&orderby=distance`

    console.log(`SCIP Search: ${latitude}, ${longitude}, 3 rings (0.25, 0.50, 1.0 mi)`)

    const response = await fetch(attomUrl, {
      headers: {
        'Accept': 'application/json',
        'apikey': apiKey
      }
    })

    // Handle non-200 HTTP status codes
    if (!response.ok) {
      const statusCode = response.status
      let userMessage = 'Failed to search properties'

      switch (statusCode) {
        case 400:
          userMessage = 'Invalid search parameters. Please check coordinates.'
          break
        case 401:
          userMessage = 'ATTOM API authentication failed. Please verify API key.'
          break
        case 403:
          userMessage = 'Access denied. Please check your ATTOM subscription.'
          break
        case 404:
          userMessage = 'No properties found in this area.'
          break
        case 429:
          userMessage = 'Too many requests. Please wait a moment and try again.'
          break
        default:
          userMessage = 'An unexpected error occurred. Please try again.'
      }

      console.error(`ATTOM API Error: ${statusCode}`)
      return c.json({ error: userMessage, statusCode }, statusCode >= 500 ? 503 : statusCode)
    }

    const data = await response.json()
    const properties = data.property || []

    // Transform property data
    const transformProperty = (prop: any) => ({
      // Core identifiers
      parcelId: prop.identifier?.apn || prop.identifier?.attomId || 'N/A',
      attomId: prop.identifier?.attomId,
      fips: prop.identifier?.fips,

      // Owner information
      ownerName: [prop.owner?.[0]?.fullName, prop.owner?.[1]?.fullName]
        .filter(Boolean).join(' and ') || 'N/A',
      ownerMailingAddress: prop.owner?.[0]?.mailAddressOneLine ||
        `${prop.owner?.[0]?.mailAddressHouse || ''} ${prop.owner?.[0]?.mailAddressStreet || ''}, ${prop.owner?.[0]?.mailAddressCity || ''}, ${prop.owner?.[0]?.mailAddressState || ''} ${prop.owner?.[0]?.mailAddressZip || ''}`.trim() || 'N/A',

      // Parcel address
      parcelAddress: prop.address?.oneLine ||
        `${prop.address?.line1 || ''}, ${prop.address?.locality || ''}, ${prop.address?.countrySubd || ''} ${prop.address?.postal1 || ''}`.trim() || 'N/A',
      city: prop.address?.locality || 'N/A',
      state: prop.address?.countrySubd || 'N/A',
      zipcode: prop.address?.postal1 || 'N/A',
      county: prop.area?.countrySecSubd || 'N/A',

      // Land details
      parcelSizeAcres: prop.lot?.lotSize1 ? (prop.lot.lotSize1 / 43560).toFixed(2) : 'N/A',
      lotSqFt: prop.lot?.lotSize1 || null,
      zoningClassification: prop.lot?.zoning || 'N/A',
      zoningCode: prop.lot?.zoningCode || null,
      landUse: prop.summary?.propClass || prop.summary?.propSubType || 'N/A',

      // Coordinates
      coordinates: {
        latitude: prop.location?.latitude || null,
        longitude: prop.location?.longitude || null
      },
      distance: prop.location?.distance || 0,

      // Valuation
      marketValue: prop.assessment?.assessed?.assdTtlValue || null,
      landValue: prop.assessment?.market?.mktLandValue || null,

      // Building info
      yearBuilt: prop.summary?.yearBuilt || null,
      buildingSqFt: prop.building?.size?.livingSize || null,

      // Contact (usually not in ATTOM data)
      phoneNumber: 'Not provided in source data',
      emailAddress: 'Not provided in source data',

      // Environmental & infrastructure data will be populated separately
      femaFloodZone: 'Pending lookup...',
      wetlandsInfo: 'Pending lookup...',
      nearbyTowers: { summary: 'Pending lookup...', towers: [] },
      nearbyAirports: { summary: 'Pending lookup...', airports: [], faaWarning: false }
    })

    // Categorize properties by ring
    const ring025 = properties
      .filter((p: any) => (p.location?.distance || 0) <= 0.25)
      .map(transformProperty)

    const ring050 = properties
      .filter((p: any) => (p.location?.distance || 0) > 0.25 && (p.location?.distance || 0) <= 0.50)
      .map(transformProperty)

    const ring100 = properties
      .filter((p: any) => (p.location?.distance || 0) > 0.50 && (p.location?.distance || 0) <= 1.0)
      .map(transformProperty)

    // Select best candidates (prefer larger parcels with good zoning)
    const rankCandidate = (p: any) => {
      let score = 0
      const acres = parseFloat(p.parcelSizeAcres) || 0
      score += acres * 10 // Larger parcels score higher
      if (p.landUse?.toLowerCase().includes('vacant')) score += 50
      if (p.landUse?.toLowerCase().includes('agricultural')) score += 40
      if (p.landUse?.toLowerCase().includes('commercial')) score += 30
      if (p.landUse?.toLowerCase().includes('industrial')) score += 30
      if (p.zoningClassification?.toLowerCase().includes('rural')) score += 20
      score -= (p.distance || 0) * 10 // Closer is better
      return score
    }

    // Get top candidates from each ring
    const topCandidatesRaw = [
      ...ring025.sort((a: any, b: any) => rankCandidate(b) - rankCandidate(a)).slice(0, 2),
      ...ring050.sort((a: any, b: any) => rankCandidate(b) - rankCandidate(a)).slice(0, 1),
      ...ring100.sort((a: any, b: any) => rankCandidate(b) - rankCandidate(a)).slice(0, 1)
    ].slice(0, 4) // Max 4 candidates

    // Fetch FEMA flood zone, wetlands, cell tower, and airport data for each top candidate
    console.log(`Fetching environmental & infrastructure data for ${topCandidatesRaw.length} candidates...`)

    const topCandidates = await Promise.all(
      topCandidatesRaw.map(async (candidate: any) => {
        const lat = candidate.coordinates?.latitude
        const lon = candidate.coordinates?.longitude

        if (lat && lon) {
          // Fetch FEMA, Wetlands, Cell Tower, and Airport data in parallel
          const [floodZone, wetlands, towers, airports] = await Promise.all([
            getFemaFloodZone(lat, lon),
            getWetlandsInfo(lat, lon),
            getNearbyTowers(lat, lon),
            getNearbyAirports(lat, lon)
          ])

          return {
            ...candidate,
            femaFloodZone: floodZone,
            wetlandsInfo: wetlands,
            nearbyTowers: towers,
            nearbyAirports: airports
          }
        }

        return {
          ...candidate,
          femaFloodZone: 'Coordinates unavailable',
          wetlandsInfo: 'Coordinates unavailable',
          nearbyTowers: { summary: 'Coordinates unavailable', towers: [] },
          nearbyAirports: { summary: 'Coordinates unavailable', airports: [], faaWarning: false }
        }
      })
    )

    console.log(`Environmental data fetched for ${topCandidates.length} candidates`)

    // Save search to database
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(
        'SCIP-SEARCH',
        JSON.stringify({
          type: 'scip',
          lat: latitude,
          lon: longitude,
          rings: [0.25, 0.50, 1.0],
          siteName
        }),
        topCandidates.length
      ).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }

    console.log(`SCIP Search found ${properties.length} total, ${topCandidates.length} candidates`)

    return c.json({
      success: true,
      candidates: topCandidates,
      rings: {
        ring025: { radius: 0.25, count: ring025.length, properties: ring025 },
        ring050: { radius: 0.50, count: ring050.length, properties: ring050 },
        ring100: { radius: 1.0, count: ring100.length, properties: ring100 }
      },
      meta: {
        centerLat: latitude,
        centerLon: longitude,
        siteName: siteName || null,
        totalProperties: properties.length,
        candidateCount: topCandidates.length,
        searchRadii: [0.25, 0.50, 1.0],
        source: 'ATTOM Data'
      }
    })

  } catch (error) {
    console.error('SCIP search error:', error)
    return c.json({
      error: 'Failed to perform SCIP search',
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
