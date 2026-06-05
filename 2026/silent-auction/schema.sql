DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS items;

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    creative_name TEXT NOT NULL,
    dimensions TEXT,
    image_url TEXT NOT NULL,
    starting_bid INTEGER DEFAULT 25,
    title_placeholder TEXT DEFAULT '[Title Placeholder]',
    desc_placeholder TEXT DEFAULT '[Description of the item and who it benefits will go here.]'
);

CREATE TABLE bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id)
);

INSERT INTO items (original_name, creative_name, dimensions, image_url) VALUES 
('Dog', 'Canine Canvas', '24 x 18', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Dog-scaled.jpeg'),
('Gum', 'Bubblegum Dreams', '48 x 36', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Gum-scaled.jpeg'),
('Little Subway', 'Transit Miniature', '8 x 12', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Little-Subway-scaled.jpeg'),
('Multi-Color Flowers', 'Prismatic Petals', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Multi-Color-Flowers-scaled.jpeg'),
('Paintbrush', 'The Creator''s Tool', '8 x 12', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Paintbrush-scaled.jpeg'),
('Pink Flower', 'Roseate Bloom', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Pink-Flower-scaled.jpeg'),
('Pink Girl', 'Blush Portrait', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Pink-Girl-scaled.jpeg'),
('Rainbow Hair', 'Spectrum Tresses', '40 x 60', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Rainbow-Hair-scaled.jpeg'),
('Smoking', 'Smokescreen Silhouette', '40 x 26', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Smoking-scaled.jpeg'),
('Subway', 'Metropolitan Transit', '36 x 48', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Subway-scaled.jpeg'),
('Sunglasses', 'Shaded Gaze', '48 x 36', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Sunglasses-scaled.jpeg'),
('Tunnel', 'Echoes of the Underground', '24 x 36', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Tunnel-scaled.jpeg'),
('Purple Flower', 'Violet Blossom', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Purple-Flower-scaled.jpeg'),
('Rainbow Flower', 'Chromatic Flora', '29 x 58.5', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Rainbow-Flower-scaled.jpeg');
