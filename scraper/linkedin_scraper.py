"""
LinkedIn Alumni Scraper — Sistem Pelacakan Alumni UMM
=====================================================
Menjalankan otomatisasi pencarian alumni di LinkedIn menggunakan Playwright,
kemudian menyimpan hasil ke Supabase PostgreSQL.

Cara pakai:
  1. pip install -r requirements.txt
  2. playwright install chromium
  3. python linkedin_scraper.py --limit 10       (proses 10 alumni)
  4. python linkedin_scraper.py --nim 201810140311209  (proses 1 NIM spesifik)
"""

import os
import re
import sys
import time
import json
import random
import argparse
import requests
import cloudscraper
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load .env dari folder parent (root project)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from supabase import create_client
from playwright.sync_api import sync_playwright

# ─── Config ──────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
SERPER_API_KEY = os.getenv('SERPER_API_KEY')

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("❌ ERROR: Pastikan .env berisi SUPABASE_URL dan SUPABASE_SERVICE_KEY")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Utility ─────────────────────────────────────────────────────────────────────

def normalize_name(name):
    """Normalisasi nama: lowercase, hapus gelar, trim spasi berlebih."""
    name = name.lower().strip()
    # Hapus gelar umum
    for gelar in ['s.t.', 's.kom.', 's.e.', 's.pd.', 's.h.', 's.si.', 's.sos.',
                  'm.t.', 'm.kom.', 'm.m.', 'dr.', 'ir.', 'drs.', 'prof.',
                  's.t', 's.kom', 's.e', 's.pd', 's.h', ',', '.']:
        name = name.replace(gelar, '')
    return ' '.join(name.split())

def calculate_name_similarity(name1, name2):
    """Hitung kecocokan nama sederhana berbasis token overlap."""
    tokens1 = set(normalize_name(name1).split())
    tokens2 = set(normalize_name(name2).split())
    if not tokens1 or not tokens2:
        return 0
    intersection = tokens1 & tokens2
    union = tokens1 | tokens2
    return int((len(intersection) / len(union)) * 100)

def random_delay(min_sec=15, max_sec=35):
    """Jeda acak agar tidak terdeteksi sebagai bot."""
    delay = random.uniform(min_sec, max_sec)
    print(f"  ⏳ Jeda {delay:.1f} detik...")
    time.sleep(delay)

# ─── LinkedIn Functions ──────────────────────────────────────────────────────────
# Login functions removed per user instruction.

def search_linkedin(page, query):
    """Cari nama alumni di LinkedIn via Serper.dev Google Search API."""
    print(f"  \U0001f50d Mencari: \"{query}\"")
    
    # Gunakan Serper.dev jika API key tersedia
    if SERPER_API_KEY:
        return search_via_serper(query)
    
    # Fallback ke LinkedIn langsung jika Serper tidak tersedia
    return search_via_linkedin_direct(page, query)

def search_via_serper(query, with_umm=True):
    """Cari profil LinkedIn via Serper.dev Google Search API."""
    try:
        url = 'https://google.serper.dev/search'
        headers = {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
        }
        # Tambahkan keyword UMM agar Google memfilter alumni UMM yang benar
        if with_umm:
            search_query = f'site:linkedin.com/in/ "{query}" "Muhammadiyah Malang"'
        else:
            search_query = f'site:linkedin.com/in/ "{query}"'
        payload = {
            'q': search_query,
            'num': 5,
            'gl': 'id',
            'hl': 'id'
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        organic = data.get('organic', [])
        
        for item in organic:
            link = item.get('link', '')
            
            # Filter hanya URL profil LinkedIn yang valid
            if '/in/' not in link or link.endswith('/in/'):
                continue
            
            profile_url = link.split('?')[0]
            
            # Ekstrak nama dari title Google (format: "Nama - Headline | LinkedIn")
            title = item.get('title', '')
            nama = title.split(' - ')[0].split(' | ')[0].split(' \u2013 ')[0].strip()
            nama = re.sub(r'\s*[\|\-\u2013]\s*LinkedIn.*$', '', nama, flags=re.IGNORECASE).strip()
            
            # Ekstrak headline dari snippet atau title
            headline = ''
            snippet = item.get('snippet', '')
            if ' - ' in title:
                headline = title.split(' - ', 1)[1].replace(' | LinkedIn', '').replace(' - LinkedIn', '').strip()
            elif snippet:
                headline = snippet[:100]
            
            if nama and len(nama) > 2:
                results.append({
                    'nama': nama,
                    'headline': headline,
                    'lokasi': '',
                    'url': profile_url,
                    'snippet': snippet
                })
        
        print(f"  \U0001f4cb Ditemukan {len(results)} hasil (via Serper.dev)")
        return results
        
    except Exception as e:
        print(f"  \u26a0\ufe0f  Error Serper.dev: {e}")
        return []

def search_via_linkedin_direct(page, query):
    """Fallback: Cari langsung di LinkedIn (berisiko CAPTCHA)."""
    encoded_query = query.replace(' ', '%20')
    search_url = f'https://www.linkedin.com/search/results/people/?keywords={encoded_query}&origin=GLOBAL_SEARCH_HEADER'
    
    page.goto(search_url, wait_until='domcontentloaded')
    time.sleep(4)
    page.mouse.wheel(0, 500)
    time.sleep(2)

    try:
        js_code = """
        () => {
            let results = [];
            let links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
            let uniqueUrls = new Set();
            for (let a of links) {
                try {
                    let url = a.href.split('?')[0];
                    if (uniqueUrls.has(url) || url.endsWith('/in/') || url.includes('/edit/')) continue;
                    let container = a.closest('li, div.search-result, div.entity-result__item');
                    if (!container) continue;
                    let nameText = a.innerText.trim();
                    if (!nameText || nameText.toLowerCase().includes("linkedin") || nameText.toLowerCase().includes("view")) continue;
                    uniqueUrls.add(url);
                    let name = nameText.split('\\n')[0].split('\u2022')[0].split('\u2014')[0].trim();
                    let primarySub = container.querySelector('.entity-result__primary-subtitle') || container.querySelector('.subline-level-1');
                    let secondarySub = container.querySelector('.entity-result__secondary-subtitle') || container.querySelector('.subline-level-2');
                    results.push({
                        'nama': name,
                        'headline': primarySub ? primarySub.textContent.trim() : '',
                        'lokasi': secondarySub ? secondarySub.textContent.trim() : '',
                        'url': url
                    });
                    if (results.length >= 5) break;
                } catch(e) {}
            }
            return results;
        }
        """
        results = page.evaluate(js_code)
    except Exception as e:
        print(f"  \u26a0\ufe0f  Error parsing hasil: {e}")
        results = []
        
    print(f"  \U0001f4cb Ditemukan {len(results)} hasil (via LinkedIn langsung)")
    
    if not results:
        title = page.title().lower()
        if 'login' in title or 'sign in' in title or 'bergabung' in title:
            print("  \u26a0\ufe0f  PERINGATAN: Sesi login expired!")
    
    return results

def scrape_linkedin_profile(page, url, serper_snippet=''):
    """Buka profil LinkedIn dan ekstrak data pekerjaan.
    Alumni sudah terverifikasi dari alumni_master, jadi UMM check hanya bonus."""
    if not url:
        return None
    
    # Normalisasi URL: id.linkedin.com → www.linkedin.com (hindari redirect yang mematikan page)
    url = re.sub(r'https?://[a-z]{2}\.linkedin\.com', 'https://www.linkedin.com', url)
        
    print(f"  👁️  Membuka profil: {url}")
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=15000)
    except Exception as e:
        print(f"  ⚠️  Error navigasi: {e}")
        return None
    time.sleep(4)
    
    # Cek apakah terkena authwall / halaman login
    try:
        current_url = page.url.lower()
        page_title = page.title().lower()
    except:
        current_url = ''
        page_title = ''
    
    is_authwall = ('authwall' in current_url or 'sign' in page_title or 
                   'join' in page_title or 'login' in current_url)
    
    if is_authwall:
        print("  ⚠️  Terblokir authwall LinkedIn (halaman login)")
        # Tidak bisa scrape halaman, tapi kita masih bisa return data dari search result
        return 'authwall'
    
    # Scroll untuk memuat bagian pendidikan / pengalaman
    try:
        page.mouse.wheel(0, 1000)
        time.sleep(2)
        page.mouse.wheel(0, 1000)
        time.sleep(2)
    except Exception as e:
        print(f"  ⚠️  Error scroll: {e}")
        return 'authwall'  # Kemungkinan page tertutup/redirect
    
    try:
        content = page.locator("body").inner_text().lower()
    except:
        try:
            content = page.content().lower()
        except:
            print("  ⚠️  Tidak bisa membaca konten halaman")
            content = ''
    
    # Cek UMM sebagai info tambahan (bukan syarat mutlak)
    combined_text = content + ' ' + serper_snippet.lower()
    if re.search(r'(?:muhammadiyah\s*malang|universitas\s*muhammadiyah|\bumm\b)', combined_text):
        print("  🎓 Terverifikasi berafiliasi dengan UMM!")
    
    # Ekstrak data dari profil
    try:
        js_profile = (
            "() => {"
            "  let nameEl = document.querySelector('h1');"
            "  let name = nameEl ? nameEl.textContent.trim() : '';"
            "  if (!name) {"
            "    let ps = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => t && t.length > 1);"
            "    let skip = ['coba premium', 'try premium', 'premium'];"
            "    for (let p of ps) {"
            "      if (!skip.some(s => p.toLowerCase().includes(s)) && p.length > 2 && p.length < 60 && !p.includes('|') && !p.includes('@')) {"
            "        name = p; break;"
            "      }"
            "    }"
            "  }"
            "  let cleanStr = (s) => {"
            "    if (!s) return '';"
            "    s = s.replace(/Kirim pesan/gi, '').replace(/Hubungkan/gi, '')"
            "         .replace(/\\bIkuti\\b/g, '').replace(/\\bPesan\\b/g, '')"
            "         .replace(/Tampilkan semua/gi, '').replace(/Tampilkan detail/gi, '')"
            "         .replace(/Terbuka untuk bekerja/gi, '').replace(/Open to work/gi, '')"
            "         .replace(/Di Kantor/gi, '').replace(/Jarak Jauh/gi, '').replace(/Gabungan/gi, '')"
            "         .replace(/^Logo /gi, '');"
            "    if (name && s.startsWith(name)) { s = s.substring(name.length); }"
            "    return s.replace(/\\s+/g, ' ').trim();"
            "  };"
            "  let isGarbage = (s) => {"
            "    if (!s || s.length < 3) return true;"
            "    let lower = s.toLowerCase();"
            "    let gp = ['aktivitas','pengikut','posting','postingan','dibagikan',"
            "      'anda sama-sama','sorotan','tentang','info kontak','contact info',"
            "      'terbuka untuk bekerja','open to work','di kantor','jarak jauh',"
            "      'hubungkan','kirim pesan','tampilkan','ikuti','tidak ada posting',"
            "      'daerah tingkat','gabungan','hybrid','koneksi'];"
            "    return gp.some(p => lower.includes(p));"
            "  };"
            "  let headlineEl = document.querySelector('.text-body-medium.break-words, div.top-card-layout__headline, h2.top-card-layout__headline');"
            "  let headline = headlineEl ? cleanStr(headlineEl.textContent.trim()) : '';"
            "  let locEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words, div.top-card__subline-item');"
            "  let location = locEl ? locEl.textContent.trim() : '';"
            "  let expAnchor = document.getElementById('experience');"
            "  let expSection = expAnchor ? expAnchor.closest('section, div.artdeco-card') : null;"
            "  if (!expSection) {"
            "    expSection = Array.from(document.querySelectorAll('section, div.artdeco-card')).find(s => {"
            "      let h2 = s.querySelector('h2');"
            "      let h2Text = h2 ? h2.textContent.toLowerCase() : '';"
            "      return h2Text.includes('experience') || h2Text.includes('pengalaman');"
            "    });"
            "  }"
            "  let posisi = '';"
            "  let tempat = '';"
            "  if (expSection) {"
            "    let items = expSection.querySelectorAll('li.artdeco-list__item, li.pvs-list__paged-list-item');"
            "    if (items.length > 0) {"
            "      let targetItem = null;"
            "      for (let item of items) {"
            "        let itemText = item.textContent.toLowerCase();"
            "        if (itemText.includes('saat ini') || itemText.includes('present')) {"
            "          targetItem = item; break;"
            "        }"
            "      }"
            "      if (!targetItem) targetItem = items[0];"
            "      let spans = Array.from(targetItem.querySelectorAll('span[aria-hidden=\"true\"]'))"
            "        .map(s => s.textContent.trim())"
            r"        .filter(text => text.length > 2 && !text.includes('\u00b7')"
            r"          && !/^\d+\s*(yr|mo|mos|thn|bln|tahun|bulan)/i.test(text)"
            r"          && !/^(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des|may|aug|oct|dec)/i.test(text)"
            "          && !text.toLowerCase().includes('saat ini')"
            "          && !text.toLowerCase().includes('present'));"
            "      if (spans.length >= 1) posisi = spans[0];"
            "      if (spans.length >= 2) tempat = spans[1];"
            "    }"
            "  }"
            "  let allTexts = Array.from(document.querySelectorAll('p')).map(e => e.textContent.trim()).filter(t => t && t.length > 1);"
            "  if (!posisi && !tempat) {"
            "    try {"
            "      let expIdx = allTexts.findIndex(t => t === 'Pengalaman' || t === 'Experience');"
            "      if (expIdx !== -1) {"
            "        let cands = allTexts.slice(expIdx + 1, expIdx + 6);"
            "        for (let c of cands) {"
            "          let cl = cleanStr(c);"
            r"          if (!isGarbage(cl) && cl.length > 2) {"
            r"            if (!posisi && !cl.includes('\u00b7')) { posisi = cl; }"
            r"            else if (!tempat && posisi) { tempat = cl.split('\u00b7')[0].trim(); break; }"
            "          }"
            "        }"
            "      }"
            "      if (!tempat) {"
            "        let ci = allTexts.findIndex(t => t === 'Info kontak' || t === 'Contact info');"
            "        if (ci !== -1) {"
            "          let t1 = allTexts[ci+1] || ''; let t2 = allTexts[ci+2] || '';"
            "          let bad = (t) => !t || t.length<=3 || t.toLowerCase().includes('muhammadiyah') || t.toLowerCase().includes('umm') || isGarbage(t);"
            "          if (!bad(t1)) tempat = cleanStr(t1.split(',')[0].split('|')[0].substring(0,80));"
            "          else if (!bad(t2)) tempat = cleanStr(t2.split(',')[0].split('|')[0].substring(0,80));"
            "        }"
            "      }"
            "      if (!posisi && !tempat) {"
            "        let aboutAnchor = document.getElementById('about');"
            "        let aboutSec = aboutAnchor ? aboutAnchor.closest('section, div.artdeco-card') : null;"
            "        if (!aboutSec) {"
            "          aboutSec = Array.from(document.querySelectorAll('section, div.artdeco-card')).find(s => {"
            "            let h2 = s.querySelector('h2');"
            "            return h2 && (h2.textContent.toLowerCase().includes('about') || h2.textContent.toLowerCase().includes('tentang'));"
            "          });"
            "        }"
            "        if (aboutSec) {"
            "          return {'nama':name,'headline':cleanStr(headline),'lokasi':location,"
            "            'posisi':cleanStr(posisi),'tempat':cleanStr(tempat),"
            "            'about':aboutSec.textContent.substring(0,500).trim()};"
            "        }"
            "      }"
            "    } catch(e) {}"
            "  }"
            "  if (!headline && name) {"
            "    let ni = allTexts.indexOf(name);"
            "    if (ni !== -1) {"
            "      for (let i = ni+1; i < Math.min(ni+4, allTexts.length); i++) {"
            "        let cand = cleanStr(allTexts[i]);"
            "        if (cand.length > 3 && !isGarbage(cand) && cand !== name) {"
            "          headline = cand.substring(0,150); break;"
            "        }"
            "      }"
            "    }"
            "  }"
            "  return {'nama':name,'headline':cleanStr(headline),'lokasi':location,"
            "    'posisi':cleanStr(posisi),'tempat':cleanStr(tempat),'about':''};"
            "}"
        )
        data = page.evaluate(js_profile)
        data['url'] = url
        return data
    except Exception as e:
        print(f"  ⚠️  Gagal ekstrak data profil: {e}")
        return None

def extract_job_info(headline):
    """Ekstrak posisi dan tempat kerja dari headline LinkedIn."""
    if not headline:
        return '', '', 'Tidak Diketahui'
    
    # Standarisasi karakter pembatas aneh menjadi pipe biasa
    headline = headline.replace('⎹', '|').replace('l', 'l')
    
    # Pattern: "Posisi at/di Perusahaan", "Posisi @ Perusahaan", atau "Posisi | Perusahaan"
    separators = [' @ ', ' at ', ' di ', ' - ', ' | ']
    for sep in separators:
        if sep in headline.lower() or (sep == ' | ' and '|' in headline):
            import re
            parts = re.split(re.escape(sep), headline, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) == 1 and sep == ' | ':
                parts = headline.split('|', 1)
                
            if len(parts) == 2:
                posisi = parts[0].replace('|', ',').strip()
                tempat = parts[1].replace('|', ',').strip()
                kategori = guess_kategori(tempat, posisi)
                return posisi, tempat, kategori
    
    # Jika tidak ada separator, anggap seluruhnya sebagai posisi
    posisi = headline.replace('|', ',').strip()
    return posisi, '', 'Tidak Diketahui'

def guess_kategori(tempat, posisi):
    """Tebak kategori pekerjaan berdasarkan kata kunci."""
    combined = (tempat + ' ' + posisi).lower()
    
    pns_keywords = ['pemerintah', 'kementerian', 'dinas', 'badan', 'pns', 'asn', 'aparatur',
                    'negeri', 'kemenko', 'kemenkes', 'kemendik', 'polri', 'tni', 'bumn', 'rsud', 'law', 'tv']
    wirausaha_keywords = ['founder', 'owner', 'ceo', 'co-founder', 'pemilik', 'entrepreneur',
                          'wiraswasta', 'wirausaha', 'self-employed', 'freelance']
    
    for kw in pns_keywords:
        if kw in combined:
            return 'PNS'
    for kw in wirausaha_keywords:
        if kw in combined:
            return 'Wirausaha'
    
    return 'Swasta'

# ─── SIMAWA Scraping ─────────────────────────────────────────────────────────────

def scrape_simawa(nim):
    """Scrape data Email dan No. HP/WA dari SIMAWA UMM berdasarkan NIM."""
    print(f"  🔍 Cek SIMAWA UMM untuk {nim}...")
    email = ''
    no_hp = ''
    try:
        scraper = cloudscraper.create_scraper()
        res = scraper.post('https://simawa.umm.ac.id/tracermhs', data={'nim': nim}, timeout=15)
        
        if res.status_code == 200 and 'Data Alumni Ditemukan' in res.text:
            soup = BeautifulSoup(res.text, 'html.parser')
            btn = soup.find('a', string=re.compile(r'Ya,\s*Ini\s*Saya', re.IGNORECASE))
            if btn:
                href = btn.get('href')
                if href:
                    detail_url = f"https://simawa.umm.ac.id/tracermhs/{href}" if not href.startswith('http') else href
                    res_detail = scraper.get(detail_url, timeout=15)
                    soup_detail = BeautifulSoup(res_detail.text, 'html.parser')
                    
                    email_inp = soup_detail.find('input', {'name': 'email'})
                    no_hp_inp = soup_detail.find('input', {'name': 'no_hp'}) or soup_detail.find('input', {'name': 'hp'})
                    
                    if email_inp: email = email_inp.get('value', '').strip()
                    if no_hp_inp: no_hp = no_hp_inp.get('value', '').strip()
                    print(f"  ✅ SIMAWA Ditemukan | Email: {email or '-'} | HP: {no_hp or '-'}")
                    return email, no_hp
        print("  ❌ SIMAWA: Data tidak ditemukan atau tombol tidak ada.")
    except Exception as e:
        print(f"  ⚠️ SIMAWA Error: {e}")
        
    return email, no_hp

def scrape_company_info(tempat_bekerja):
    """Mencari alamat dan sosial media perusahaan via Serper.dev."""
    if not tempat_bekerja or is_garbage_text(tempat_bekerja) or tempat_bekerja.lower() in ['-', 'none', 'n/a', 'tidak diketahui']:
        return '', ''
        
    print(f"  🏢 Mencari info perusahaan: {tempat_bekerja}...")
    alamat = ''
    sosmed = []
    
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }
    
    # 1. Cari Alamat via Places API
    try:
        url_places = 'https://google.serper.dev/places'
        payload_places = json.dumps({'q': tempat_bekerja, 'gl': 'id'})
        res_places = requests.post(url_places, headers=headers, data=payload_places, timeout=15)
        data_places = res_places.json()
        
        if 'places' in data_places and len(data_places['places']) > 0:
            alamat = data_places['places'][0].get('address', '')
            if alamat:
                print(f"    📍 Alamat: {alamat}")
    except Exception as e:
        print(f"    ⚠️ Error API Places: {e}")
        
    # 2. Cari Sosmed via Search API
    try:
        url_search = 'https://google.serper.dev/search'
        payload_search = json.dumps({'q': tempat_bekerja, 'gl': 'id', 'hl': 'id'})
        res_search = requests.post(url_search, headers=headers, data=payload_search, timeout=15)
        data_search = res_search.json()
        
        # Ekstrak link dari hasil organik
        for r in data_search.get('organic', []):
            link = r.get('link', '')
            if any(domain in link.lower() for domain in ['instagram.com', 'facebook.com', 'twitter.com', 'linkedin.com/company', 'x.com']):
                sosmed.append(link)
                
        if sosmed:
            # Ambil maksimal 3 sosmed teratas untuk dihemat
            sosmed = sosmed[:3]
            print(f"    🌐 Sosmed: {', '.join(sosmed)}")
    except Exception as e:
        print(f"    ⚠️ Error API Search: {e}")
        
    return alamat, ', '.join(sosmed)

def scrape_personal_sosmed(nama):
    """Mencari URL Instagram, Facebook, dan TikTok pribadi alumni via Serper.dev."""
    print(f"  \U0001f50d Mencari sosmed pribadi: {nama}...")
    urls = {'ig': '', 'fb': '', 'tiktok': ''}
    
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }
    
    try:
        url_search = 'https://google.serper.dev/search'
        # Gunakan query dengan filter domain spesifik agar sangat akurat
        search_query = f'"{nama}" site:instagram.com OR site:facebook.com OR site:tiktok.com'
        payload_search = json.dumps({'q': search_query, 'gl': 'id', 'hl': 'id', 'num': 10})
        res_search = requests.post(url_search, headers=headers, data=payload_search, timeout=15)
        data_search = res_search.json()
        
        for r in data_search.get('organic', []):
            link = r.get('link', '').lower()
            if not urls['ig'] and 'instagram.com/' in link and '/p/' not in link and '/reel/' not in link:
                urls['ig'] = r.get('link', '')
            elif not urls['fb'] and 'facebook.com/' in link and '/posts/' not in link:
                urls['fb'] = r.get('link', '')
            elif not urls['tiktok'] and 'tiktok.com/' in link and '/video/' not in link:
                urls['tiktok'] = r.get('link', '')
                
        found = [k.upper() for k, v in urls.items() if v]
        if found:
            print(f"    \U0001f310 Sosmed Pribadi Ditemukan: {', '.join(found)}")
        else:
            print("    \u274c Tidak ada sosmed pribadi yang valid ditemukan")
            
    except Exception as e:
        print(f"    \u26a0\ufe0f Error API Search Sosmed: {e}")
        
    return urls

# ─── Main Process ────────────────────────────────────────────────────────────────

def process_alumni(page, alumni):
    """Proses 1 alumni: cari di LinkedIn, simpan ke Supabase."""
    nim = alumni['nim'].strip()
    nama = alumni['nama'].strip()
    prodi = alumni.get('program_studi', '')
    
    print(f"\n{'='*60}")
    print(f"👤 {nama} ({nim}) — {prodi}")
    print(f"{'='*60}")
    
    # 1. Scrape SIMAWA
    simawa_email, simawa_no_hp = scrape_simawa(nim)
    
    # helper for save_result
    def save_final(match_data, score, status):
        save_result(nim, nama, prodi, match_data, score, status, simawa_email, simawa_no_hp)
    
    # 2. Cari di LinkedIn (dengan filter UMM dulu)
    query = f"{nama}"
    
    print(f"  \U0001f50d Mencari: \"{query}\" + filter UMM")
    results = search_via_serper(query, with_umm=True)
    
    umm_verified = len(results) > 0
    
    if not results:
        # Fallback: cari tanpa filter UMM
        print(f"  \U0001f50d Mencari ulang: \"{query}\" (tanpa filter UMM)")
        results = search_via_serper(query, with_umm=False)
    
    if not results:
        print(f"  \u274c Tidak ditemukan di LinkedIn")
        save_final(None, 0, 'Belum Ditemukan')
        return
    
    # Ambil kandidat teratas yang skor namanya minimal 40% dari 5 hasil pertama
    best_search_match = None
    best_initial_score = 0
    for r in results:
        score = calculate_name_similarity(nama, r['nama'])
        if score > best_initial_score:
            best_initial_score = score
            best_search_match = r
            
    if not best_search_match or best_initial_score < 40:
        print(f"  \u274c Tidak ada hasil dengan nama yang mirip")
        save_final(None, 0, 'Belum Ditemukan')
        return
        
    print(f"  \U0001f4ca Kandidat teratas: \"{best_search_match['nama']}\" | {best_search_match['headline']}")
    
    # Jika ditemukan TANPA filter UMM, cek snippet untuk UMM keywords
    if not umm_verified:
        snippet = best_search_match.get('snippet', '').lower()
        title = best_search_match.get('headline', '').lower()
        combined = snippet + ' ' + title
        if not re.search(r'(?:muhammadiyah|\bumm\b)', combined):
            print("  \u26a0\ufe0f  Profil tidak terkait UMM, simpan data SIMAWA saja")
            save_final(None, 0, 'Belum Ditemukan')
            return
        print("  \U0001f393 UMM terdeteksi di hasil pencarian Google")
    else:
        print("  \U0001f393 Terverifikasi alumni UMM via Google")
    
    # Bangun profile_data dari hasil pencarian Serper (tanpa buka halaman LinkedIn)
    profile_data = {
        'nama': best_search_match['nama'],
        'headline': best_search_match.get('headline', ''),
        'lokasi': best_search_match.get('lokasi', ''),
        'posisi': '',
        'tempat': '',
        'about': '',
        'url': best_search_match['url']
    }
    
    # Parse headline untuk posisi dan tempat kerja
    headline = best_search_match.get('headline', '')
    if ' di ' in headline:
        parts = headline.split(' di ', 1)
        profile_data['posisi'] = parts[0].strip()
        profile_data['tempat'] = parts[1].strip()
    elif ' at ' in headline.lower():
        idx = headline.lower().index(' at ')
        profile_data['posisi'] = headline[:idx].strip()
        profile_data['tempat'] = headline[idx+4:].strip()
    elif ' | ' in headline:
        parts = headline.split(' | ')
        profile_data['posisi'] = parts[0].strip()
        if len(parts) > 1:
            profile_data['tempat'] = parts[-1].strip()
    elif headline:
        profile_data['posisi'] = headline
    
    # Verifikasi berdasarkan kemiripan nama
    final_score = calculate_name_similarity(nama, profile_data.get('nama', '') or best_search_match['nama'])
    
    if final_score >= 70:
        print(f"  \u2705 Kecocokan kuat ({final_score}%), tandai Teridentifikasi")
        save_final(profile_data, final_score, 'Teridentifikasi')
    elif final_score >= 40:
        print(f"  \U0001f536 Kecocokan sedang ({final_score}%), tandai Perlu Verifikasi")
        save_final(profile_data, final_score, 'Perlu Verifikasi')
    else:
        print(f"  \u274c Nama tidak cocok ({final_score}%), simpan SIMAWA saja")
        save_final(None, 0, 'Belum Ditemukan')

def is_garbage_text(text):
    """Cek apakah teks ini sampah/bukan info pekerjaan."""
    if not text or len(text.strip()) < 3:
        return True
    lower = text.lower()
    garbage_patterns = [
        'aktivitas', 'pengikut', 'posting', 'postingan', 'dibagikan',
        'anda sama-sama', 'sorotan', 'tentang', 'info kontak', 'contact info',
        'terbuka untuk bekerja', 'open to work', 'di kantor', 'jarak jauh',
        'hubungkan', 'kirim pesan', 'tampilkan', 'ikuti', 'tidak ada posting',
        'daerah tingkat', 'gabungan', 'hybrid', 'koneksi'
    ]
    return any(p in lower for p in garbage_patterns)

def extract_from_about(about_text):
    """Coba ekstrak info pekerjaan dari bagian 'Tentang/About'."""
    if not about_text or len(about_text) < 10:
        return '', '', 'Tidak Diketahui'
    
    import re
    
    # Cari pola "bekerja di/at ...", "working at ...", "perusahaan PT. ..."
    patterns = [
        r'(?:bekerja|kerja|working|work)\s+(?:di|at|for)\s+([^,.\n]{3,50})',
        r'(?:my own company|perusahaan)[,\s]+([^,.\n]{3,60})',
        r'(?:PT\.?\s+[A-Z][a-zA-Z\s]{3,40})',
        r'(?:CEO|Founder|Owner|Director)\s+(?:of|di|at)\s+([^,.\n]{3,50})',
    ]
    
    tempat = ''
    posisi = ''
    
    for pattern in patterns:
        m = re.search(pattern, about_text, re.IGNORECASE)
        if m:
            tempat = m.group(1).strip() if m.lastindex else m.group(0).strip()
            break
    
    # Cari posisi dari about
    job_patterns = [
        r'(?:as a|sebagai|seorang)\s+([^,.\n]{3,50})',
    ]
    for pattern in job_patterns:
        m = re.search(pattern, about_text, re.IGNORECASE)
        if m:
            posisi = m.group(1).strip()
            break
    
    if tempat or posisi:
        kategori = guess_kategori(tempat, posisi)
        return posisi, tempat, kategori
    
    return '', '', 'Tidak Diketahui'

def save_result(nim, nama, prodi, match, score, status, email='', no_hp=''):
    """Simpan hasil scraping ke Supabase tracking_evidences."""
    posisi = ''
    tempat_bekerja = ''
    kategori = 'Tidak Diketahui'
    url_linkedin = ''
    
    if match:
        posisi = match.get('posisi', '')
        tempat_bekerja = match.get('tempat', '')
        headline = match.get('headline', '')
        about = match.get('about', '')
        
        # Bersihkan: jika posisi/tempat terdeteksi sebagai sampah, kosongkan
        if is_garbage_text(posisi):
            posisi = ''
        if is_garbage_text(tempat_bekerja):
            tempat_bekerja = ''
        
        # SELALU coba parse headline untuk posisi dan tempat jika masih kosong
        if headline:
            h_posisi, h_tempat, h_kategori = extract_job_info(headline)
            if is_garbage_text(h_posisi):
                h_posisi = ''
            if is_garbage_text(h_tempat):
                h_tempat = ''
            
            if not posisi and h_posisi:
                posisi = h_posisi
            if not tempat_bekerja and h_tempat:
                tempat_bekerja = h_tempat
        
        # Jika masih kosong, coba analisis dari bagian 'Tentang/About'
        if not posisi and not tempat_bekerja and about:
            posisi, tempat_bekerja, kategori = extract_from_about(about)
        
        # Hitung kategori akhir
        if posisi or tempat_bekerja:
            kategori = guess_kategori(tempat_bekerja, posisi)
        else:
            kategori = 'Tidak Diketahui'
            
        url_linkedin = match.get('url', '')
    
    alamat_bekerja, sosmed_tempat_bekerja = scrape_company_info(tempat_bekerja)
    
    # SELALU cari sosmed pribadi (terlepas dari hasil LinkedIn)
    sosmed_pribadi = scrape_personal_sosmed(nama)
    
    evidence_id = f"li-{nim}-{int(time.time())}"
    timestamp = datetime.now(timezone.utc).isoformat()
    
    record = {
        'id': evidence_id,
        'timestamp': timestamp,
        'nim': nim,
        'nama': nama,
        'pddikti_status': '',
        'confidence_score': score,
        'match_status': status,
        'verified_by': 'LinkedIn Scraper',
        'notes': f"Auto-scraped dari LinkedIn. Kandidat: {match['nama'] if match else 'N/A'}",
        'raw_data': json.dumps({
            'source': 'linkedin',
            'query': f"{nama}",
            'match': match,
            'all_results_count': 1 if match else 0,
        }),
        'tempat_bekerja': tempat_bekerja,
        'posisi': posisi,
        'kategori_pekerjaan': kategori,
        'url_linkedin': url_linkedin,
        'sumber_data': 'LinkedIn Scraper',
        'email': email,
        'no_hp': no_hp,
        'alamat_bekerja': alamat_bekerja,
        'sosmed_tempat_bekerja': sosmed_tempat_bekerja,
        'url_ig': sosmed_pribadi.get('ig', ''),
        'url_fb': sosmed_pribadi.get('fb', ''),
        'url_tiktok': sosmed_pribadi.get('tiktok', ''),
    }
    
    # Upsert: jika NIM sudah ada dengan sumber LinkedIn, update
    try:
        # Hapus record LinkedIn lama untuk NIM ini (jika ada)
        supabase.table('tracking_evidences').delete().eq('nim', nim).eq('sumber_data', 'LinkedIn Scraper').execute()
        # Insert baru
        supabase.table('tracking_evidences').insert(record).execute()
        print(f"  💾 Tersimpan ke Supabase: {status} | {tempat_bekerja} | {posisi}")
    except Exception as e:
        print(f"  ❌ Error simpan: {e}")

def main():
    import threading
    import builtins
    from concurrent.futures import ThreadPoolExecutor, as_completed

    parser = argparse.ArgumentParser(description='LinkedIn Alumni Scraper — UMM')
    parser.add_argument('--limit', type=int, default=10, help='Jumlah alumni yang diproses (default: 10)')
    parser.add_argument('--nim', type=str, help='Proses NIM spesifik')
    parser.add_argument('--offset', type=int, default=0, help='Mulai dari alumni ke-N')
    parser.add_argument('--prodi', type=str, help='Filter prodi tertentu')
    parser.add_argument('--status', type=str, default='Belum Dilacak', help='Target status UI')
    parser.add_argument('--workers', type=int, default=1, help='Jumlah worker paralel (default: 1)')
    parser.add_argument('--headless', action='store_true', help='Jalankan tanpa tampilan browser')
    args = parser.parse_args()

    # Thread-safe print
    print_lock = threading.Lock()
    original_print = builtins.print
    def safe_print(*a, **kw):
        with print_lock:
            original_print(*a, **kw)
            sys.stdout.flush()
    builtins.print = safe_print
    
    print("""
╔══════════════════════════════════════════════╗
║   LinkedIn Alumni Scraper — UMM Tracker      ║
║   Database: Supabase PostgreSQL              ║
╚══════════════════════════════════════════════╝
    """)
    
    # Ambil daftar alumni dari Supabase
    if args.nim:
        print(f"🎯 Mode: Proses NIM spesifik → {args.nim}")
        result = supabase.table('alumni_master').select('nim, nama, program_studi').eq('nim', args.nim.strip()).execute()
    else:
        print(f"🎯 Mode: Batch — Limit {args.limit}, Offset {args.offset}, Workers {args.workers}")
        query = supabase.table('alumni_master').select('nim, nama, program_studi')
        if args.prodi:
            query = query.ilike('program_studi', f'%{args.prodi}%')
        result = query.range(args.offset, args.offset + args.limit - 1).execute()
    
    alumni_list = result.data
    print(f"📊 Total alumni untuk diproses: {len(alumni_list)}")
    
    if not alumni_list:
        print("❌ Tidak ada alumni yang ditemukan.")
        return
    
    # Launch browser
    print(f"\U0001f504 Memulai pencarian data yang belum dilacak (Target: {args.limit} data baru)...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=args.headless,
            slow_mo=500,
        )
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        processed = 0
        
        if args.nim:
            # Mode 1 NIM
            result = supabase.table('alumni_master').select('nim, nama, program_studi').eq('nim', args.nim.strip()).execute()
            if result.data:
                process_alumni(page, result.data[0])
                processed += 1
        else:
            # Sesuaikan dengan target status UI
            if args.status == 'Belum Dilacak':
                tracked_nims = set()
                limit_q = 1000
                offset_q = 0
                while True:
                    tracked_result = supabase.table('tracking_evidences').select('nim').range(offset_q, offset_q + limit_q - 1).execute()
                    if not tracked_result.data:
                        break
                    for row in tracked_result.data:
                        if row.get('nim'):
                            tracked_nims.add(str(row['nim']).strip())
                    if len(tracked_result.data) < limit_q:
                        break
                    offset_q += limit_q
                print(f"📊 Mode: Belum Dilacak (Alumni sudah dilacak sebelumnya: {len(tracked_nims)})")
            elif args.status == 'Semua':
                tracked_nims = set()
                print(f"📊 Mode: Semua (Akan memproses/timpa semua data)")
            elif args.status == 'Perlu Verifikasi':
                tracked_nims = set()
                limit_q = 1000
                offset_q = 0
                while True:
                    tracked_result = supabase.table('tracking_evidences').select('nim, match_status').range(offset_q, offset_q + limit_q - 1).execute()
                    if not tracked_result.data:
                        break
                    for row in tracked_result.data:
                        if row.get('match_status') != 'Perlu Verifikasi' and row.get('nim'):
                            tracked_nims.add(str(row['nim']).strip())
                    if len(tracked_result.data) < limit_q:
                        break
                    offset_q += limit_q
                print(f"📊 Mode: Perlu Verifikasi (Akan mencari ulang data yang masih meragukan)")
            else:
                tracked_nims = set()
            
            # Kumpulkan semua alumni yang perlu diproses
            alumni_to_process = []
            current_offset = args.offset
            batch_size = 100
            
            while len(alumni_to_process) < args.limit:
                query = supabase.table('alumni_master').select('nim, nama, program_studi')
                if args.prodi:
                    query = query.ilike('program_studi', f'%{args.prodi}%')
                
                result = query.range(current_offset, current_offset + batch_size - 1).execute()
                fetched = result.data
                
                if not fetched:
                    print("\u26a0\ufe0f Tidak ada data alumni lagi di database.")
                    break
                
                for alumni in fetched:
                    nim_val = alumni['nim'].strip()
                    if nim_val in tracked_nims:
                        continue
                    alumni_to_process.append(alumni)
                    if len(alumni_to_process) >= args.limit:
                        break
                        
                current_offset += batch_size
            
            print(f"\U0001f4cb Alumni yang akan diproses: {len(alumni_to_process)}")
            
            processed_count = [0]
            count_lock = threading.Lock()
            
            num_workers = max(1, min(args.workers, len(alumni_to_process)))
            
            def worker_task(alumni_item, worker_id):
                """Task yang dijalankan oleh setiap worker thread."""
                try:
                    # Jeda awal per worker agar tidak tabrakan API
                    stagger_delay = worker_id * 2.5
                    if stagger_delay > 0:
                        time.sleep(stagger_delay)
                    
                    print(f"  [Worker-{worker_id}] Memproses: {alumni_item['nama'].strip()}")
                    process_alumni(page, alumni_item)
                    
                    with count_lock:
                        processed_count[0] += 1
                    
                    # Jeda antar request per worker
                    time.sleep(random.uniform(2.0, 4.0))
                    return True
                except Exception as e:
                    print(f"  \u274c [Worker-{worker_id}] Error: {e}")
                    return False
            
            if num_workers <= 1:
                # Mode sekuensial (seperti sebelumnya)
                for alumni in alumni_to_process:
                    try:
                        process_alumni(page, alumni)
                        processed_count[0] += 1
                        if processed_count[0] < len(alumni_to_process):
                            random_delay(3, 5)
                    except Exception as e:
                        print(f"  \u274c Error fatal: {e}")
                        continue
            else:
                # Mode paralel
                print(f"\U0001f680 Menjalankan {num_workers} worker paralel...")
                with ThreadPoolExecutor(max_workers=num_workers) as executor:
                    futures = {}
                    for idx, alumni in enumerate(alumni_to_process):
                        worker_id = (idx % num_workers) + 1
                        future = executor.submit(worker_task, alumni, worker_id)
                        futures[future] = alumni
                    
                    for future in as_completed(futures):
                        alumni = futures[future]
                        try:
                            future.result()
                        except Exception as e:
                            print(f"  \u274c Error saat memproses {alumni['nama']}: {e}")
        
        print(f"\n{'='*60}")
        print(f"\u2728 Selesai! {processed_count[0] if not args.nim else 1} alumni berhasil diproses.")
        print(f"{'='*60}")
        
        # Kembalikan print ke normal
        builtins.print = original_print
        browser.close()

if __name__ == '__main__':
    main()

