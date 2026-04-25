-- SQL Script to update product and category images with locally generated assets

-- 1. Updates specifically for Divine category
UPDATE product_images 
SET image_url = '/images/products/shree_ganesh_aura.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Shree Ganesh%' OR name ILIKE '%Ganesha%');

UPDATE product_images 
SET image_url = '/images/products/om_namah_shivaya_cosmic.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Om Namah Shivaya%' OR name ILIKE '%Shiva%');

UPDATE product_images 
SET image_url = '/images/products/krishna_flute_melody.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Krishna%');

-- 2. Updates specifically for Automotive category
UPDATE product_images 
SET image_url = '/images/products/midnight_lambo_neon.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Lambo%' OR name ILIKE '%Lamborghini%');

UPDATE product_images 
SET image_url = '/images/products/gtr_skyline_rain.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%GT-R%' OR name ILIKE '%Skyline%');

UPDATE product_images 
SET image_url = '/images/products/porsche_911_sunset.png' 
WHERE product_id IN (SELECT id FROM products WHERE name ILIKE '%Porsche%');

-- 3. Category Cover Images
UPDATE categories 
SET image_url = '/images/products/shree_ganesh_aura.png' 
WHERE name = 'Divine';

UPDATE categories 
SET image_url = '/images/products/porsche_911_sunset.png' 
WHERE name = 'Automotive';
