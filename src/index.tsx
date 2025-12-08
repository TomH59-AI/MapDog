import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'
import { generateSCIPData, scoreProperty, enrichParcelData } from './scip-service'
import { syncSCIPToNotion, createFullSCIPPage, verifyNotionDatabase } from './notion-service'

type Bindings = {
  DB: D1Database
  MAPWISE_API_KEY: string
  NOTION_API_KEY?: string
  NOTION_DATABASE_ID?: string
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
          <div class="flex gap-2 mb-6 border-b-2 border-gray-200 pb-2 flex-wrap">
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
              <i class="fas fa-file-alt mr-2"></i>SCIP Auto-Filler
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

          {/* SCIP Auto-Filler (Hidden by default) */}
          <div id="scipSearchSection" class="hidden mb-6">
            <label class="block text-gray-700 text-lg font-semibold mb-3">
              <i class="fas fa-file-alt text-green-600 mr-2"></i>
              SCIP Auto-Filler - Site Candidate Information Package
            </label>
            <p class="text-sm text-gray-600 mb-4">
              Generate comprehensive SCIP reports for cell tower site candidates. Enter coordinates and we'll find the best properties, score them, and auto-fill all SCIP fields.
            </p>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                id="scipProjectName"
                placeholder="Project/Site Name (e.g., Orlando Tower Site 1)"
                class="col-span-2 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipCounty"
                placeholder="County (e.g., ORANGE)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipCarrier"
                placeholder="Carrier (optional)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                id="scipLat"
                placeholder="Latitude (e.g., 28.5383)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
              <input
                type="text"
                id="scipLon"
                placeholder="Longitude (e.g., -81.3792)"
                class="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
              <div class="flex gap-2">
                <input
                  type="number"
                  id="scipRadius"
                  placeholder="Radius"
                  value="0.5"
                  min="0.1"
                  max="5"
                  step="0.1"
                  class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                />
                <span class="px-2 py-2 text-gray-600 font-semibold">miles</span>
              </div>
            </div>

            <div class="mb-3">
              <input
                type="text"
                id="scipRfEngineer"
                placeholder="RF Engineer Name (optional)"
                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>

            <div class="mb-3">
              <textarea
                id="scipNotes"
                placeholder="Project Notes (optional)"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-sm"
              ></textarea>
            </div>

            <div class="flex gap-3">
              <button
                onclick="generateSCIP()"
                class="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <i class="fas fa-magic mr-2"></i>Generate SCIP Candidates
              </button>
              <button
                onclick="clearSCIPSearch()"
                class="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                <i class="fas fa-times mr-2"></i>Clear
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Finds 3-4 best properties within search ring • Auto-fills all SCIP fields • Syncs to Notion
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

// =====================================================
// SCIP (Site Candidate Information Package) API Routes
// =====================================================

// API: Create SCIP project and generate candidates
app.post('/api/scip/generate', async (c) => {
  try {
    const {
      projectName,
      searchRingCenterLat,
      searchRingCenterLon,
      searchRadiusMiles,
      county,
      rfEngineerName,
      carrier,
      projectNotes
    } = await c.req.json()

    // Validate inputs
    if (!projectName || !searchRingCenterLat || !searchRingCenterLon || !county) {
      return c.json({
        error: 'Missing required parameters',
        hint: 'Provide projectName, searchRingCenterLat, searchRingCenterLon, and county'
      }, 400)
    }

    const lat = parseFloat(searchRingCenterLat)
    const lon = parseFloat(searchRingCenterLon)
    const radius = parseFloat(searchRadiusMiles || '0.5')

    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
      return c.json({
        error: 'Invalid coordinates or radius',
        hint: 'Coordinates and radius must be valid numbers'
      }, 400)
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      return c.json({ error: 'Latitude must be between -90 and 90' }, 400)
    }
    if (lon < -180 || lon > 180) {
      return c.json({ error: 'Longitude must be between -180 and 180' }, 400)
    }

    const countyClean = county.trim().toUpperCase()
    if (!/^[A-Z\s\-]+$/.test(countyClean)) {
      return c.json({
        error: 'Invalid county name format',
        hint: 'County name should contain only letters, spaces, and hyphens'
      }, 400)
    }

    // Create SCIP project in database
    const projectResult = await c.env.DB.prepare(`
      INSERT INTO scip_projects (
        project_name, search_ring_center_lat, search_ring_center_lon,
        search_radius_miles, county, rf_engineer_name, carrier, project_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectName,
      lat,
      lon,
      radius,
      countyClean,
      rfEngineerName || null,
      carrier || null,
      projectNotes || null,
      'generating'
    ).run()

    const projectId = projectResult.meta.last_row_id

    // Fetch parcels from MapWise API within the search area
    const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
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

    if (parcels.length === 0) {
      await c.env.DB.prepare('UPDATE scip_projects SET status = ? WHERE id = ?')
        .bind('no_candidates', projectId).run()
      return c.json({
        success: true,
        projectId,
        message: 'No parcels found in the specified county',
        candidates: []
      })
    }

    // Generate SCIP data for each parcel and score them
    const candidates = []
    for (const parcel of parcels) {
      try {
        const scipData = await generateSCIPData(parcel, {
          projectName,
          searchRingCenterLat: lat,
          searchRingCenterLon: lon,
          searchRadiusMiles: radius,
          county: countyClean,
          rfEngineerName,
          carrier,
          projectNotes
        })

        candidates.push(scipData)

        // Log data source
        await c.env.DB.prepare(`
          INSERT INTO scip_generation_log (candidate_id, data_source, api_endpoint, response_status, data_retrieved)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          0, // Will update after candidate is created
          'mapwise',
          'parcels?searchCounty=' + countyClean,
          200,
          'Parcel data retrieved'
        ).run()

      } catch (error) {
        console.error('Error generating SCIP for parcel:', error)
      }
    }

    // Sort candidates by score (highest first)
    candidates.sort((a, b) => b.overallScore - a.overallScore)

    // Take top 3-4 candidates
    const topCandidates = candidates.slice(0, 4)

    // Save top candidates to database
    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i]
      try {
        await c.env.DB.prepare(`
          INSERT INTO scip_candidates (
            project_id, parcel_id, candidate_rank, site_name, site_address, site_city,
            site_state, site_zip, site_county, latitude, longitude, owner_name, owner_address,
            parcel_number, parcel_acres, lot_size, zoning_designation, land_use, current_use,
            flood_zone, elevation_feet, assessed_value, market_value, estimated_lease_rate,
            aerial_image_url, street_view_url, topo_map_url, overall_score, score_breakdown,
            mapwise_data, status, wetlands_present, environmental_concerns
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          projectId,
          candidate.parcelNumber || `UNKNOWN-${i}`,
          i + 1,
          candidate.siteName,
          candidate.siteAddress,
          candidate.siteCity,
          candidate.siteState,
          candidate.siteZip,
          candidate.siteCounty,
          candidate.latitude,
          candidate.longitude,
          candidate.ownerName,
          candidate.ownerAddress,
          candidate.parcelNumber,
          candidate.parcelAcres,
          candidate.lotSize,
          candidate.zoningDesignation,
          candidate.landUse,
          candidate.currentUse,
          candidate.floodZone,
          candidate.elevationFeet,
          candidate.assessedValue,
          candidate.marketValue,
          candidate.estimatedLeaseRate,
          candidate.aerialImageUrl,
          candidate.streetViewUrl,
          candidate.topoMapUrl,
          candidate.overallScore,
          JSON.stringify(candidate.scoreBreakdown),
          candidate.mapwiseData,
          'candidate',
          candidate.wetlandsPresent ? 1 : 0,
          candidate.environmentalConcerns
        ).run()
      } catch (error) {
        console.error('Error saving candidate to database:', error)
      }
    }

    // Update project status
    await c.env.DB.prepare('UPDATE scip_projects SET status = ? WHERE id = ?')
      .bind('completed', projectId).run()

    return c.json({
      success: true,
      projectId,
      candidatesGenerated: topCandidates.length,
      candidates: topCandidates,
      message: `Successfully generated ${topCandidates.length} SCIP candidates`
    })

  } catch (error) {
    console.error('SCIP generation error:', error)
    return c.json({
      error: 'Failed to generate SCIP',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API: Get SCIP project details
app.get('/api/scip/project/:id', async (c) => {
  try {
    const projectId = c.req.param('id')

    const project = await c.env.DB.prepare(
      'SELECT * FROM scip_projects WHERE id = ?'
    ).bind(projectId).first()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const candidates = await c.env.DB.prepare(
      'SELECT * FROM scip_candidates WHERE project_id = ? ORDER BY candidate_rank ASC'
    ).bind(projectId).all()

    return c.json({
      project,
      candidates: candidates.results
    })

  } catch (error) {
    console.error('Error fetching SCIP project:', error)
    return c.json({ error: 'Failed to fetch project' }, 500)
  }
})

// API: Get all SCIP projects
app.get('/api/scip/projects', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM scip_projects ORDER BY created_at DESC LIMIT 50'
    ).all()

    return c.json(result.results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch projects' }, 500)
  }
})

// API: Sync SCIP candidate to Notion
app.post('/api/scip/sync-notion/:candidateId', async (c) => {
  try {
    const candidateId = c.req.param('candidateId')

    // Get Notion credentials from environment
    const notionApiKey = c.env.NOTION_API_KEY
    const notionDatabaseId = c.env.NOTION_DATABASE_ID

    if (!notionApiKey || !notionDatabaseId) {
      return c.json({
        error: 'Notion integration not configured',
        hint: 'Set NOTION_API_KEY and NOTION_DATABASE_ID environment variables'
      }, 400)
    }

    // Fetch candidate from database
    const candidate = await c.env.DB.prepare(
      'SELECT * FROM scip_candidates WHERE id = ?'
    ).bind(candidateId).first()

    if (!candidate) {
      return c.json({ error: 'Candidate not found' }, 404)
    }

    // Prepare SCIP data for Notion
    const scipData = {
      ...candidate,
      scoreBreakdown: candidate.score_breakdown ? JSON.parse(candidate.score_breakdown as string) : {},
      distanceFromCenter: null // Calculate if needed
    }

    // Sync to Notion
    const pageId = await createFullSCIPPage(
      { notionApiKey, databaseId: notionDatabaseId },
      scipData
    )

    // Update candidate with Notion page ID
    await c.env.DB.prepare(
      'UPDATE scip_candidates SET notion_page_id = ?, notion_synced_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(pageId, candidateId).run()

    // Log the sync
    await c.env.DB.prepare(`
      INSERT INTO scip_generation_log (candidate_id, data_source, response_status, data_retrieved)
      VALUES (?, ?, ?, ?)
    `).bind(
      candidateId,
      'notion',
      200,
      'Synced to Notion page: ' + pageId
    ).run()

    return c.json({
      success: true,
      notionPageId: pageId,
      message: 'Successfully synced to Notion'
    })

  } catch (error) {
    console.error('Notion sync error:', error)
    return c.json({
      error: 'Failed to sync to Notion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API: Delete SCIP project
app.delete('/api/scip/project/:id', async (c) => {
  try {
    const projectId = c.req.param('id')

    // Delete project (candidates will be cascade deleted)
    await c.env.DB.prepare('DELETE FROM scip_projects WHERE id = ?').bind(projectId).run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to delete project' }, 500)
  }
})

export default app
