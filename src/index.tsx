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
  const limit = c.req.query('limit') || '10'
  
  if (!county) {
    return c.json({ error: 'County parameter is required' }, 400)
  }

  const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
  
  try {
    // Call MapWise API
    const response = await fetch(
      `https://maps.mapwise.com/api_v2/parcels?searchCounty=${encodeURIComponent(county)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`MapWise API error: ${response.status}`)
    }

    const data = await response.json()

    // Save search to database
    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(county, JSON.stringify({ limit }), data.features?.length || 0).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }

    return c.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return c.json({ 
      error: 'Failed to fetch parcels',
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
