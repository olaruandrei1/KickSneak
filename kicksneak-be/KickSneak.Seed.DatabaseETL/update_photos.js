const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const UNSPLASH_ACCESS_KEY = 'fS7Iq4ksQjYt8iOk5P9R0l1RHCUD6x3p-o2yh4kPn2I';
const SEED_DIR = path.join(__dirname, 'seed_data');

async function fetchUnsplash(query) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.unsplash.com',
            path: `/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
            headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
        };
        https.get(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const parsed = JSON.parse(data);
                    resolve(parsed.results.map(r => r.urls.regular));
                } else if (res.statusCode === 403) {
                    reject(new Error('Rate limit reached (403).'));
                } else {
                    reject(new Error(`Unsplash error: ${res.statusCode} - ${data}`));
                }
            });
        }).on('error', reject);
    });
}

function getFamily(catName) {
    if (!catName) return 'footwear';
    const c = catName.toLowerCase();
    if (c.includes('sneaker') || c.includes('shoe') || c.includes('running') || c.includes('basketball') || c.includes('lifestyle') || c.includes('skateboarding') || c.includes('trail') || c.includes('boot') || c.includes('slide') || c.includes('loafer')) return 'footwear';
    if (c.includes('t-shirt') || c.includes('hoodie') || c.includes('jacket') || c.includes('pant') || c.includes('short') || c.includes('apparel') || c.includes('clothing')) return 'apparel';
    if (c.includes('hat') || c.includes('bag') || c.includes('sock') || c.includes('sunglass') || c.includes('watch') || c.includes('wallet') || c.includes('accessor')) return 'accessories';
    if (c.includes('card') || c.includes('figurine') || c.includes('collectible')) return 'collectibles';
    return 'footwear';
}

function getBucket(brandName, catName) {
    const family = getFamily(catName);
    if (family === 'footwear') {
        const majorBrands = ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Puma', 'Converse', 'Vans', 'ASICS', 'Reebok'];
        const b = majorBrands.find(mb => brandName && brandName.toLowerCase().includes(mb.toLowerCase()));
        return b ? `${b} sneaker` : `sneaker shoes`;
    }
    if (family === 'apparel') {
        const c = (catName || '').toLowerCase();
        if (c.includes('hoodie')) return 'streetwear hoodie';
        if (c.includes('t-shirt')) return 'graphic t-shirt';
        if (c.includes('jacket')) return 'jacket streetwear';
        return 'streetwear clothing';
    }
    if (family === 'accessories') {
        const c = (catName || '').toLowerCase();
        if (c.includes('hat')) return 'baseball cap';
        if (c.includes('bag')) return 'backpack';
        if (c.includes('sunglass')) return 'sunglasses';
        if (c.includes('watch')) return 'wristwatch';
        return 'fashion accessories';
    }
    return 'collectible figurine';
}

function hashStringToInt(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const brandsRaw = JSON.parse(fs.readFileSync(path.join(SEED_DIR, '02_brands.json'), 'utf8'));
    const brandsMap = {};
    for (const b of brandsRaw) brandsMap[b.Id] = b.Name;

    const catsRaw = JSON.parse(fs.readFileSync(path.join(SEED_DIR, '03_categories.json'), 'utf8'));
    const catsMap = {};
    for (const c of catsRaw) catsMap[c.Id] = c.Name;

    const files = fs.readdirSync(SEED_DIR).filter(f => f.startsWith('products_') && f.endsWith('.json'));
    
    // Pass 1: Find all buckets needed
    const neededBuckets = new Set();
    for (const f of files) {
        const pData = JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf8'));
        for (const p of pData.products || []) {
            const bName = brandsMap[p.BrandId] || '';
            const cName = catsMap[p.CategoryId] || '';
            neededBuckets.add(getBucket(bName, cName));
        }
    }
    console.log(`Needed buckets (${neededBuckets.size}):`, Array.from(neededBuckets));

    // Fetch and cache Unsplash URLs
    const cacheFile = path.join(__dirname, 'unsplash_cache.json');
    let cache = {};
    if (fs.existsSync(cacheFile)) {
        cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    }

    let reqsMade = 0;
    for (const bucket of neededBuckets) {
        if (!cache[bucket] || cache[bucket].length === 0) {
            console.log(`Fetching bucket: ${bucket}...`);
            try {
                const urls = await fetchUnsplash(bucket);
                cache[bucket] = urls;
                fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
                reqsMade++;
                await sleep(1000); // polite delay
            } catch (err) {
                console.error(`Error fetching ${bucket}:`, err.message);
                if (err.message.includes('403')) {
                    console.log('Rate limit hit. Wait an hour and retry. Using fallback pictures for now or stopping?');
                    // We'll just break and use whatever we have if it's cached, else fallback
                    break;
                }
            }
        }
    }

    // Pass 2: Update photos
    let updatedProducts = 0;
    let sampleUrls = new Set();

    for (const f of files) {
        const fPath = path.join(SEED_DIR, f);
        const pData = JSON.parse(fs.readFileSync(fPath, 'utf8'));
        
        const photoMap = {};
        for (const ph of pData.product_photos || []) {
            if (!photoMap[ph.ProductId]) photoMap[ph.ProductId] = [];
            photoMap[ph.ProductId].push(ph);
        }

        let changedFile = false;
        for (const p of pData.products || []) {
            const bName = brandsMap[p.BrandId] || '';
            const cName = catsMap[p.CategoryId] || '';
            const bucket = getBucket(bName, cName);
            
            let urls = cache[bucket];
            if (!urls || urls.length === 0) {
                urls = cache['sneaker shoes']; // fallback
                if (!urls || urls.length === 0) continue; 
            }

            const pPhotos = photoMap[p.Id] || [];
            if (pPhotos.length > 0) {
                const h = hashStringToInt(p.Id);
                pPhotos.sort((a, b) => a.DisplayOrder - b.DisplayOrder);
                
                for (let i = 0; i < pPhotos.length; i++) {
                    const idx = (h + i) % urls.length;
                    let u = urls[idx];
                    if (!u.includes('?w=')) u += (u.includes('?') ? '&w=800&q=80' : '?w=800&q=80');
                    pPhotos[i].PhotoUrl = u;
                    if (sampleUrls.size < 5) sampleUrls.add(u);
                }
                updatedProducts++;
                changedFile = true;
            }
        }
        
        if (changedFile) {
            fs.writeFileSync(fPath, JSON.stringify(pData, null, 2));
        }
    }

    console.log(`\nDONE!`);
    console.log(`Unsplash API requests made: ${reqsMade}`);
    console.log(`Products updated: ${updatedProducts}`);
    console.log(`Sample URLs for verification:`);
    for (const u of sampleUrls) {
        console.log(`  ${u}`);
    }
}

main().catch(console.error);
