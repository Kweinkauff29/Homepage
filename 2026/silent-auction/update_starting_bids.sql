-- 25% Off Starting Bids Update Script for auction-db (D1)
-- Spectrum Tresses: $300 -> $225 (25% off)
-- Transit Miniature: $35 -> $25
-- Prismatic Petals: $275 -> $205
-- Roseate Bloom: $75 -> $55
-- Smokescreen Silhouette: $125 -> $95
-- Metropolitan Transit: $335 -> $250
-- Echoes of the Underground: $75 -> $55
-- Violet Blossom: $75 -> $55

UPDATE items SET starting_bid = 25 WHERE creative_name = 'Transit Miniature';
UPDATE items SET starting_bid = 205 WHERE creative_name = 'Prismatic Petals';
UPDATE items SET starting_bid = 55 WHERE creative_name = 'Roseate Bloom';
UPDATE items SET starting_bid = 225 WHERE creative_name = 'Spectrum Tresses';
UPDATE items SET starting_bid = 95 WHERE creative_name = 'Smokescreen Silhouette';
UPDATE items SET starting_bid = 250 WHERE creative_name = 'Metropolitan Transit';
UPDATE items SET starting_bid = 55 WHERE creative_name = 'Echoes of the Underground';
UPDATE items SET starting_bid = 55 WHERE creative_name = 'Violet Blossom';
