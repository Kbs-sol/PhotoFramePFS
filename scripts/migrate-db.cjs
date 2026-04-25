const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration from the user's provided project and management key
const API_KEY = 'sbp_68e8a5d4fa70d1aae88e9c88d3b439e5ce630625';
const PROJECT_REF = 'lxcustacsvamlrtiqkvi';

function runSql(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/queries/sql`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const addIsHiddenPath = path.join(__dirname, '..', 'supabase', 'add_is_hidden.sql');
    const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
    const seedAdminPath = path.join(__dirname, '..', 'supabase', 'seed_admin.sql');

    console.log('--- Database Migration Started ---');
    
    console.log('1. Executing Schema (schema.sql)...');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await runSql(schemaSql);
      console.log('✅ Schema applied successfully.');
    } else {
      console.error('❌ schema.sql not found at:', schemaPath);
    }

    console.log('2. Applying Hidden Flag Logic (add_is_hidden.sql)...');
    if (fs.existsSync(addIsHiddenPath)) {
      const sql = fs.readFileSync(addIsHiddenPath, 'utf8');
      await runSql(sql);
      console.log('✅ Hidden flag applied successfully.');
    }

    console.log('3. Executing Seed Data (seed.sql)...');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await runSql(seedSql);
      console.log('✅ Seed data applied successfully.');
    } else {
      console.log('ℹ️ seed.sql not found, skipping seed phase.');
    }

    console.log('4. Seeding Admin User (seed_admin.sql)...');
    if (fs.existsSync(seedAdminPath)) {
      const sql = fs.readFileSync(seedAdminPath, 'utf8');
      await runSql(sql);
      console.log('✅ Admin seeded successfully.');
    }

    console.log('--- Migration Completed Successfully ---');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
