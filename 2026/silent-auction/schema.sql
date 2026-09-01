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

INSERT INTO items (original_name, creative_name, dimensions, image_url, starting_bid, desc_placeholder) VALUES 
('Little Subway', 'Transit Miniature', '8 x 12', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Little-Subway-scaled.jpeg', 35, 'A small-scale, atmospheric depiction of an urban transit scene. Capturing the motion, lights, and gritty charm of the city subway system, this miniature brings a slice of metropolitan life to your collection.'),
('Multi-Color Flowers', 'Prismatic Petals', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Multi-Color-Flowers-scaled.jpeg', 275, 'A stunning explosion of colors, this piece features a detailed arrangement of multi-colored flowers. The intricate details and vivid color palette create a lively, refreshing focal point.'),
('Pink Flower', 'Roseate Bloom', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Pink-Flower-scaled.jpeg', 75, 'A delicate, elegant close-up of a pink flower in full bloom. Its soft petals, gentle lighting, and pastel hues bring a sense of serenity, natural beauty, and calm to your home.'),
('Rainbow Hair', 'Spectrum Tresses', '40 x 60', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Rainbow-Hair-scaled.jpeg', 650, 'A breathtaking, large-scale contemporary painting featuring cascading waves of vibrant, rainbow-colored hair. The dynamic movement and brilliant color spectrum make this a showstopping center of attention.'),
('Smoking', 'Smokescreen Silhouette', '40 x 26', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Smoking-scaled.jpeg', 125, 'A stylish and dramatic portrait featuring a subject surrounded by wisps of smoke. Its high-contrast, moody aesthetic evokes vintage cinema and mysterious allure.'),
('Subway', 'Metropolitan Transit', '36 x 48', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Subway-scaled.jpeg', 335, 'A large, striking representation of a bustling metropolitan subway station. Bold lines and deep perspective draw the viewer into the rhythmic, energetic heartbeat of city transit.'),
('Tunnel', 'Echoes of the Underground', '24 x 36', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Tunnel-scaled.jpeg', 75, 'An intriguing and atmospheric depiction of a tunnel, playing with light, shadow, and deep perspective. A captivating abstract study of journey, transition, and architectural depth.'),
('Purple Flower', 'Violet Blossom', '36 x 24', 'https://coconutcoastrealtors.org/wp-content/uploads/2026/06/Purple-Flower-scaled.jpeg', 75, 'A rich and dramatic floral portrait showcasing a purple flower in exquisite detail. The deep violet tones and velvet textures create a sophisticated, elegant, and timeless botanical statement.');
