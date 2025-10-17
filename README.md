# 🐕 MapDog

**Site Acquisition Parcel Intelligence for Wireless Industry**

MapDog is a powerful web application designed for site acquisition specialists in the wireless industry. It integrates with the MapWise API to search, analyze, and manage parcel data for identifying optimal cell tower locations.

## 🎯 Project Overview

- **Name**: MapDog
- **Goal**: Streamline site acquisition workflows by providing fast parcel search, data persistence, and export capabilities
- **Primary User**: Site Acquisition Specialists (Wireless/Telecom Industry)
- **Tech Stack**: Hono + TypeScript + Cloudflare Pages + D1 Database + MapWise API

## ✨ Currently Completed Features

### Core Functionality
- ✅ **County-based parcel search** via MapWise API integration
- ✅ **Real-time parcel data fetching** with configurable result limits
- ✅ **Secure API key management** using Cloudflare secrets
- ✅ **Server-side API proxy** to protect API credentials
- ✅ **Responsive UI** with Tailwind CSS and Font Awesome icons

### Data Management
- ✅ **Save parcels to favorites** with custom notes
- ✅ **Search history tracking** with timestamp and result counts
- ✅ **Parcel status management** (prospect, contacted, etc.)
- ✅ **Cloudflare D1 database** for persistent storage

### User Interface
- ✅ **Clean, modern interface** optimized for field work
- ✅ **Quick action buttons** for common workflows
- ✅ **Statistics dashboard** showing search activity
- ✅ **Detailed parcel cards** with all property data

### Export & Analysis
- ✅ **CSV export** of search results
- ✅ **Copy-friendly data formatting**
- ✅ **Mobile-responsive design** for field operations

## 🌐 Functional Entry URIs

### Main Interface
- `GET /` - MapDog main search interface

### API Endpoints

#### Parcel Search
- `GET /api/parcels/search?county={COUNTY}&limit={LIMIT}`
  - **county** (required): County name in uppercase (e.g., ALACHUA, ORANGE, MIAMI-DADE)
  - **limit** (optional): Number of results (default: 10, max: 100)
  - **Returns**: GeoJSON feature collection from MapWise API

#### Saved Parcels
- `POST /api/parcels/save`
  - **Body**: `{ parcelId, county, parcelData, notes }`
  - **Returns**: Success status and database ID
  
- `GET /api/parcels/saved`
  - **Returns**: Array of all saved parcels
  
- `DELETE /api/parcels/saved/:id`
  - **Returns**: Success status

#### Search History
- `GET /api/searches/history`
  - **Returns**: Last 20 searches with metadata

#### Statistics
- `GET /api/stats`
  - **Returns**: Total searches, saved parcels count, last search county

## 🚧 Features Not Yet Implemented

### Phase 2 (Planned)
- [ ] **Interactive map visualization** using Mapbox/Leaflet
- [ ] **Advanced filtering** (size, zoning, ownership type)
- [ ] **Proximity analysis** to existing towers/sites
- [ ] **Batch operations** (save multiple parcels at once)
- [ ] **Parcel comparison view**

### Phase 3 (Future)
- [ ] **User authentication** and multi-user support
- [ ] **Team collaboration** features (shared parcels, comments)
- [ ] **Integration with RF planning tools**
- [ ] **Automated site scoring** based on custom criteria
- [ ] **Email notifications** for parcel updates
- [ ] **Mobile app** (PWA or native)

## 🎯 Recommended Next Steps

1. **Deploy to Cloudflare Pages**
   - Set up Cloudflare D1 database
   - Configure MapWise API key as secret
   - Deploy to production edge network

2. **Add Interactive Map**
   - Integrate Mapbox GL JS or Leaflet
   - Plot parcels on map with clustering
   - Draw search radius and proximity tools

3. **Enhance Filtering**
   - Add size range filters (acres)
   - Zoning type selection
   - Ownership filters (public vs private)
   - Distance from existing sites

4. **Implement User Auth**
   - Cloudflare Access or Auth0 integration
   - Per-user saved parcels and notes
   - Team workspaces

5. **Performance Optimization**
   - Implement caching for frequent searches
   - Add pagination for large result sets
   - Optimize D1 queries with indexes

## 📊 Data Architecture

### Data Models

**searches** (Search History)
```sql
id: INTEGER PRIMARY KEY
county: TEXT - County searched
search_params: TEXT - JSON parameters (limit, filters)
results_count: INTEGER - Number of results returned
created_at: DATETIME - Timestamp
```

**saved_parcels** (Favorites)
```sql
id: INTEGER PRIMARY KEY
parcel_id: TEXT UNIQUE - Parcel identifier
county: TEXT - County name
parcel_data: TEXT - Full GeoJSON feature as JSON
notes: TEXT - User notes
status: TEXT - Workflow status (prospect, contacted, etc.)
created_at: DATETIME
updated_at: DATETIME
```

### Storage Services
- **Cloudflare D1**: SQLite-based relational database for searches and saved parcels
- **Cloudflare Secrets**: Secure storage for MapWise API key
- **Future**: Cloudflare R2 for document attachments (site photos, PDFs)

### Data Flow
1. **User searches county** → Frontend sends request to `/api/parcels/search`
2. **Backend proxies to MapWise API** → Authenticates with Bearer token
3. **Results saved to D1** → Search history logged
4. **User saves favorite parcels** → Stored in `saved_parcels` table
5. **Export to CSV** → Frontend generates CSV from current results

## 📖 User Guide

### Basic Search Workflow
1. **Enter county name** in the search box (e.g., ALACHUA)
2. **Set result limit** (default: 10, max: 100)
3. **Click Search** to fetch parcels
4. **Review results** in the parcel cards below
5. **Save promising parcels** by clicking the star button
6. **Add notes** when saving for future reference

### Managing Saved Parcels
1. Click **"Saved Parcels"** button to view favorites
2. Review notes and parcel details
3. Delete parcels no longer needed

### Reviewing Search History
1. Click **"Search History"** to see past searches
2. Click **"Repeat"** to re-run a previous search
3. Track your search patterns and coverage

### Exporting Data
1. After a search, click **"Export CSV"**
2. CSV file downloads with all parcel properties
3. Import into Excel, GIS tools, or databases

### Tips for Site Acquisition
- **Search systematically** by county to build comprehensive coverage
- **Save parcels immediately** when reviewing results
- **Add detailed notes** including site visit observations, contacts, etc.
- **Use status field** to track workflow (prospect → contacted → negotiating → closed)
- **Export regularly** to backup your research

## 🚀 Deployment

### Platform
- **Cloudflare Pages** (Edge-optimized global deployment)
- **Status**: ⏳ Ready for deployment
- **Last Updated**: 2025-10-17

### Environment Setup

#### Local Development
```bash
# Install dependencies
npm install

# Run migrations (create local database)
npm run db:migrate:local

# Seed test data
npm run db:seed

# Build project
npm run build

# Start development server with PM2
pm2 start ecosystem.config.cjs

# Test
curl http://localhost:3000
```

#### Production Deployment
```bash
# 1. Create D1 database
npx wrangler d1 create mapdog-production

# 2. Update wrangler.jsonc with database_id

# 3. Run production migrations
npm run db:migrate:prod

# 4. Set MapWise API key
npx wrangler pages secret put MAPWISE_API_KEY --project-name mapdog

# 5. Deploy
npm run deploy:prod
```

### Required Secrets
- `MAPWISE_API_KEY`: Your MapWise API Bearer token

### URLs
- **Production**: TBD (after deployment)
- **GitHub**: TBD (after push)

## 🔧 Development Commands

```bash
# Local development
npm run dev                  # Vite dev server
npm run dev:sandbox         # Wrangler local dev (with D1)
npm run build               # Build for production
npm run preview             # Preview production build

# Database
npm run db:migrate:local    # Run migrations locally
npm run db:migrate:prod     # Run migrations in production
npm run db:seed             # Seed test data
npm run db:reset            # Reset local database
npm run db:console:local    # SQL console (local)

# Deployment
npm run deploy              # Deploy to Cloudflare Pages
npm run deploy:prod         # Deploy with project name

# Utilities
npm run clean-port          # Kill processes on port 3000
npm run test                # Test local server
npm run git:commit "msg"    # Quick commit
```

## 🛠️ Tech Stack Details

### Backend
- **Hono**: Ultra-fast web framework (optimized for edge)
- **Cloudflare Workers**: Serverless edge runtime
- **TypeScript**: Type-safe development

### Frontend
- **Vanilla JavaScript**: No framework overhead
- **Tailwind CSS**: Utility-first styling (CDN)
- **Font Awesome**: Icon library (CDN)

### Database
- **Cloudflare D1**: Distributed SQLite database
- **Schema migrations**: Version-controlled database changes

### API Integration
- **MapWise API**: Parcel data provider
- **Server-side proxy**: Secure API key handling

## 📝 API Response Example

### MapWise Parcel Response
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "parcelid": "ALACHUA-12345",
        "address": "123 Main St",
        "owner": "John Doe",
        "acres": "5.2",
        "zoning": "Commercial",
        "taxvalue": "250000"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## 🐛 Known Issues
- None currently - fresh deployment

## 🤝 Contributing
This is a private tool for site acquisition workflows. Contact the developer for feature requests.

## 📄 License
Proprietary - Internal Use Only

## 👤 Author
Built for site acquisition specialists who move fast and get things done.

---

**MapDog** 🐕 - *Sniffing out the best sites in wireless.*
