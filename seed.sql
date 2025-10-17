-- Sample search history for testing
INSERT OR IGNORE INTO searches (county, search_params, results_count) VALUES 
  ('ALACHUA', '{"limit": 10}', 10),
  ('ORANGE', '{"limit": 5}', 5),
  ('MIAMI-DADE', '{"limit": 20}', 20);

-- Sample saved parcels for testing
INSERT OR IGNORE INTO saved_parcels (parcel_id, county, parcel_data, notes, status) VALUES 
  ('ALACHUA-001', 'ALACHUA', '{"address": "123 Main St", "size": "5.2 acres"}', 'Great location near highway', 'prospect'),
  ('ALACHUA-002', 'ALACHUA', '{"address": "456 Tower Rd", "size": "2.8 acres"}', 'Zoned commercial', 'contacted');
