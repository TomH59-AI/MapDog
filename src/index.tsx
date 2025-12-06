import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
  MAPWISE_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic())
app.use('/assets/*', serveStatic())

// API: Search parcels from MapWise
app.get('/api/parcels/search', async (c) => {
  const county = c.req.query('county')
  const limitStr = c.req.query('limit') || '10'

  if (!county) {
    return c.json({
      error: 'County parameter is required',
      hint: 'Provide a county name (e.g., ALACHUA, ORANGE, MIAMI-DADE)'
    }, 400)
  }

  const countyClean = county.trim().toUpperCase()
  if (!/^[A-Z\s\-]+$/.test(countyClean)) {
    return c.json({
      error: 'Invalid county name format',
      hint: 'County name should contain only letters, spaces, and hyphens'
    }, 400)
  }

  const limit = parseInt(limitStr, 10)
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return c.json({
      error: 'Invalid limit parameter',
      hint: 'Limit must be a number between 1 and 100'
    }, 400)
  }

  const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'

  try {
    const response = await fetch(
      `https://maps.mapwise.com/api_v2/parcels?searchCounty=${encodeURIComponent(countyClean)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

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
    const recordCount = data.meta?.record_count || 0
    const totalCount = data.meta?.total_count || 0

    if (recordCount === 0) {
      console.log(`No results found for ${countyClean}`)
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

    try {
      await c.env.DB.prepare(
        'INSERT INTO searches (county, search_params, results_count) VALUES (?, ?, ?)'
      ).bind(countyClean, JSON.stringify({ limit }), recordCount).run()
    } catch (dbError) {
      console.error('Database save error:', dbError)
    }

    console.log(`Successfully retrieved ${recordCount} parcels for ${countyClean}`)
    return c.json(data)

  } catch (error) {
    console.error('API Error:', error)
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

    const radiusMiles = unit === 'km' ? searchRadius * 0.621371 : searchRadius
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

    const results = parcels.map((parcel: any) => ({
      ...parcel,
      _searchRing: {
        centerLat: latitude,
        centerLon: longitude,
        radiusMiles: radiusMiles,
        siteName: siteName || null
      }
    }))

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
        note: 'MapWise does not provide parcel coordinates. All parcels in county returned.'
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

    const countyClean = county.trim().toUpperCase()
    if (!/^[A-Z\s\-]+$/.test(countyClean)) {
      return c.json({
        error: 'Invalid county name format',
        hint: 'County name should contain only letters, spaces, and hyphens'
      }, 400)
    }

    const apiKey = c.env.MAPWISE_API_KEY || 'DEMO_KEY'
    const results: any[] = []
    const errors: any[] = []

    for (const pin of pins.slice(0, 50)) {
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

export default app
