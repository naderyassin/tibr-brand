import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SUPABASE_URL = 'https://hlmbehyjshdtklhjqiii.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbWJlaHlqc2hkdGtsaGpxaWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU5MzQyNywiZXhwIjoyMDk2MTY5NDI3fQ.e8ThVy-cUXt2XpJZrny-AhtLKVwqcbGwg61OSckyhdo';
const BUCKET = 'brand-assets';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FILES = [
  'images/fragrance_midnight_oud.png',
  'images/fragrance_royal_amber.png',
  'images/fragrance_velvet_rose.png',
  'images/perfume_hero_product_tibr.png',
  'images/obsidian_noir_wide.png',
  'images/amber_epilogue_wide.png',
  'images/frontier_heritage.png',
  'images/perfume_collection.png',
  'images/frontier_1924.png',
  'images/frontier_1997.png',
  'videos/frontier_stories.mp4',
];

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

async function ensureBucket() {
  console.log(`Using bucket: ${BUCKET}`);
}

async function upload(file) {
  const localPath = join(root, 'assets', file);
  if (!existsSync(localPath)) {
    console.warn(`  SKIP (not found): ${file}`);
    return null;
  }
  const ext = file.split('.').pop().toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const body = readFileSync(localPath);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(file, body, { contentType, upsert: true });

  if (error) {
    console.error(`  FAIL: ${file} — ${error.message}`);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(file);
  console.log(`  OK: ${data.publicUrl}`);
  return { file, url: data.publicUrl };
}

async function main() {
  await ensureBucket();
  const results = [];
  for (const f of FILES) {
    const r = await upload(f);
    if (r) results.push(r);
  }

  console.log('\n--- URL map ---');
  for (const { file, url } of results) {
    console.log(`/assets/${file} → ${url}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
