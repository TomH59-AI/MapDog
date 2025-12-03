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
              <i class="fas fa-file-image mr-2"></i>SCIP Maps
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
              <i class="fas fa-file-image text-teal-600 mr-2"></i>
              SCIP Static Maps Generator
            </label>
            <p class="text-sm text-gray-600 mb-4">
              Generate all 10 required SCIP maps for a site location. Maps will be high-resolution and ready for copy/paste into your SCIP document.
            </p>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                id="scipSiteName"
                placeholder="Site Name (e.g., Orlando Tower 1)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipAddress"
                placeholder="Site Address (e.g., 123 Main St, Orlando, FL)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                id="scipLat"
                placeholder="Latitude (e.g., 28.5383)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipLon"
                placeholder="Longitude (e.g., -81.3792)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
              <select
                id="scipZoom"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              >
                <option value="14">Close (1/4 mi)</option>
                <option value="15" selected>Standard (500 ft)</option>
                <option value="16">Detailed (250 ft)</option>
                <option value="13">Wide (1/2 mi)</option>
                <option value="12">Overview (1 mi)</option>
              </select>
            </div>
            <div class="flex gap-3">
              <button
                onclick="generateScipMaps()"
                class="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-magic mr-2"></i>Generate All 10 SCIP Maps
              </button>
              <button
                onclick="clearScipMaps()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Maps: Aerial • Topography • Floodplain • Zoning • FLU • Wetlands • Parcel • Wind Speed • Airport • Cell Tower
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

// API: Generate SCIP Maps for site location
app.post('/api/scip-maps/generate', async (c) => {
  try {
    const { lat, lon, zoom, siteName, address } = await c.req.json()

    // Validate inputs
    if (!lat || !lon) {
      return c.json({
        error: 'Missing required coordinates',
        hint: 'Provide latitude and longitude'
      }, 400)
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    const zoomLevel = parseInt(zoom) || 15

    if (isNaN(latitude) || isNaN(longitude)) {
      return c.json({
        error: 'Invalid coordinates',
        hint: 'Coordinates must be valid numbers'
      }, 400)
    }

    if (latitude < -90 || latitude > 90) {
      return c.json({ error: 'Latitude must be between -90 and 90' }, 400)
    }
    if (longitude < -180 || longitude > 180) {
      return c.json({ error: 'Longitude must be between -180 and 180' }, 400)
    }

    // API Keys for high-quality map services
    const MAPBOX_API_KEY = 'pk.eyI1IjoidG9taG9sbGFuZDU5IiwiYSI6ImNtNG9iYWJnbzAycTd5cG15dHRqZENEZ3cifQ.AlzaSyBZyS6oMANyDrZZZE6Hr1Aeuj6Z1P1k7EE'
    const ESRI_API_KEY = 'AAPTxy8BH1VEsoebNVZXo8HurDfuy7_uzXxzsBVSTXAEc0GMZMhjogZoHyrU0daXIKm1zEGuhgDF_XwoBMAVmBgSt6oOAmuE2WK0ksy3ct3gA3gY-K_2BiLNQVnjV10sdpzuyKEC4wpUMhbwM2Q6W4mDL_AlCxFr33JG5lsCeP5kJ8ajsoJNUqheePSnf3bb6V3MS71PwAsYTm3zaMVApSjEok9LPGIeKLQdG9pcgqLYR1Y.AT1_nd4vHWnB'
    const USGS_TOKEN = 'AWf1yj@7CBsyEyIXFArYdJlq8MrrWGhc5mgD_ful_r1tKi@mWCIZB0AALa0R6ufs'
    const OPENCELLID_TOKEN = 'pk.6d4e560229de9121955a48aa246647b2'
    const NREL_API_KEY = 'syaFGtK6UHbc9IwiFsnWjoWjoDm4t2pd466Bfzpu'

    // Map dimensions for high-quality output
    const width = 800
    const height = 600

    // Calculate bounding box for the area (approximately 0.5 mile radius)
    const delta = 0.008 // roughly 0.5 miles
    const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`
    const bboxUSGS = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`

    // Generate URLs for all 10 SCIP map types using premium API services
    const maps = [
      {
        id: 'aerial',
        name: 'Aerial Map',
        description: 'High-resolution satellite/aerial imagery of the site',
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoomLevel},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image&token=${ESRI_API_KEY}`,
        note: 'Mapbox Satellite imagery with site marker'
      },
      {
        id: 'topography',
        name: 'Topography Map',
        description: 'USGS terrain and elevation contours',
        url: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/export?bbox=${bboxUSGS}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png32&f=image`,
        fallbackUrl: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoomLevel},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        note: 'USGS National Map - official topographic data'
      },
      {
        id: 'floodplain',
        name: 'Floodplain Map',
        description: 'FEMA National Flood Hazard Layer zones',
        url: `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png32&transparent=false&layers=show:28&f=image`,
        fallbackUrl: `https://basemap.nationalmap.gov/arcgis/rest/services/USGSHydroCached/MapServer/export?bbox=${bboxUSGS}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png32&f=image`,
        wmsUrl: 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer',
        note: 'FEMA NFHL - official flood zone designations (Zone A, AE, X, etc.)'
      },
      {
        id: 'zoning',
        name: 'Zoning Map',
        description: 'Local zoning districts and classifications',
        url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoomLevel},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`,
        note: 'Base map with site marker - verify zoning at local municipality GIS portal'
      },
      {
        id: 'flu',
        name: 'FLU Map (Future Land Use)',
        description: 'Future land use planning designations',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+0066ff(${longitude},${latitude})/${longitude},${latitude},${zoomLevel},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`,
        note: 'Base map with site marker - verify FLU at local comprehensive plan'
      },
      {
        id: 'wetlands',
        name: 'Wetlands Map',
        description: 'National Wetlands Inventory (NWI) data',
        url: `https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png32&transparent=false&f=image`,
        wmsUrl: 'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer',
        note: 'US Fish & Wildlife Service NWI - official wetlands delineation'
      },
      {
        id: 'parcel',
        name: 'Parcel Map',
        description: 'Property boundaries and parcel lines',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoomLevel + 1},0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${longitude - 0.004},${latitude - 0.003},${longitude + 0.004},${latitude + 0.003}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`,
        note: 'Detailed street view - parcel data available via county property appraiser'
      },
      {
        id: 'windspeed',
        name: 'Wind Speed Map',
        description: 'NREL wind resource data for the area',
        url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+00cc00(${longitude},${latitude})/${longitude},${latitude},10,0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        dataSource: `https://developer.nrel.gov/api/wind-toolkit/v2/wind/wtk-srw-download?api_key=${NREL_API_KEY}&lat=${latitude}&lon=${longitude}`,
        nrelApiUrl: `https://developer.nrel.gov/api/wind-toolkit/v2/wind/wtk-srw-download?api_key=${NREL_API_KEY}&lat=${latitude}&lon=${longitude}&year=2012`,
        note: 'Regional wind view - NREL Wind Toolkit data available for detailed analysis'
      },
      {
        id: 'airport',
        name: 'Closest Airport Map',
        description: 'Nearby airports and airspace considerations',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ff6600(${longitude},${latitude})/${longitude},${latitude},11,0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${longitude - 0.1},${latitude - 0.08},${longitude + 0.1},${latitude + 0.08}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`,
        dataSource: 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/',
        note: 'Wide area view - FAA Part 77 notification required for structures >200ft AGL'
      },
      {
        id: 'celltower',
        name: 'Closest Cell Tower and Antenna Map',
        description: 'Existing cell towers and antenna structures nearby',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+cc0000(${longitude},${latitude})/${longitude},${latitude},14,0/${width}x${height}@2x?access_token=${MAPBOX_API_KEY}`,
        fallbackUrl: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${longitude - 0.02},${latitude - 0.015},${longitude + 0.02},${latitude + 0.015}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`,
        openCellIdUrl: `https://opencellid.org/ajax/searchCell.php?key=${OPENCELLID_TOKEN}&lat=${latitude}&lon=${longitude}&format=json`,
        dataSource: 'https://www.fcc.gov/media/radio/antenna-structure-registration-asr',
        note: 'Area view - check FCC ASR and OpenCellID for registered towers'
      }
    ]

    // Save generation request to database for tracking
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(
        'SCIP-MAPS',
        JSON.stringify({
          type: 'scip-maps',
          lat: latitude,
          lon: longitude,
          zoom: zoomLevel,
          siteName,
          address
        }),
        maps.length
      ).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }

    return c.json({
      success: true,
      siteName: siteName || 'Unnamed Site',
      address: address || '',
      coordinates: { lat: latitude, lon: longitude },
      zoom: zoomLevel,
      mapCount: maps.length,
      maps,
      generated: new Date().toISOString(),
      instructions: {
        usage: 'Right-click on any map image to copy or save for your SCIP document',
        notes: [
          'Maps use premium Mapbox, USGS, and ESRI services for high quality',
          'FEMA flood zones and NWI wetlands are official federal data sources',
          'Zoning and FLU data should be verified with local municipality GIS',
          'Wind data available via NREL API for detailed site analysis'
        ]
      }
    })

  } catch (error) {
    console.error('SCIP maps generation error:', error)
    return c.json({
      error: 'Failed to generate SCIP maps',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API: Get airport data near coordinates
app.get('/api/scip-maps/airports', async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')
  const radius = c.req.query('radius') || '30' // miles

  if (!lat || !lon) {
    return c.json({ error: 'Latitude and longitude required' }, 400)
  }

  // Return info about checking FAA airport data
  return c.json({
    note: 'Airport proximity should be checked via FAA resources',
    resources: [
      {
        name: 'FAA OE/AAA Tool',
        url: 'https://oeaaa.faa.gov/oeaaa/external/portal.jsp',
        description: 'Official FAA tool for determining if notification is required for structures'
      },
      {
        name: 'SkyVector',
        url: `https://skyvector.com/?ll=${lat},${lon}&chart=301&zoom=2`,
        description: 'Aviation charts showing airports and airspace'
      },
      {
        name: 'AirNav',
        url: 'https://www.airnav.com/airports/',
        description: 'Airport directory with detailed information'
      }
    ],
    coordinates: { lat: parseFloat(lat as string), lon: parseFloat(lon as string) },
    searchRadius: `${radius} miles`,
    faaRegulation: 'Part 77 requires notification for structures >200ft AGL or within airport surfaces'
  })
})

// API: Get cell tower data near coordinates
app.get('/api/scip-maps/celltowers', async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')
  const radius = c.req.query('radius') || '5' // miles

  if (!lat || !lon) {
    return c.json({ error: 'Latitude and longitude required' }, 400)
  }

  // Return info about checking FCC tower data
  return c.json({
    note: 'Cell tower data should be checked via FCC and industry resources',
    resources: [
      {
        name: 'FCC ASR Database',
        url: 'https://wireless2.fcc.gov/UlsApp/AsrSearch/asrRegistrationSearch.jsp',
        description: 'Official FCC Antenna Structure Registration database'
      },
      {
        name: 'CellMapper',
        url: `https://www.cellmapper.net/map?MCC=311&MNC=480&type=LTE&latitude=${lat}&longitude=${lon}&zoom=14`,
        description: 'Crowdsourced cell tower mapping'
      },
      {
        name: 'AntennaSearch',
        url: `https://www.antennasearch.com/HTML/search/search.php?address=&lat=${lat}&lng=${lon}`,
        description: 'Database of registered antenna structures'
      }
    ],
    coordinates: { lat: parseFloat(lat as string), lon: parseFloat(lon as string) },
    searchRadius: `${radius} miles`
  })
})

export default app
