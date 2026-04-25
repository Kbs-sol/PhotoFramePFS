// scripts/quality-audit.cjs
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BASE_DIR = 'C:/Users/venka/Pictures/everything-photoframe/product desinzz';

// Product list from Prompt Studio (extracted from HTML)
const PROMPT_STUDIO_PRODUCTS = [
  "Goku Ultra Instinct", "Naruto Sage Mode", "One Piece Bounty Poster",
  "BMW M4 Art Print", "F1 Race Car Art", "GT-R Skyline Rain",
  "Midnight Lambo Neon", "Porsche 911 GT3RS", "Porsche 911 Sunset Drive",
  "Superbike Triptych", "Ganesha Gold Minimal", "Hanuman Ji Modern Art",
  "Mahadev Dark Minimal", "Om Namah Shivaya Cosmic", "Radha Krishna Watercolor",
  "Ram Darbar Classic", "Shree Ganesh Golden Aura", "Bauhaus Primary",
  "Continuous Line Face", "Zen Stone Balance", "Discipline Equals Freedom",
  "Grind in Silence", "Hustle — Short & Sharp", "Lion Minimal Art",
  "Rise and Conquer", "The Mindset Poster", "Wolf Dark Minimal",
  "Forest Light", "Golden Shore", "Himalayan Peaks", "Cricket Stadium Night",
  "Football Glory Moment", "Golden Legend — Football", "Cricket Helicopter Shot",
  "Football Silhouette Champion"
];

function getPngDimensions(filePath) {
  const buffer = Buffer.alloc(24);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 24, 0);
  fs.closeSync(fd);

  // Check if it's a PNG
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
    return null;
  }

  const width = buffer.readInt32BE(16);
  const height = buffer.readInt32BE(20);
  return { width, height };
}

function scan(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath, fileList);
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      const dim = getPngDimensions(fullPath);
      if (dim) {
        fileList.push({ name: entry.name, path: fullPath, ...dim });
      }
    }
  }
  return fileList;
}

async function runAudit() {
  console.log(`🔍 Scanning for high-res PNGs in: ${BASE_DIR}`);
  const pngs = scan(BASE_DIR);
  
  const optimized = pngs.filter(f => f.width >= 2000 || f.height >= 2000);
  const lowRes = pngs.filter(f => f.width < 2000 && f.height < 2000);

  console.log(`\nFound ${pngs.length} PNGs.`);
  console.log(`- High Res (2k+): ${optimized.length}`);
  console.log(`- Low Res: ${lowRes.length}`);

  const report = {
    production_ready: [],
    low_quality: [],
    totally_missing: []
  };

  PROMPT_STUDIO_PRODUCTS.forEach(pName => {
    const slug = pName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const simpleName = pName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    
    // Fuzzy match: check if product name is in PNG filename
    const match = optimized.find(f => {
      const fName = f.name.toLowerCase();
      return fName.includes(simpleName) || fName.includes(slug) || 
             pName.toLowerCase().split(' ').every(word => fName.includes(word));
    });

    if (match) {
      report.production_ready.push({ product: pName, file: match.name, res: `${match.width}x${match.height}` });
    } else {
      const lqMatch = lowRes.find(f => f.name.toLowerCase().includes(simpleName));
      if (lqMatch) {
         report.low_quality.push({ product: pName, file: lqMatch.name, res: `${lqMatch.width}x${lqMatch.height}` });
      } else {
         report.totally_missing.push(pName);
      }
    }
  });

  console.log('\n✅ PRODUCTION READY (2K+ PNG):');
  report.production_ready.forEach(r => console.log(`- ${r.product} (${r.res}) -> ${r.file}`));

  console.log('\n⚠️ LOW QUALITY (< 2K):');
  report.low_quality.forEach(r => console.log(`- ${r.product} (${r.res}) -> ${r.file}`));

  console.log('\n❌ TOTALLY MISSING 2K PNG:');
  report.totally_missing.forEach(r => console.log(`- ${r}`));

  fs.writeFileSync('highres_audit_report.json', JSON.stringify(report, null, 2));
}

runAudit().catch(console.error);
