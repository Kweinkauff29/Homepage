-- Create Test User 'TestWhale' safely
INSERT OR IGNORE INTO users (name, email, coin_balance) 
VALUES ('TestWhale', 'testwhale@example.com', 999999);

-- Update balance if already exists
UPDATE users SET coin_balance = 999999 WHERE email = 'testwhale@example.com';

-- Unlock ALL shop items for this user (avoiding duplicates)
INSERT INTO user_inventory (user_id, item_id, purchased_at)
SELECT u.id, s.id, datetime('now')
FROM users u, shop_items s
WHERE u.email = 'testwhale@example.com'
AND NOT EXISTS (
    SELECT 1 FROM user_inventory ui 
    WHERE ui.user_id = u.id AND ui.item_id = s.id
);
