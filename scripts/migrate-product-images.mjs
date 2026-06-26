import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SUPABASE_URL = 'https://hlmbehyjshdtklhjqiii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbWJlaHlqc2hkdGtsaGpxaWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU5MzQyNywiZXhwIjoyMDk2MTY5NDI3fQ.e8ThVy-cUXt2XpJZrny-AhtLKVwqcbGwg61OSckyhdo';
const BUCKET = 'brand-assets';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

async function uploadFile(filename) {
  const localPath = join(root, 'assets', 'images', 'products', filename);
  const ext = extname(filename).slice(1).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const storagePath = 'images/products/' + filename;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, readFileSync(localPath), { contentType, upsert: true });

  if (error) throw new Error(`Upload failed for ${filename}: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  const dir = join(root, 'assets', 'images', 'products');
  const files = readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log(`Found ${files.length} product images to migrate`);

  // Upload all files
  const urlMap = {};
  for (const f of files) {
    const oldUrl = '/assets/images/products/' + f;
    const newUrl = await uploadFile(f);
    urlMap[oldUrl] = newUrl;
    console.log(`  ${oldUrl} → ${newUrl}`);
  }

  // Fetch all products and update any that use the old URLs
  const { data: products, error } = await supabase.from('products').select('id, image');
  if (error) throw new Error('Failed to fetch products: ' + error.message);

  let updated = 0;
  for (const p of products) {
    const newUrl = urlMap[p.image];
    if (newUrl) {
      const { error: upErr } = await supabase
        .from('products')
        .update({ image: newUrl })
        .eq('id', p.id);
      if (upErr) console.error(`  FAIL updating product ${p.id}: ${upErr.message}`);
      else { console.log(`  Updated product ${p.id}`); updated++; }
    }
  }

  console.log(`\nDone. Uploaded ${files.length} images, updated ${updated} product records.`);
}

main().catch(e => { console.error(e); process.exit(1); });
