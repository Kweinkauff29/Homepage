-- Bird Shop Schema v15
-- Shop Items Catalog (static items available for purchase)
CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,       -- 'clothing' or 'pet'
  category TEXT,            -- 'hat', 'glasses', 'scarf', 'companion'
  price INTEGER NOT NULL,
  svg_data TEXT,            -- inline SVG or path
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- User Inventory (items users have purchased)
CREATE TABLE IF NOT EXISTS user_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  purchased_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES shop_items(id)
);

-- Add equipped_items to user_preferences
ALTER TABLE user_preferences ADD COLUMN equipped_items TEXT;
