/**
 * Script untuk mengimport data CSV ke tabel grok_results di Supabase.
 * 
 * Cara pakai:
 *   node import_grok_csv.js
 * 
 * CSV format (semicolon-separated, no header):
 *   Nama;NIM;TahunMasuk;TanggalLulus;Fakultas;ProgramStudi;Sosmed;Email;NoHP;TempatBekerja;AlamatBekerja;Posisi;Kategori;SosmedTempatBekerja
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Pastikan .env berisi SUPABASE_URL dan SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_PATH = path.join(process.cwd(), 'Result 80k+ Alumni 2000-2025.csv');

async function main() {
  console.log('📂 Membaca CSV:', CSV_PATH);
  
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  
  console.log(`📊 Total baris: ${lines.length}`);
  
  const records = [];
  
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim());
    
    // Skip jika kolom tidak lengkap
    if (cols.length < 14) {
      console.log(`⚠️  Baris ${i + 1} dilewati (kolom kurang: ${cols.length})`);
      continue;
    }
    
    const [nama, nim, tahun_masuk, tanggal_lulus, fakultas, program_studi, sosmed, email, no_hp, tempat_bekerja, alamat_bekerja, posisi, kategori, sosmed_tempat_bekerja] = cols;
    
    records.push({
      id: `grok-${i + 1}-${Date.now()}`,
      nama: nama || '',
      nim: nim || '',
      tahun_masuk: tahun_masuk || '',
      tanggal_lulus: tanggal_lulus || '',
      fakultas: fakultas || '',
      program_studi: program_studi || '',
      sosmed: sosmed || '',
      email: email || '',
      no_hp: no_hp || '',
      tempat_bekerja: tempat_bekerja || '',
      alamat_bekerja: alamat_bekerja || '',
      posisi: posisi || '',
      kategori: kategori || '',
      sosmed_tempat_bekerja: sosmed_tempat_bekerja || '',
    });
  }
  
  console.log(`✅ Records siap diimport: ${records.length}`);
  
  // Upload in batches of 500
  const BATCH_SIZE = 500;
  let uploaded = 0;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase.from('grok_results').insert(batch);
    
    if (error) {
      console.error(`❌ Error batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      // Coba satu per satu jika batch gagal
      for (const rec of batch) {
        const { error: singleErr } = await supabase.from('grok_results').insert(rec);
        if (singleErr) {
          console.error(`  ❌ Gagal: ${rec.nama} (${rec.nim}): ${singleErr.message}`);
        } else {
          uploaded++;
        }
      }
    } else {
      uploaded += batch.length;
    }
    
    console.log(`📤 Progress: ${uploaded}/${records.length} (${Math.round(uploaded/records.length*100)}%)`);
  }
  
  console.log(`\n🎉 Selesai! ${uploaded} data berhasil diimport ke tabel grok_results.`);
}

main().catch(console.error);
