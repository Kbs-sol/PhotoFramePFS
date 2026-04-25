/**
 * PhotoFrameIn — Cloudinary Migration Script
 * -----------------------------------------
 * This script uploads local high-res imagery to Cloudinary and updates Supabase.
 * It uses Cloudinary's dynamic optimization (q_auto, f_auto) for the storefront
 * while preserving high-res originals for print fulfillment.
 * 
 * Usage: 
 * 1. Set CLOUDINARY_URL and SUPABASE variables in .env
 * 2. node scripts/migrate-to-cloudinary.js "C:/Path/To/Images"
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const IMG_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const folderArg = process.argv[2];

if (!folderArg) {
  console.error('❌ Error: Please provide the source folder path.');
  console.log('Usage: node scripts/migrate-to-cloudinary.js "C:/Path/To/Your/Product/Photos"');
  process.exit(1);
}

// Initialize Clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Requires Service Role for DB updates
);

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (IMG_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

async function run() {
  console.log('🚀 Starting Cloudinary Migration...');
  console.log(`📂 Source: ${folderArg}`);

  const files = await getAllFiles(folderArg);
  console.log(`📸 Found ${files.length} images.`);

  // Fetch active folder from config
  const { data: configData } = await supabase.from('system_config').select('value').eq('key', 'cloudinary_active_folder').single();
  const activeFolder = configData?.value || 'products';
  console.log(`📁 Target Cloudinary Folder: ${activeFolder}`);

  for (const filePath of files) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const parentFolder = path.basename(path.dirname(filePath));
    
    // We'll use the parent folder name as subfolder in Cloudinary
    const cloudinaryFolder = `${activeFolder}/${parentFolder.toLowerCase().replace(/\s+/g, '-')}`;
    
    console.log(`\n📤 Uploading: ${fileName} (from ${parentFolder})...`);
    
    try {
      // 1. Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(filePath, {
        folder: cloudinaryFolder,
        public_id: fileName.toLowerCase().replace(/\s+/g, '-'),
        tags: ['pfi_migration', parentFolder],
        resource_type: 'image'
      });

      console.log(`✅ Uploaded to Cloudinary: ${uploadResult.secure_url}`);

      // 2. Try to find the product in Supabase
      // Strategy: Search for product with name or slug matching parentFolder
      const slugCandidate = parentFolder.toLowerCase().replace(/\s+/g, '-');
      
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .or(`slug.eq.${slugCandidate},name.ilike.%${parentFolder}%`)
        .single();

      if (product) {
        console.log(`🔗 Matching product found: ${product.name} (ID: ${product.id})`);
        
        // 3. Update/Insert product image
        // Check if this image already exists for the product
        const { data: existingImg } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', product.id)
          .eq('alt_text', fileName)
          .single();

        if (existingImg) {
          await supabase
            .from('product_images')
            .update({
              image_url: uploadResult.secure_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingImg.id);
          console.log(`✨ Updated existing image in database.`);
        } else {
          await supabase
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: uploadResult.secure_url,
              alt_text: fileName,
              display_order: 1
            });
          console.log(`➕ Added new image to database.`);
        }
      } else {
        console.warn(`⚠️ No matching product found for "${parentFolder}". Skipping DB update.`);
      }

    } catch (err) {
      console.error(`❌ Failed to process ${fileName}:`, err.message);
    }
  }

  console.log('\n🏁 Migration Complete!');
}

run();
