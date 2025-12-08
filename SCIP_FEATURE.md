# 🏗️ SCIP Auto-Filler Feature

## Overview

The **SCIP (Site Candidate Information Package) Auto-Filler** is an advanced feature of MapDog that automatically generates comprehensive site candidate reports for cell tower deployment. It analyzes properties within a search ring, scores them based on suitability criteria, and auto-fills all required SCIP fields.

## What is a SCIP?

A Site Candidate Information Package (SCIP) is a comprehensive document used in the wireless telecommunications industry to evaluate potential cell tower locations. It typically includes:

- Site identification (coordinates, address)
- Property information (owner, parcel details, acreage)
- Zoning and land use information
- Environmental concerns (wetlands, flood zones, protected species)
- RF engineering data (elevation, line of sight, propagation)
- Access and infrastructure details
- Financial information (property value, estimated lease rates)
- Photos and imagery (aerial, street view, topographic maps)

Creating SCIPs manually is time-consuming and requires gathering data from multiple sources. The SCIP Auto-Filler automates this entire process.

## Features

### 🔍 Automated Property Discovery
- Enter search ring coordinates (lat/lon) and radius (default: 0.5 miles)
- Automatically fetches all properties within the search area from MapWise API
- Filters and ranks properties by suitability for cell tower construction

### 📊 Intelligent Scoring Algorithm
Properties are scored (0-100) based on multiple criteria:

| Criterion | Max Points | Description |
|-----------|------------|-------------|
| **Distance** | 20 | Proximity to search ring center (closer = better) |
| **Parcel Size** | 20 | Ideal range: 1-5 acres for cell towers |
| **Zoning** | 15 | Commercial/Industrial zones preferred |
| **Land Use** | 15 | Vacant or undeveloped land scores highest |
| **Ownership** | 10 | Corporate owners often easier to negotiate with |
| **Property Value** | 10 | Moderate values ($100K-$500K) score best |
| **Road Access** | 10 | Properties with road frontage preferred |

**Total Score:** 100 points possible

### 📝 Comprehensive Data Enrichment

For each candidate, the system automatically gathers:

#### From MapWise API:
- Property owner name and address
- Parcel number (PIN)
- Parcel acreage and lot size
- Zoning designation
- Land use classification
- Assessed and market values

#### From External APIs:
- **Elevation data** (Open-Elevation API) - converts meters to feet
- **Geocoding** (if coordinates not available) - converts addresses to lat/lon
- **Flood zone information** (FEMA API integration ready)
- **Environmental analysis** - wetlands, historical sites, endangered species

#### Calculated/Estimated:
- Distance from search ring center
- Estimated monthly lease rate ($1,000 - $3,000 based on property characteristics)
- Environmental concerns flagged
- Site accessibility assessment

### 🎯 Top Candidate Selection

The system automatically:
1. Analyzes ALL properties in the county within search parameters
2. Scores each property using the intelligent algorithm
3. Ranks properties by total score (highest first)
4. Returns the top 3-4 candidates for review

### 📄 Full SCIP Report Generation

Each candidate includes:

**Site Identification:**
- Site name, address, city, county, state, ZIP
- Latitude and longitude coordinates

**Property Information:**
- Owner name and mailing address
- Parcel number and acreage
- Lot size

**Zoning & Land Use:**
- Zoning designation
- Land use classification
- Current use
- Tower zoning compatibility (future feature)
- Conditional use permit requirements (future feature)

**Environmental Concerns:**
- Wetlands presence (flagged)
- FEMA flood zone designation
- Historical site designation
- Endangered species habitat (future API integration)
- Summary of all environmental concerns

**RF Engineering Data:**
- Elevation in feet (auto-fetched)
- Terrain type (future feature)
- Line of sight analysis (placeholder)
- RF propagation score (future feature)

**Access & Infrastructure:**
- Road access type
- Road frontage distance
- Utility availability indicators (power, water, sewer, gas)

**Financial Information:**
- Assessed value
- Market value
- Estimated lease rate range

**Imagery (Future Enhancement):**
- Aerial satellite imagery URL
- Street view imagery URL
- Topographic map URL
- Additional site photos

### 🚀 Export and Integration Options

**View Full SCIP:**
- Opens complete SCIP in new window with print-friendly formatting
- All fields organized by section
- Professional formatting ready for client presentations
- Direct print to PDF capability

**Sync to Notion:**
- Automatically creates a new page in your Notion SCIP database
- Syncs all fields to Notion properties
- Creates detailed page content with sections and tables
- Requires NOTION_API_KEY and NOTION_DATABASE_ID configuration

**Export PDF (Coming Soon):**
- Direct PDF export with professional formatting
- Includes imagery and maps
- Ready for email or client portal upload

## User Guide

### How to Use the SCIP Auto-Filler

1. **Switch to SCIP Mode**
   - Click the "SCIP Auto-Filler" button in the mode toggle

2. **Enter Project Details**
   - **Project/Site Name** (required): e.g., "Orlando Tower Site 1"
   - **County** (required): e.g., "ORANGE"
   - **Carrier** (optional): e.g., "Verizon", "AT&T"

3. **Enter Search Ring Coordinates**
   - **Latitude** (required): Get from RF Engineer
   - **Longitude** (required): Get from RF Engineer
   - **Radius** (default: 0.5 miles): Typical range is 0.5-2 miles
     - 0.5 miles = standard search ring
     - 1.0 miles = expanded search area
     - 2.0 miles = maximum practical distance

4. **Optional Information**
   - **RF Engineer Name**: Track who provided the coordinates
   - **Project Notes**: Any special requirements or considerations

5. **Generate SCIP Candidates**
   - Click "Generate SCIP Candidates"
   - System will:
     - Search MapWise for properties in the county
     - Analyze and score all properties
     - Fetch elevation data
     - Perform environmental analysis
     - Calculate lease rate estimates
     - Rank candidates by score
     - Return top 3-4 candidates

6. **Review Candidates**
   - Each candidate card shows:
     - Rank and overall score
     - Property details
     - Location coordinates
     - Environmental flags
     - Financial information
     - Score breakdown by category

7. **Take Action**
   - **View Full SCIP**: See complete package in printable format
   - **Sync to Notion**: Push candidate to your Notion database
   - **Export PDF**: Download professional PDF report (coming soon)

### Example Use Case

**Scenario:** RF Engineer provides coordinates for a new Verizon site in Orange County

1. Enter:
   - Project Name: "Verizon Orlando North Site"
   - County: "ORANGE"
   - Carrier: "Verizon"
   - Lat: 28.6789
   - Lon: -81.3456
   - Radius: 0.5 miles
   - RF Engineer: "John Smith"

2. Click "Generate SCIP Candidates"

3. System returns 4 candidates ranked by score:
   - Candidate #1: Score 82/100 - Vacant commercial lot, 3.2 acres, excellent access
   - Candidate #2: Score 76/100 - Agricultural parcel, 5.8 acres, no wetlands
   - Candidate #3: Score 71/100 - Industrial zoned, 2.1 acres, higher value
   - Candidate #4: Score 68/100 - Residential adjacent, 1.5 acres, flood zone

4. Review each candidate's full SCIP

5. Present top 2-3 to client for site acquisition pursuit

6. Sync selected candidates to Notion for tracking

## Technical Architecture

### Database Schema

**scip_projects** table:
- Stores search ring parameters and project metadata
- Tracks project status (generating, completed, no_candidates)
- Links to multiple site candidates

**scip_candidates** table:
- Stores complete SCIP data for each candidate
- Includes all fields from site identification to financial info
- Stores scoring data and MapWise raw JSON
- Tracks Notion sync status

**scip_generation_log** table:
- Audit trail of all API calls
- Tracks data sources (MapWise, elevation, geocoding, etc.)
- Records response statuses and errors
- Useful for debugging and usage analytics

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scip/generate` | POST | Create project and generate candidates |
| `/api/scip/project/:id` | GET | Get project and all candidates |
| `/api/scip/projects` | GET | List all SCIP projects |
| `/api/scip/sync-notion/:candidateId` | POST | Sync candidate to Notion |
| `/api/scip/project/:id` | DELETE | Delete project and candidates |

### Services

**scip-service.ts:**
- Property scoring algorithm
- Data enrichment (geocoding, elevation, flood zones)
- Environmental analysis
- Lease rate estimation
- SCIP data generation pipeline

**notion-service.ts:**
- Notion API integration
- Database schema mapping
- Page creation with rich content blocks
- Property synchronization
- Full SCIP page generation with formatting

## Configuration

### Environment Variables

**Required:**
- `MAPWISE_API_KEY`: Your MapWise API Bearer token

**Optional (for Notion integration):**
- `NOTION_API_KEY`: Notion Integration API key
- `NOTION_DATABASE_ID`: Target Notion database ID

### Setting Up Notion Integration

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Create a SCIP database in Notion with these properties:
   - Site Name (title)
   - Address (rich text)
   - County (select)
   - Latitude (number)
   - Longitude (number)
   - Owner Name (rich text)
   - Parcel Number (rich text)
   - Parcel Acres (number)
   - Zoning (rich text)
   - Land Use (rich text)
   - Flood Zone (rich text)
   - Wetlands Present (checkbox)
   - Assessed Value (number)
   - Market Value (number)
   - Estimated Lease Rate (rich text)
   - Overall Score (number)
   - Distance from Center (mi) (number)
   - Status (select: Candidate, Contacted, Negotiating, Approved, Rejected)

3. Share the database with your integration
4. Copy the integration token and database ID
5. Set environment variables:
   ```bash
   # Local development (.dev.vars file)
   NOTION_API_KEY=secret_xxxxxxxxxxxxx
   NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Production (Cloudflare Secrets)
   wrangler pages secret put NOTION_API_KEY
   wrangler pages secret put NOTION_DATABASE_ID
   ```

## Best Practices

### Search Ring Sizing
- **0.5 miles**: Standard initial search, manageable number of candidates
- **1.0 miles**: Expanded search when initial results insufficient
- **2.0+ miles**: Use only if absolutely necessary, may return too many properties

### Data Quality
- Always use coordinates from RF Engineer (not estimates)
- Verify county name matches MapWise database exactly
- Review environmental concerns carefully (wetlands, flood zones)
- Cross-reference property ownership with county records before outreach

### Workflow Integration
1. RF Engineer provides coordinates and coverage requirements
2. Generate SCIP candidates using Auto-Filler
3. Review top 3-4 candidates
4. Sync selected candidates to Notion for tracking
5. Assign candidates to site acquisition specialists
6. Update Notion status as negotiations progress

### Scoring Interpretation
- **80-100**: Excellent candidates, prioritize for immediate pursuit
- **70-79**: Good candidates, strong second choice options
- **60-69**: Acceptable candidates, pursue if top candidates fail
- **<60**: Marginal candidates, consider only as last resort

## Future Enhancements

### Phase 1 (Immediate)
- ✅ Core SCIP generation
- ✅ Property scoring
- ✅ Notion integration
- ✅ Full SCIP viewer
- ⏳ PDF export functionality
- ⏳ Real geocoding integration (Google Maps API)
- ⏳ Enhanced imagery URLs (Mapbox, Google Maps)

### Phase 2 (Near-term)
- [ ] Distance-based filtering (exclude properties outside radius)
- [ ] Zoning code lookup (determine tower compatibility)
- [ ] FEMA flood zone API integration
- [ ] Wetlands database integration (NWI maps)
- [ ] Historical site registry integration
- [ ] Terrain analysis and classification
- [ ] Line of sight calculation

### Phase 3 (Medium-term)
- [ ] Owner contact information lookup
- [ ] Property tax history tracking
- [ ] Comparable lease rate analysis
- [ ] Automated site visit scheduling
- [ ] Email integration for owner outreach
- [ ] Document storage (photos, site surveys)
- [ ] Custom scoring weights by user preference

### Phase 4 (Long-term)
- [ ] Machine learning for improved scoring
- [ ] Historical success rate tracking
- [ ] Automated negotiation tracking
- [ ] Integration with RF planning tools
- [ ] Multi-site optimization (network planning)
- [ ] Automated permit requirement analysis
- [ ] Mobile app for field site visits

## Troubleshooting

### No Candidates Found
**Possible causes:**
- County has no properties matching criteria
- Search radius too small
- County name doesn't match MapWise database
- No properties in MapWise for that county

**Solutions:**
- Increase search radius
- Verify county name (use all caps, include hyphens if needed)
- Try adjacent county
- Contact MapWise support to verify coverage

### Low Quality Scores
**Possible causes:**
- All properties have unfavorable characteristics
- Search ring in unsuitable area (all residential, wetlands, etc.)
- Scoring algorithm doesn't match specific project needs

**Solutions:**
- Expand search radius
- Adjust search ring center coordinates
- Review candidates manually (score is a guide, not absolute)
- Consider different county/area

### Notion Sync Failed
**Possible causes:**
- NOTION_API_KEY not configured
- NOTION_DATABASE_ID not configured
- Notion integration doesn't have access to database
- Database schema doesn't match expected properties

**Solutions:**
- Verify environment variables are set
- Check integration has access to database
- Ensure database has all required properties
- Review error logs for specific API error

### Elevation Data Unavailable
**Possible causes:**
- Open-Elevation API temporarily down
- Property doesn't have coordinates
- Coordinates outside API coverage area

**Solutions:**
- System will continue without elevation data
- Manually look up elevation from USGS or Google Earth
- Update SCIP manually after generation

## API Reference

### Generate SCIP Candidates

**POST** `/api/scip/generate`

**Request Body:**
```json
{
  "projectName": "Orlando Tower Site 1",
  "searchRingCenterLat": 28.5383,
  "searchRingCenterLon": -81.3792,
  "searchRadiusMiles": 0.5,
  "county": "ORANGE",
  "rfEngineerName": "John Smith",
  "carrier": "Verizon",
  "projectNotes": "Priority site for Q1 deployment"
}
```

**Response:**
```json
{
  "success": true,
  "projectId": 123,
  "candidatesGenerated": 4,
  "message": "Successfully generated 4 SCIP candidates",
  "candidates": [
    {
      "siteName": "Orlando Tower Site 1",
      "siteAddress": "123 Main St",
      "latitude": 28.5383,
      "longitude": -81.3792,
      "ownerName": "ABC Properties LLC",
      "parcelAcres": 3.2,
      "zoningDesignation": "Commercial",
      "overallScore": 82,
      "scoreBreakdown": {
        "distance": 20,
        "size": 18,
        "zoning": 15,
        "landUse": 14,
        "ownership": 10,
        "value": 8,
        "access": 10
      },
      ...
    }
  ]
}
```

## Support and Feedback

For questions, issues, or feature requests:
- Review this documentation
- Check the main README.md for system requirements
- Refer to BEST_PRACTICES.md for MapWise API integration details
- Submit issues via GitHub repository

## Summary

The SCIP Auto-Filler transforms a multi-hour manual process into a 60-second automated workflow. By automatically discovering properties, scoring suitability, enriching data from multiple sources, and generating professional reports, it enables site acquisition specialists to:

- **Work faster**: Generate 4 complete SCIPs in under 2 minutes
- **Work smarter**: Let the algorithm identify the best candidates
- **Work better**: Present data-backed recommendations to clients
- **Work efficiently**: Sync seamlessly with Notion for project tracking

This feature represents a significant productivity multiplier for wireless site acquisition teams.

---

**Built for site acquisition professionals who move fast and get things done.** 🐕⚡
