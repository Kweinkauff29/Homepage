-- SQL script to remove the 6 requested items and their associated bids
-- Target database: auction-db (D1)

-- 1. Remove bids for the 6 items
DELETE FROM bids WHERE item_id IN (
    SELECT id FROM items WHERE creative_name IN (
        'Canine Canvas',
        'The Creator''s Tool',
        'Shaded Gaze',
        'Blush Portrait',
        'Bubblegum Dreams',
        'Chromatic Flora'
    )
);

-- 2. Remove the 6 items from the items table
DELETE FROM items WHERE creative_name IN (
    'Canine Canvas',
    'The Creator''s Tool',
    'Shaded Gaze',
    'Blush Portrait',
    'Bubblegum Dreams',
    'Chromatic Flora'
);
