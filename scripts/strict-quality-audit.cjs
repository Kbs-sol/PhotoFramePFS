// scripts/strict-quality-audit.cjs
const fs = require('fs');
const path = require('path');

const BASE_DIR = 'C:/Users/venka/Pictures/everything-photoframe/product desinzz';

const PRODUCTS = [
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

// PNG dimension parser (minimal)
function getPngRes(b) {
  if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4E || b[3] !== 0x47) return null;
  return { w: b.readInt32BE(16), h: b.readInt32BE(20) };
}

// JPEG dimension parser (SOF marker search)
function getJpgRes(b) {
  let i = 0;
  while (i < b.length - 1) {
    if (b[i] === 0xff && (b[i+1] >= 0xc0 && b[i+1] <= 0xc3)) {
      return { h: b.readUInt16BE(i+5), w: b.readUInt16BE(i+7) };
    }
    i++;
  }
  return null;
}

function scan(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath, fileList);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        try {
          const buffer = fs.readFileSync(fullPath);
          let res = null;
          if (ext === '.png') res = getPngRes(buffer);
          else res = getJpgRes(buffer);
          
          if (res) {
            fileList.push({ name: entry.name, path: fullPath, w: res.w, h: res.h, ext });
          }
        } catch (e) {}
      }
    }
  }
  return fileList;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function run() {
  console.log(`🔍 Full Resolution Audit: ${BASE_DIR}`);
  const allImages = scan(BASE_DIR);
  
  const report = PRODUCTS.map(pName => {
    const words = pName.toLowerCase().split(/[—\s&]+/).filter(w => w.length > 2);
    
    // Find all matching files
    const matches = allImages.filter(f => {
      const fNorm = normalize(path.basename(f.name, f.ext));
      const matchedAllWords = words.every(w => fNorm.includes(normalize(w)));
      const shorthandMatch = (pName.includes('BMW M4') && fNorm.includes('m4')) ||
                             (pName.includes('911') && fNorm.includes('911')) ||
                             (pName.includes('Lambo') && fNorm.includes('lambo')) ||
                             (pName.includes('Ganesha') && (fNorm.includes('ganesh') || fNorm.includes('vinayaka'))) ||
                             (pName.includes('Hanuman') && fNorm.includes('hanuman')) ||
                             (pName.includes('F1') && fNorm.includes('f1'));
      return matchedAllWords || shorthandMatch;
    });

    // Pick top resolution file
    let topRes = null;
    if (matches.length > 0) {
      topRes = matches.reduce((prev, current) => (prev.w * prev.h > current.w * current.h) ? prev : current);
    }

    const is2k = topRes && (topRes.w >= 2000 || topRes.h >= 2000);

    return {
      product: pName,
      status: is2k ? '✅ 2K+' : (topRes ? '⚠️ LOW RES' : '❌ MISSING'),
      resolution: topRes ? `${topRes.w}x${topRes.h}` : '-',
      format: topRes ? topRes.ext.toUpperCase() : '-',
      filename: topRes ? topRes.name : '-'
    };
  });

  console.table(report);
  
  let md = "# Detailed Product Resolution Audit\n\n";
  md += "| Product | Status | Resolution | Format | Best File Found |\n";
  md += "| :--- | :--- | :--- | :--- | :--- |\n";
  report.forEach(r => {
    md += `| ${r.product} | ${r.status} | ${r.resolution} | ${r.format} | ${r.filename} |\n`;
  });
  
  fs.writeFileSync('resolution_audit_report.md', md);
  process.exit(0);
}

run();
