SELECT id, name, coin_balance FROM users WHERE email = 'testwhale@example.com';
SELECT count(*) as inventory_count FROM user_inventory WHERE user_id = (SELECT id FROM users WHERE email = 'testwhale@example.com');
