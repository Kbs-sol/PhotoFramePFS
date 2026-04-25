// scripts/final-inventory-audit.cjs
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

function scan(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath, fileList);
    } else {
      fileList.push({ name: entry.name, path: fullPath, ext: path.extname(entry.name).toLowerCase() });
    }
  }
  return fileList;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function run() {
  console.log(`🔍 Final Audit: ${BASE_DIR}`);
  const allFiles = scan(BASE_DIR);
  
  const report = PRODUCTS.map(pName => {
    const pNorm = normalize(pName);
    const matches = allFiles.filter(f => {
      const fNorm = normalize(path.basename(f.name, f.ext));
      // Heuristic: check if all words of product name are in filename
      const words = pName.toLowerCase().split(/[—\s&]+/).filter(w => w.length > 2);
      const matchedAllWords = words.every(w => fNorm.includes(normalize(w)));
      
      // Also check shorthand codes like M4, 911, CR7, GT3
      const shorthandMatch = (pName.includes('BMW M4') && fNorm.includes('m4')) ||
                             (pName.includes('911') && fNorm.includes('911')) ||
                             (pName.includes('GT3') && fNorm.includes('911')) ||
                             (pName.includes('Lambo') && fNorm.includes('lambo')) ||
                             (pName.includes('One Piece') && fNorm.includes('onepiece')) ||
                             (pName.includes('Ganesha') && (fNorm.includes('ganesh') || fNorm.includes('vinayaka'))) ||
                             (pName.includes('Hanuman') && fNorm.includes('hanuman')) ||
                             (pName.includes('Radha Krishna') && fNorm.includes('radhakrishna')) ||
                             (pName.includes('F1') && fNorm.includes('f1'));

      return matchedAllWords || shorthandMatch;
    });

    const categories = {
      PNG: matches.filter(m => m.ext === '.png'),
      JPG: matches.filter(m => m.ext === '.jpg' || m.ext === '.jpeg'),
      PDF: matches.filter(m => m.ext === '.pdf')
    };

    let status = '❌ MISSING';
    if (categories.PNG.length > 0) status = '✅ READY (PNG)';
    else if (categories.JPG.length > 0) status = '⚠️ UNOPTIMIZED (JPG)';
    else if (categories.PDF.length > 0) status = '📥 SOURCE ONLY (PDF)';

    return {
      product: pName,
      status: status,
      files: matches.map(m => m.name).join(', ')
    };
  });

  console.table(report);
  
  // Create Markdown Artifact content
  let md = "# Final Product Imagery Inventory\n\n";
  md += "| Product | Status | Files Found |\n";
  md += "| :--- | :--- | :--- |\n";
  report.forEach(r => {
    md += `| ${r.product} | ${r.status} | ${r.files} |\n`;
  });
  
  fs.writeFileSync('final_inventory_report.md', md);
  process.exit(0);
}

run();
