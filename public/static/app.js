// MapDog - Site Acquisition Parcel Search Frontend
let currentResults = []
let currentMode = 'county' // 'county', 'coordinate', 'bulk', or 'scip'
let currentSCIPProject = null

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  
  // Allow Enter key to trigger search
  document.getElementById('countyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchParcels()
  })
})

// Switch between search modes
function switchMode(mode) {
  currentMode = mode

  const countySection = document.getElementById('countyInput').parentElement.parentElement
  const coordinateSection = document.getElementById('coordinateSearchSection')
  const bulkSection = document.getElementById('bulkSearchSection')
  const scipSection = document.getElementById('scipSearchSection')
  const countyBtn = document.getElementById('countyModeBtn')
  const coordinateBtn = document.getElementById('coordinateModeBtn')
  const bulkBtn = document.getElementById('bulkModeBtn')
  const scipBtn = document.getElementById('scipModeBtn')

  // Hide all sections
  countySection.classList.add('hidden')
  coordinateSection.classList.add('hidden')
  bulkSection.classList.add('hidden')
  scipSection.classList.add('hidden')

  // Reset button styles
  countyBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  coordinateBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  bulkBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'
  scipBtn.className = 'px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all'

  // Show selected section and highlight button
  if (mode === 'county') {
    countySection.classList.remove('hidden')
    countyBtn.className = 'px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'coordinate') {
    coordinateSection.classList.remove('hidden')
    coordinateBtn.className = 'px-4 py-2 bg-red-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'bulk') {
    bulkSection.classList.remove('hidden')
    bulkBtn.className = 'px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg transition-all'
  } else if (mode === 'scip') {
    scipSection.classList.remove('hidden')
    scipBtn.className = 'px-4 py-2 bg-green-600 text-white font-semibold rounded-lg transition-all'
  }

  // Clear results when switching
  document.getElementById('results').innerHTML = ''
}

// Coordinate-based search for RF sites
async function coordinateSearch() {
  const lat = document.getElementById('coordLat').value.trim()
  const lon = document.getElementById('coordLon').value.trim()
  const radius = document.getElementById('coordRadius').value.trim()
  const unit = document.getElementById('coordUnit').value
  const county = document.getElementById('coordCounty').value.trim().toUpperCase()
  const siteName = document.getElementById('coordSiteName').value.trim()
  
  // Validate inputs
  if (!lat || !lon) {
    alert('⚠️ Please enter latitude and longitude\n\nGet these from your RF Engineer')
    return
  }
  
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ORANGE, ALACHUA')
    return
  }
  
  if (!radius || parseFloat(radius) <= 0) {
    alert('⚠️ Please enter a valid radius\n\nExample: 1 mile, 2 km')
    return
  }
  
  showLoading(true, `Searching ${radius} ${unit} radius around coordinates...`)
  
  try {
    const response = await fetch('/api/parcels/coordinate-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat,
        lon,
        radius,
        unit,
        county,
        siteName
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }
    
    currentResults = data.results || []
    displayCoordinateResults(data, county, siteName)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display coordinate search results
function displayCoordinateResults(data, county, siteName) {
  const resultsDiv = document.getElementById('results')
  const meta = data.meta || {}
  const found = meta.total || 0
  
  if (found === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-crosshairs text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No parcels found</p>
        <p class="text-sm text-gray-600 mt-2">County: ${county}</p>
        <p class="text-xs text-gray-500 mt-2">Try a different county or larger radius</p>
      </div>
    `
    return
  }
  
  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-crosshairs text-red-600 mr-2"></i>
            RF Search Ring Results
          </h3>
          ${siteName ? `<p class="text-sm font-semibold text-red-700 mt-1">${siteName}</p>` : ''}
          <div class="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><span class="font-semibold">Center:</span> ${meta.centerLat}, ${meta.centerLon}</div>
            <div><span class="font-semibold">Radius:</span> ${meta.radiusMiles} miles</div>
            <div><span class="font-semibold">County:</span> ${county}</div>
            <div><span class="font-semibold text-green-600">Parcels:</span> ${found}</div>
          </div>
          <p class="text-xs text-yellow-600 mt-2 bg-yellow-100 p-2 rounded">
            <i class="fas fa-info-circle mr-1"></i>
            ${meta.note || 'Showing parcels in county. Use address to verify distance.'}
          </p>
        </div>
        <button 
          onclick="saveAllCoordinateParcels('${county}', '${siteName}', ${meta.centerLat}, ${meta.centerLon}, ${meta.radiusMiles})"
          class="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          title="Save all to favorites"
        >
          <i class="fas fa-save mr-2"></i>Save All
        </button>
      </div>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${currentResults.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Save all parcels from coordinate search
async function saveAllCoordinateParcels(county, siteName, lat, lon, radius) {
  if (!currentResults || currentResults.length === 0) {
    alert('No parcels to save')
    return
  }
  
  const notes = siteName 
    ? `RF Site: ${siteName} (${lat}, ${lon}, ${radius}mi radius)` 
    : `Coordinate search: ${lat}, ${lon}, ${radius}mi`
  
  let saved = 0
  let errors = 0
  
  showLoading(true, `Saving ${currentResults.length} parcels...`)
  
  for (const parcel of currentResults) {
    const pin = parcel.identifiers?.pin || 'unknown'
    try {
      const response = await fetch('/api/parcels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: pin,
          county,
          parcelData: parcel,
          notes
        })
      })
      if (response.ok) saved++
      else errors++
    } catch (error) {
      errors++
    }
  }
  
  showLoading(false)
  alert(`✅ Saved ${saved} parcels${errors > 0 ? `\n⚠️ ${errors} failed to save` : ''}`)
  loadStats()
}

// Clear coordinate search form
function clearCoordinateSearch() {
  document.getElementById('coordLat').value = ''
  document.getElementById('coordLon').value = ''
  document.getElementById('coordRadius').value = '1'
  document.getElementById('coordUnit').value = 'miles'
  document.getElementById('coordCounty').value = ''
  document.getElementById('coordSiteName').value = ''
  document.getElementById('results').innerHTML = ''
  currentResults = []
}

// Bulk search parcels by PIN list
async function bulkSearchParcels() {
  const pinListText = document.getElementById('pinListInput').value.trim()
  const county = document.getElementById('bulkCounty').value.trim().toUpperCase()
  const searchRingName = document.getElementById('searchRingName').value.trim()
  
  if (!pinListText) {
    alert('⚠️ Please paste a PIN list\n\nOne PIN per line from your search ring tool')
    return
  }
  
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ORANGE, ALACHUA')
    return
  }
  
  // Parse PIN list (split by newlines, remove empty lines)
  const pins = pinListText.split('\n')
    .map(pin => pin.trim())
    .filter(pin => pin.length > 0)
  
  if (pins.length === 0) {
    alert('⚠️ No valid PINs found\n\nMake sure each PIN is on a new line')
    return
  }
  
  if (pins.length > 50) {
    if (!confirm(`You have ${pins.length} PINs. Only the first 50 will be searched. Continue?`)) {
      return
    }
  }
  
  showLoading(true, `Fetching ${Math.min(pins.length, 50)} parcels...`)
  
  try {
    const response = await fetch('/api/parcels/bulk-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pins: pins.slice(0, 50),
        county,
        searchRingName: searchRingName || null
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }
    
    currentResults = data.results || []
    displayBulkResults(data, county, searchRingName)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display bulk search results
function displayBulkResults(data, county, searchRingName) {
  const resultsDiv = document.getElementById('results')
  const requested = data.meta?.requested || 0
  const found = data.meta?.found || 0
  const errors = data.meta?.errors || 0
  
  if (found === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-exclamation-triangle text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No parcels found</p>
        <p class="text-sm text-gray-600 mt-2">Requested: ${requested} PINs • Found: 0</p>
        <p class="text-xs text-gray-500 mt-2">Check that PINs are correct for ${county} county</p>
      </div>
    `
    return
  }
  
  resultsDiv.innerHTML = `
    <div class="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-layer-group text-purple-600 mr-2"></i>
            Search Ring Results
          </h3>
          ${searchRingName ? `<p class="text-sm font-semibold text-purple-700 mt-1">${searchRingName}</p>` : ''}
          <p class="text-sm text-gray-600 mt-2">
            <span class="font-semibold">County:</span> ${county} • 
            <span class="font-semibold">Requested:</span> ${requested} PINs • 
            <span class="font-semibold text-green-600">Found:</span> ${found} parcels
            ${errors > 0 ? ` • <span class="font-semibold text-red-600">Errors:</span> ${errors}` : ''}
          </p>
        </div>
        <button 
          onclick="saveAllBulkParcels('${county}', '${searchRingName}')"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
          title="Save all to favorites"
        >
          <i class="fas fa-save mr-2"></i>Save All
        </button>
      </div>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${currentResults.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Save all parcels from bulk search
async function saveAllBulkParcels(county, searchRingName) {
  if (!currentResults || currentResults.length === 0) {
    alert('No parcels to save')
    return
  }
  
  const notes = searchRingName ? `Search Ring: ${searchRingName}` : 'Bulk search import'
  let saved = 0
  let errors = 0
  
  showLoading(true, `Saving ${currentResults.length} parcels...`)
  
  for (const parcel of currentResults) {
    const pin = parcel.identifiers?.pin || 'unknown'
    try {
      const response = await fetch('/api/parcels/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: pin,
          county,
          parcelData: parcel,
          notes
        })
      })
      if (response.ok) saved++
      else errors++
    } catch (error) {
      errors++
    }
  }
  
  showLoading(false)
  alert(`✅ Saved ${saved} parcels${errors > 0 ? `\n⚠️ ${errors} failed to save` : ''}`)
  loadStats()
}

// Clear bulk search form
function clearBulkSearch() {
  document.getElementById('pinListInput').value = ''
  document.getElementById('bulkCounty').value = ''
  document.getElementById('searchRingName').value = ''
  document.getElementById('results').innerHTML = ''
  currentResults = []
}

// Search parcels from MapWise API
async function searchParcels() {
  const county = document.getElementById('countyInput').value.trim().toUpperCase()
  const limit = document.getElementById('limitInput').value || 10
  
  // Client-side validation
  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ALACHUA, ORANGE, MIAMI-DADE')
    return
  }
  
  // Validate county format
  if (!/^[A-Z\s\-]+$/.test(county)) {
    alert('⚠️ Invalid county name\n\nCounty name should contain only letters, spaces, and hyphens.\n\nExample: MIAMI-DADE, ST JOHNS')
    return
  }
  
  // Validate limit
  const limitNum = parseInt(limit, 10)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    alert('⚠️ Invalid limit\n\nLimit must be between 1 and 100')
    return
  }
  
  showLoading(true)
  
  try {
    const response = await fetch(`/api/parcels/search?county=${encodeURIComponent(county)}&limit=${limit}`)
    const data = await response.json()
    
    // Handle API errors with helpful messages
    if (data.error) {
      let errorMsg = data.error
      
      // Add hints if available
      if (data.hint) {
        errorMsg += '\n\n💡 ' + data.hint
      }
      
      // Special handling for rate limiting
      if (data.statusCode === 429) {
        errorMsg += '\n\n⏱️ Please wait 30 seconds before searching again.'
      }
      
      // Special handling for no API key
      if (data.statusCode === 401) {
        errorMsg += '\n\n🔑 The MapWise API key needs to be configured.'
      }
      
      throw new Error(errorMsg)
    }
    
    // Check if we got results (even if meta.record_count is 0)
    const recordCount = data.meta?.record_count || 0
    currentResults = data.data || []
    
    if (recordCount === 0) {
      const resultsDiv = document.getElementById('results')
      resultsDiv.innerHTML = `
        <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <i class="fas fa-search text-yellow-600 text-4xl mb-3"></i>
          <p class="text-lg font-semibold text-gray-800">No parcels found for ${county}</p>
          <p class="text-sm text-gray-600 mt-2">${data.meta?.message || 'Try a different county or adjust your search.'}</p>
          ${data.meta?.total_count > 0 ? `
            <p class="text-xs text-gray-500 mt-2">
              Total parcels in ${county}: ${data.meta.total_count.toLocaleString()}
            </p>
          ` : ''}
        </div>
      `
      loadStats()
      return
    }
    
    displayResults(currentResults, county, data.meta)
    loadStats()
    
  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display search results
function displayResults(parcels, county, meta) {
  const resultsDiv = document.getElementById('results')
  
  if (!parcels || parcels.length === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-search text-4xl mb-3"></i>
        <p class="text-lg">No parcels found for ${county}</p>
      </div>
    `
    return
  }
  
  const totalCount = meta?.total_count ? ` (${meta.total_count.toLocaleString()} total available)` : ''
  
  resultsDiv.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-xl font-bold text-gray-800">
        <i class="fas fa-map-marked-alt text-blue-600 mr-2"></i>
        Found ${parcels.length} parcels in ${county}${totalCount}
      </h3>
    </div>
    <div class="space-y-3 max-h-96 overflow-y-auto">
      ${parcels.map((parcel, index) => renderParcelCard(parcel, index, county)).join('')}
    </div>
  `
}

// Render individual parcel card
function renderParcelCard(parcel, index, county) {
  const pin = parcel.identifiers?.pin || `${county}-${index}`
  const owner = parcel.owner?.primary_name || 'N/A'
  const address = parcel.site?.address || 'No address'
  const acres = parcel.land?.acres_gis || parcel.land?.acres_deed || 'N/A'
  const zoning = parcel.land?.zoning || 'N/A'
  const landUse = parcel.land?.land_use?.luse_desc || 'N/A'
  const marketValue = parcel.valuation?.market?.total || 0
  const city = parcel.site?.city || parcel.owner?.city || 'N/A'
  
  return `
    <div class="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-all">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-red-500 mr-2"></i>
            PIN: ${pin}
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div class="text-gray-600">
              <span class="font-semibold">Owner:</span> ${owner}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">City:</span> ${city}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Address:</span> ${address}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Acres:</span> ${typeof acres === 'string' ? parseFloat(acres).toFixed(2) : acres}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Zoning:</span> ${zoning}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Land Use:</span> ${landUse}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Market Value:</span> $${marketValue.toLocaleString()}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">County:</span> ${county}
            </div>
          </div>
          ${parcel.meta?.pa_pin_link ? `
            <a href="${parcel.meta.pa_pin_link}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs">
              <i class="fas fa-external-link-alt mr-1"></i>View Property Details
            </a>
          ` : ''}
        </div>
        <button 
          onclick="saveParcel('${pin.replace(/'/g, "\\'")}', '${county}', ${index})"
          class="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all transform hover:scale-105"
          title="Save to favorites"
        >
          <i class="fas fa-star"></i>
        </button>
      </div>
    </div>
  `
}

// Save parcel to favorites
async function saveParcel(parcelId, county, index) {
  const parcel = currentResults[index]
  const notes = prompt('Add notes for this parcel (optional):')
  
  try {
    const response = await fetch('/api/parcels/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parcelId,
        county,
        parcelData: parcel,
        notes
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      alert('✅ Parcel saved to favorites!')
      loadStats()
    } else {
      throw new Error('Failed to save')
    }
  } catch (error) {
    alert(`❌ Failed to save parcel: ${error.message}`)
  }
}

// View saved parcels
async function viewSavedParcels() {
  showLoading(true)
  
  try {
    const response = await fetch('/api/parcels/saved')
    const parcels = await response.json()
    
    const resultsDiv = document.getElementById('results')
    
    if (!parcels || parcels.length === 0) {
      resultsDiv.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-star text-4xl mb-3"></i>
          <p class="text-lg">No saved parcels yet</p>
        </div>
      `
      return
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-star text-yellow-500 mr-2"></i>
          Saved Parcels (${parcels.length})
        </h3>
      </div>
      <div class="space-y-3 max-h-96 overflow-y-auto">
        ${parcels.map(parcel => renderSavedParcelCard(parcel)).join('')}
      </div>
    `
  } catch (error) {
    showError('Failed to load saved parcels')
  } finally {
    showLoading(false)
  }
}

// Render saved parcel card
function renderSavedParcelCard(parcel) {
  const data = JSON.parse(parcel.parcel_data)
  const pin = data.identifiers?.pin || parcel.parcel_id
  const owner = data.owner?.primary_name || 'N/A'
  const address = data.site?.address || 'No address'
  const acres = data.land?.acres_gis || data.land?.acres_deed || 'N/A'
  const zoning = data.land?.zoning || 'N/A'
  const marketValue = data.valuation?.market?.total || 0
  
  return `
    <div class="bg-green-50 border-2 border-green-300 rounded-lg p-4">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg text-gray-800 mb-2">
            <i class="fas fa-map-pin text-green-600 mr-2"></i>
            ${pin} - ${parcel.county}
          </h4>
          ${parcel.notes ? `
            <p class="text-sm text-gray-700 mb-2 italic bg-yellow-100 p-2 rounded">
              <i class="fas fa-sticky-note mr-1"></i>${parcel.notes}
            </p>
          ` : ''}
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-gray-600">
              <span class="font-semibold">Owner:</span> ${owner}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Address:</span> ${address}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Acres:</span> ${typeof acres === 'string' ? parseFloat(acres).toFixed(2) : acres}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Zoning:</span> ${zoning}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Market Value:</span> $${marketValue.toLocaleString()}
            </div>
            <div class="text-gray-600">
              <span class="font-semibold">Status:</span> ${parcel.status}
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Saved: ${new Date(parcel.created_at).toLocaleDateString()}
          </p>
          ${data.meta?.pa_pin_link ? `
            <a href="${data.meta.pa_pin_link}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs mt-2 inline-block">
              <i class="fas fa-external-link-alt mr-1"></i>View Property Details
            </a>
          ` : ''}
        </div>
        <button 
          onclick="deleteSavedParcel(${parcel.id})"
          class="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
          title="Delete"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
}

// Delete saved parcel
async function deleteSavedParcel(id) {
  if (!confirm('Delete this saved parcel?')) return
  
  try {
    await fetch(`/api/parcels/saved/${id}`, { method: 'DELETE' })
    alert('✅ Parcel deleted')
    viewSavedParcels()
    loadStats()
  } catch (error) {
    alert('❌ Failed to delete parcel')
  }
}

// View search history
async function viewSearchHistory() {
  showLoading(true)
  
  try {
    const response = await fetch('/api/searches/history')
    const searches = await response.json()
    
    const resultsDiv = document.getElementById('results')
    
    if (!searches || searches.length === 0) {
      resultsDiv.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-history text-4xl mb-3"></i>
          <p class="text-lg">No search history yet</p>
        </div>
      `
      return
    }
    
    resultsDiv.innerHTML = `
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-history text-purple-600 mr-2"></i>
          Recent Searches (${searches.length})
        </h3>
      </div>
      <div class="space-y-2 max-h-96 overflow-y-auto">
        ${searches.map(search => `
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-center">
            <div>
              <span class="font-bold text-gray-800">${search.county}</span>
              <span class="text-sm text-gray-600 ml-3">
                <i class="fas fa-list-ol mr-1"></i>${search.results_count} results
              </span>
              <span class="text-xs text-gray-500 ml-3">
                ${new Date(search.created_at).toLocaleString()}
              </span>
            </div>
            <button 
              onclick="document.getElementById('countyInput').value='${search.county}'; searchParcels()"
              class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              <i class="fas fa-redo mr-1"></i>Repeat
            </button>
          </div>
        `).join('')}
      </div>
    `
  } catch (error) {
    showError('Failed to load search history')
  } finally {
    showLoading(false)
  }
}

// Export current results to CSV
function exportResults() {
  if (!currentResults || currentResults.length === 0) {
    alert('No results to export. Please search first.')
    return
  }
  
  // Define CSV columns
  const headers = [
    'PIN', 'County', 'Owner', 'Address', 'City', 'Zipcode', 
    'Acres (GIS)', 'Acres (Deed)', 'Zoning', 'Land Use', 
    'Market Value', 'Assessed Value', 'Year Built', 'Property Link'
  ]
  
  // Build CSV rows
  const rows = currentResults.map(parcel => {
    return [
      parcel.identifiers?.pin || '',
      parcel.meta?.county || '',
      parcel.owner?.primary_name || '',
      parcel.site?.address || parcel.owner?.address_line1 || '',
      parcel.site?.city || parcel.owner?.city || '',
      parcel.site?.zipcode || parcel.owner?.zipcode || '',
      parcel.land?.acres_gis || '',
      parcel.land?.acres_deed || '',
      parcel.land?.zoning || '',
      parcel.land?.land_use?.luse_desc || '',
      parcel.valuation?.market?.total || '',
      parcel.valuation?.assessed_total || '',
      parcel.building?.year_built_actual || '',
      parcel.meta?.pa_pin_link || ''
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
  })
  
  const csv = [headers.join(','), ...rows].join('\n')
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mapdog-parcels-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  alert(`✅ Exported ${currentResults.length} parcels to CSV`)
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/api/stats')
    const stats = await response.json()
    
    document.getElementById('totalSearches').textContent = stats.totalSearches
    document.getElementById('savedCount').textContent = stats.savedParcels
    document.getElementById('lastSearch').textContent = stats.lastCounty
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

// Show/hide loading indicator
function showLoading(show, message = 'Fetching parcels...') {
  const loadingDiv = document.getElementById('loading')
  if (show) {
    loadingDiv.innerHTML = `
      <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
      <p class="text-gray-600 mt-2">${message}</p>
    `
  }
  loadingDiv.classList.toggle('hidden', !show)
  if (show) {
    document.getElementById('results').innerHTML = ''
  }
}

// Show error message
function showError(message) {
  const resultsDiv = document.getElementById('results')

  // Parse message for better display
  const lines = message.split('\n').filter(line => line.trim())

  resultsDiv.innerHTML = `
    <div class="bg-red-100 border-2 border-red-400 rounded-lg p-6 text-center">
      <i class="fas fa-exclamation-triangle text-red-600 text-4xl mb-3"></i>
      ${lines.map((line, i) => {
        if (line.startsWith('💡') || line.startsWith('⏱️') || line.startsWith('🔑')) {
          return `<p class="text-sm text-gray-700 mt-2 bg-white p-2 rounded">${line}</p>`
        }
        return `<p class="text-red-800 font-semibold ${i > 0 ? 'mt-2' : ''}">${line}</p>`
      }).join('')}
      <button
        onclick="document.getElementById('results').innerHTML=''"
        class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
      >
        Dismiss
      </button>
    </div>
  `
}

// =====================================================
// SCIP Auto-Filler Functions
// =====================================================

// Generate SCIP candidates
async function generateSCIP() {
  const projectName = document.getElementById('scipProjectName').value.trim()
  const county = document.getElementById('scipCounty').value.trim().toUpperCase()
  const carrier = document.getElementById('scipCarrier').value.trim()
  const lat = document.getElementById('scipLat').value.trim()
  const lon = document.getElementById('scipLon').value.trim()
  const radius = document.getElementById('scipRadius').value.trim()
  const rfEngineerName = document.getElementById('scipRfEngineer').value.trim()
  const projectNotes = document.getElementById('scipNotes').value.trim()

  // Validate required inputs
  if (!projectName) {
    alert('⚠️ Please enter a project name\n\nExample: Orlando Tower Site 1')
    return
  }

  if (!county) {
    alert('⚠️ Please enter a county name\n\nExample: ORANGE, ALACHUA')
    return
  }

  if (!lat || !lon) {
    alert('⚠️ Please enter latitude and longitude\n\nGet these from your RF Engineer')
    return
  }

  if (!radius || parseFloat(radius) <= 0) {
    alert('⚠️ Please enter a valid search radius\n\nRecommended: 0.5 miles for cell tower sites')
    return
  }

  showLoading(true, `🔍 Analyzing properties within ${radius} miles...\n⚙️ Generating SCIP candidates...\n📊 Scoring and ranking sites...`)

  try {
    const response = await fetch('/api/scip/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        searchRingCenterLat: lat,
        searchRingCenterLon: lon,
        searchRadiusMiles: radius,
        county,
        rfEngineerName,
        carrier,
        projectNotes
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error + (data.hint ? '\n\n💡 ' + data.hint : ''))
    }

    currentSCIPProject = data
    displaySCIPResults(data)
    loadStats()

  } catch (error) {
    showError(error.message)
  } finally {
    showLoading(false)
  }
}

// Display SCIP results
function displaySCIPResults(data) {
  const resultsDiv = document.getElementById('results')
  const candidates = data.candidates || []

  if (candidates.length === 0) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <i class="fas fa-search text-yellow-600 text-4xl mb-3"></i>
        <p class="text-lg font-semibold text-gray-800">No suitable candidates found</p>
        <p class="text-sm text-gray-600 mt-2">${data.message || 'Try adjusting your search radius or county.'}</p>
      </div>
    `
    return
  }

  resultsDiv.innerHTML = `
    <div class="mb-6 bg-green-50 border-2 border-green-400 rounded-lg p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-2xl font-bold text-green-800">
          <i class="fas fa-check-circle mr-2"></i>
          SCIP Generated Successfully!
        </h3>
        <span class="text-sm bg-green-200 px-3 py-1 rounded-full font-semibold">
          Project ID: ${data.projectId}
        </span>
      </div>
      <p class="text-gray-700">
        <i class="fas fa-info-circle text-green-600 mr-2"></i>
        Found <strong>${candidates.length} top candidates</strong> ranked by suitability score.
        ${data.message}
      </p>
    </div>

    <div class="grid gap-6">
      ${candidates.map((candidate, index) => renderSCIPCard(candidate, index + 1, data.projectId)).join('')}
    </div>
  `
}

// Render individual SCIP candidate card
function renderSCIPCard(candidate, rank, projectId) {
  const scoreColor = candidate.overallScore >= 70 ? 'green' :
                     candidate.overallScore >= 50 ? 'yellow' : 'orange'

  return `
    <div class="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-all">
      <div class="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="bg-white text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                #${rank} Candidate
              </span>
              <span class="bg-${scoreColor}-200 text-${scoreColor}-800 font-bold px-3 py-1 rounded-full text-sm">
                Score: ${candidate.overallScore}/100
              </span>
            </div>
            <h3 class="text-2xl font-bold">${candidate.siteName || 'Untitled Site'}</h3>
            <p class="text-green-100 text-sm">${candidate.siteAddress || 'Address unavailable'}</p>
          </div>
          <i class="fas fa-tower-cell text-4xl opacity-30"></i>
        </div>
      </div>

      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Property Information -->
        <div class="space-y-2">
          <h4 class="font-bold text-gray-700 border-b pb-2">
            <i class="fas fa-home text-blue-600 mr-2"></i>Property Info
          </h4>
          <div class="text-sm space-y-1">
            <p><strong>Owner:</strong> ${candidate.ownerName || 'Unknown'}</p>
            <p><strong>Parcel:</strong> ${candidate.parcelNumber || 'Unknown'}</p>
            <p><strong>Size:</strong> ${candidate.parcelAcres || '0'} acres</p>
            <p><strong>Zoning:</strong> ${candidate.zoningDesignation || 'Unknown'}</p>
            <p><strong>Land Use:</strong> ${candidate.landUse || 'Unknown'}</p>
          </div>
        </div>

        <!-- Location & Coordinates -->
        <div class="space-y-2">
          <h4 class="font-bold text-gray-700 border-b pb-2">
            <i class="fas fa-map-marker-alt text-red-600 mr-2"></i>Location
          </h4>
          <div class="text-sm space-y-1">
            <p><strong>County:</strong> ${candidate.siteCounty || 'Unknown'}</p>
            ${candidate.latitude && candidate.longitude ? `
              <p><strong>Coordinates:</strong><br/>
                Lat: ${candidate.latitude.toFixed(6)}<br/>
                Lon: ${candidate.longitude.toFixed(6)}
              </p>
            ` : '<p class="text-gray-500">Coordinates unavailable</p>'}
            ${candidate.distanceFromCenter ? `
              <p><strong>Distance from center:</strong> ${candidate.distanceFromCenter.toFixed(2)} miles</p>
            ` : ''}
          </div>
        </div>

        <!-- Environmental -->
        <div class="space-y-2">
          <h4 class="font-bold text-gray-700 border-b pb-2">
            <i class="fas fa-leaf text-green-600 mr-2"></i>Environmental
          </h4>
          <div class="text-sm space-y-1">
            <p><strong>Flood Zone:</strong> ${candidate.floodZone || 'Unknown'}</p>
            <p><strong>Wetlands:</strong> ${candidate.wetlandsPresent ? 'Yes ⚠️' : 'No'}</p>
            ${candidate.elevationFeet ? `<p><strong>Elevation:</strong> ${Math.round(candidate.elevationFeet)} ft</p>` : ''}
            ${candidate.environmentalConcerns ? `
              <p class="text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                <i class="fas fa-exclamation-triangle mr-1"></i>
                ${candidate.environmentalConcerns}
              </p>
            ` : ''}
          </div>
        </div>

        <!-- Financial -->
        <div class="space-y-2">
          <h4 class="font-bold text-gray-700 border-b pb-2">
            <i class="fas fa-dollar-sign text-green-600 mr-2"></i>Financial
          </h4>
          <div class="text-sm space-y-1">
            <p><strong>Market Value:</strong> $${(candidate.marketValue || 0).toLocaleString()}</p>
            <p><strong>Assessed Value:</strong> $${(candidate.assessedValue || 0).toLocaleString()}</p>
            <p><strong>Est. Lease Rate:</strong> ${candidate.estimatedLeaseRate || 'TBD'}</p>
          </div>
        </div>

        <!-- Score Breakdown -->
        ${candidate.scoreBreakdown ? `
          <div class="col-span-2 space-y-2">
            <h4 class="font-bold text-gray-700 border-b pb-2">
              <i class="fas fa-chart-bar text-purple-600 mr-2"></i>Score Breakdown
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              ${Object.entries(candidate.scoreBreakdown).map(([key, value]) => `
                <div class="bg-gray-50 p-2 rounded text-center">
                  <div class="font-semibold capitalize">${key}</div>
                  <div class="text-lg text-blue-600">${value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Actions -->
      <div class="p-4 bg-gray-50 border-t flex gap-2 flex-wrap">
        <button
          onclick="viewFullSCIP(${rank - 1})"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
        >
          <i class="fas fa-file-alt mr-2"></i>View Full SCIP
        </button>
        <button
          onclick="syncToNotion(${projectId}, ${rank})"
          class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
        >
          <i class="fas fa-upload mr-2"></i>Sync to Notion
        </button>
        <button
          onclick="exportSCIPPDF(${rank - 1})"
          class="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all"
        >
          <i class="fas fa-download mr-2"></i>Export PDF
        </button>
      </div>
    </div>
  `
}

// View full SCIP details
function viewFullSCIP(index) {
  if (!currentSCIPProject || !currentSCIPProject.candidates[index]) {
    alert('SCIP data not available')
    return
  }

  const candidate = currentSCIPProject.candidates[index]
  const scipWindow = window.open('', '_blank', 'width=1200,height=800')

  scipWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SCIP - ${candidate.siteName}</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    </head>
    <body class="bg-gray-100 p-8">
      <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 class="text-3xl font-bold text-center mb-6 text-green-700">
          Site Candidate Information Package (SCIP)
        </h1>

        ${renderFullSCIPContent(candidate)}

        <div class="mt-8 text-center">
          <button onclick="window.print()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
            <i class="fas fa-print mr-2"></i>Print SCIP
          </button>
        </div>
      </div>
    </body>
    </html>
  `)

  scipWindow.document.close()
}

// Render full SCIP content
function renderFullSCIPContent(candidate) {
  return `
    <div class="space-y-6">
      <!-- Site Identification -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          📍 Site Identification
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Site Name:</td><td>${candidate.siteName || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Address:</td><td>${candidate.siteAddress || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">City:</td><td>${candidate.siteCity || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">County:</td><td>${candidate.siteCounty || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">State:</td><td>${candidate.siteState || 'FL'}</td></tr>
          <tr><td class="font-semibold py-1">ZIP Code:</td><td>${candidate.siteZip || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Latitude:</td><td>${candidate.latitude || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Longitude:</td><td>${candidate.longitude || 'N/A'}</td></tr>
        </table>
      </section>

      <!-- Property Information -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          🏠 Property Information
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Owner Name:</td><td>${candidate.ownerName || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Owner Address:</td><td>${candidate.ownerAddress || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Parcel Number:</td><td>${candidate.parcelNumber || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Parcel Acres:</td><td>${candidate.parcelAcres || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Lot Size:</td><td>${candidate.lotSize || 'N/A'}</td></tr>
        </table>
      </section>

      <!-- Zoning & Land Use -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          🏛️ Zoning & Land Use
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Zoning Designation:</td><td>${candidate.zoningDesignation || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Land Use:</td><td>${candidate.landUse || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Current Use:</td><td>${candidate.currentUse || 'N/A'}</td></tr>
        </table>
      </section>

      <!-- Environmental Concerns -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          🌿 Environmental Concerns
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Wetlands Present:</td><td>${candidate.wetlandsPresent ? 'Yes' : 'No'}</td></tr>
          <tr><td class="font-semibold py-1">Flood Zone:</td><td>${candidate.floodZone || 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Historical Site:</td><td>${candidate.historicalSite ? 'Yes' : 'No'}</td></tr>
          <tr><td class="font-semibold py-1">Concerns:</td><td>${candidate.environmentalConcerns || 'None identified'}</td></tr>
        </table>
      </section>

      <!-- RF Engineering Data -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          📡 RF Engineering Data
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Elevation (ft):</td><td>${candidate.elevationFeet ? Math.round(candidate.elevationFeet) : 'N/A'}</td></tr>
          <tr><td class="font-semibold py-1">Terrain Type:</td><td>${candidate.terrainType || 'Unknown'}</td></tr>
          <tr><td class="font-semibold py-1">Line of Sight:</td><td>${candidate.lineOfSight || 'To be determined'}</td></tr>
        </table>
      </section>

      <!-- Financial Information -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          💰 Financial Information
        </h2>
        <table class="w-full text-sm">
          <tr><td class="font-semibold py-1">Assessed Value:</td><td>$${(candidate.assessedValue || 0).toLocaleString()}</td></tr>
          <tr><td class="font-semibold py-1">Market Value:</td><td>$${(candidate.marketValue || 0).toLocaleString()}</td></tr>
          <tr><td class="font-semibold py-1">Estimated Lease Rate:</td><td>${candidate.estimatedLeaseRate || 'TBD'}</td></tr>
        </table>
      </section>

      <!-- Site Score -->
      <section>
        <h2 class="text-2xl font-bold border-b-2 border-green-600 pb-2 mb-4">
          ⭐ Site Suitability Score
        </h2>
        <div class="text-center text-4xl font-bold text-green-600 my-4">
          ${candidate.overallScore}/100
        </div>
        ${candidate.scoreBreakdown ? `
          <div class="grid grid-cols-4 gap-2 text-sm text-center">
            ${Object.entries(candidate.scoreBreakdown).map(([key, value]) => `
              <div class="bg-gray-100 p-2 rounded">
                <div class="font-semibold capitalize">${key}</div>
                <div class="text-lg">${value}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </section>
    </div>
  `
}

// Sync SCIP to Notion
async function syncToNotion(projectId, candidateRank) {
  if (confirm(`Sync Candidate #${candidateRank} to Notion?\n\nThis will create a new page in your Notion database.`)) {
    alert('Notion sync coming soon! Configure NOTION_API_KEY and NOTION_DATABASE_ID environment variables.')
    // Implementation would call /api/scip/sync-notion/:candidateId
  }
}

// Export SCIP as PDF (placeholder)
function exportSCIPPDF(index) {
  alert('PDF export coming soon! For now, use the "View Full SCIP" button and print to PDF.')
}

// Clear SCIP search form
function clearSCIPSearch() {
  document.getElementById('scipProjectName').value = ''
  document.getElementById('scipCounty').value = ''
  document.getElementById('scipCarrier').value = ''
  document.getElementById('scipLat').value = ''
  document.getElementById('scipLon').value = ''
  document.getElementById('scipRadius').value = '0.5'
  document.getElementById('scipRfEngineer').value = ''
  document.getElementById('scipNotes').value = ''
  document.getElementById('results').innerHTML = ''
  currentSCIPProject = null
}
