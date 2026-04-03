import fs from 'fs';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function importData() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Create Master Alumni Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS alumni_master (
      nim TEXT PRIMARY KEY,
      nama TEXT,
      tahun_masuk TEXT,
      tanggal_lulus TEXT,
      fakultas TEXT,
      program_studi TEXT
    );
  `);

  // Create Evidence Table (migrating from localStorage format)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tracking_evidences (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      nim TEXT,
      nama TEXT,
      pddiktiStatus TEXT,
      confidenceScore REAL,
      matchStatus TEXT,
      verifiedBy TEXT,
      notes TEXT,
      rawData TEXT
    );
  `);

  console.log('Tables created. Starting CSV import... (This may take a minute)');

  const stmt = await db.prepare('INSERT OR REPLACE INTO alumni_master (nim, nama, tahun_masuk, tanggal_lulus, fakultas, program_studi) VALUES (?, ?, ?, ?, ?, ?)');

  // Begin transaction for speed
  await db.exec('BEGIN TRANSACTION');

  let rowsCount = 0;

  fs.createReadStream('./Alumni 2000-2025.xlsx - Sheet1.csv')
    .pipe(csv())
    .on('data', (row) => {
      // The headers are: Nama Lulusan, NIM, Tahun Masuk, Tanggal Lulus, Fakultas, Program Studi
      if (!row['NIM']) return; // skip empty
      stmt.run([
        row['NIM'],
        row['Nama Lulusan'],
        row['Tahun Masuk'],
        row['Tanggal Lulus'],
        row['Fakultas'],
        row['Program Studi']
      ]);
      rowsCount++;
    })
    .on('end', async () => {
      await stmt.finalize();
      await db.exec('COMMIT');
      console.log(`Successfully imported ${rowsCount} rows into SQLite.`);
      await db.close();
    })
    .on('error', async (err) => {
      console.error('Error importing:', err);
      await db.exec('ROLLBACK');
      await db.close();
    });
}

importData().catch(console.error);
