-- Saved parcel searches
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  county TEXT NOT NULL,
  search_params TEXT,
  results_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Favorite/saved parcels for prospecting
CREATE TABLE IF NOT EXISTS saved_parcels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id TEXT UNIQUE NOT NULL,
  county TEXT NOT NULL,
  parcel_data TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'prospect',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_searches_county ON searches(county);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_parcels_county ON saved_parcels(county);
CREATE INDEX IF NOT EXISTS idx_saved_parcels_status ON saved_parcels(status);
CREATE INDEX IF NOT EXISTS idx_saved_parcels_parcel_id ON saved_parcels(parcel_id);
