// Scripts/inventory-audit.js
// Audits local folders against Supabase products
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BASE_DIR = process.argv[2] || 'C:/Users/venka/Pictures/everything-photoframe/product desinzz';

async function getAllSubfolders(dir) {
  const folders = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      folders.push({ name: entry.name, path: fullPath });
      const sub = await getAllSubfolders(fullPath);
      folders.push(...sub);
    }
  }
  return folders;
}

async function audit() {
  console.log(`🔍 Auditing: ${BASE_DIR}`);
  
  // 1. Get DB Products
  const { data: products } = await supabase.from('products').select('id, name, slug');
  const dbSlugs = new Set(products.map(p => p.slug));
  const dbNames = new Map(products.map(p => [p.name.toLowerCase(), p.slug]));

  // 2. Scan Local Folders
  const allFolders = await getAllSubfolders(BASE_DIR);
  
  const matches = [];
  const unmatchedLocal = [];
  const missingInLocal = [];

  const foundLocalNames = new Set();

  for (const folder of allFolders) {
    const folderLabel = folder.name.toLowerCase().trim();
    // Match by exact name or slugified name
    const slugMatch = folderLabel.replace(/\s+/g, '-');
    
    let matchedSlug = null;
    if (dbSlugs.has(slugMatch)) {
      matchedSlug = slugMatch;
    } else if (dbNames.has(folderLabel)) {
      matchedSlug = dbNames.get(folderLabel);
    }

    if (matchedSlug) {
      matches.push({ product: matchedSlug, folder: folder.name, path: folder.path });
      foundLocalNames.add(matchedSlug);
    } else {
      // Check if it's a category folder or something else
      if (!['divine', 'automotive', 'motivation', 'sports', 'designzz', 'ai gen', 'geminigen'].includes(folderLabel)) {
        unmatchedLocal.push(folder.name);
      }
    }
  }

  for (const p of products) {
    if (!foundLocalNames.has(p.slug)) {
      missingInLocal.push(p.name);
    }
  }

  console.log('\n✅ MATCHED PRODUCTS:');
  matches.forEach(m => console.log(`- ${m.product} -> ${m.path}`));

  console.log('\n❌ PRODUCTS MISSING LOCAL IMAGES:');
  missingInLocal.forEach(m => console.log(`- ${m}`));

  console.log('\n❓ UNRECOGNIZED LOCAL FOLDERS:');
  unmatchedLocal.forEach(u => console.log(`- ${u}`));
  
  // Save to file for user review
  const report = { matches, missingInLocal, unmatchedLocal };
  fs.writeFileSync('product_audit_report.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Report saved to product_audit_report.json');
}

audit();
