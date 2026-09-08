// Build Lightning Thief dictionary - Fast parallel edition
const fs = require('fs');
process.chdir(__dirname);

console.log('=== Lightning Thief Dictionary Builder (Fast) ===\n');

// ── Load filters ──
let COMMON = new Set();
try {
  COMMON = new Set(JSON.parse(fs.readFileSync('common_words_top3000.json', 'utf-8')).map(w => w.toLowerCase()));
} catch (e) {}

const EXTRA_SKIP = new Set([
  'percy','jackson','grover','annabeth','chiron','brunner','dodds','nancy','bobofit','gabe',
  'ugliano','sally','olympus','zeus','poseidon','hades','ares','athena','hermes','dionysus',
  'kronos','tartarus','manhattan','yancy','montauk','camaro','greyhound','halfblood',
  'minotaur','furies','hellhound','hellhounds','satyrs','clarisse','luke','castellan',
  'thalia','kronos','tyson','rachel','nico','bianca','diangelo','underwood',
  'okay','yeah','gonna','wanna','gotta','kinda','sorta','lotta',
  'didnt','wasnt','hasnt','hadnt','couldnt','wouldnt','shouldnt','isnt','arent','werent',
  'hes','shes','theyre','weve','youre','ive','youve','theyd','youd','wed','id','thats',
  'aaarrrggghhh','umm','hmm','uhh','errm','mmm','ooh','aah','eew','yuck','ugh','whoa'
]);

// ── Extract words ──
console.log('[1/3] Extracting words...');
const html = fs.readFileSync('lightning_thief_chapters.html', 'utf-8');
const pMatches = html.match(/<p>([\s\S]*?)<\/p>/gi) || [];
const text = pMatches.map(p => p.replace(/<[^>]+>/g, ' ')).join(' ');
const wordRegex = /\b[a-zA-Z][a-zA-Z-]*[a-zA-Z]\b/g;
const wordsSet = new Set();
let match;
while ((match = wordRegex.exec(text)) !== null) {
  const w = match[0].toLowerCase();
  if (w.length >= 3 && w.length <= 20 && !w.startsWith('-') && !w.endsWith('-') && !w.includes('--') && !/([a-z])\1{3,}/i.test(w)) {
    wordsSet.add(w);
  }
}
const allWords = Array.from(wordsSet).filter(w => !COMMON.has(w) && !EXTRA_SKIP.has(w)).sort();
console.log('  Words to process:', allWords.length);

// ── Match against SAT dict ──
console.log('[2/3] Cross-referencing...');
let satDict = {};
try { satDict = JSON.parse(fs.readFileSync('merged_dict.json', 'utf-8')); } catch (e) {}
const satKeys = new Set(Object.keys(satDict).map(k => k.toLowerCase()));

const result = {};
let toLookup = [];
for (const w of allWords) {
  if (satKeys.has(w)) { result[w] = satDict[w]; }
  else { toLookup.push(w); }
}
console.log('  From SAT:', Object.keys(result).length);
console.log('  To lookup:', toLookup.length);

// ── Fast parallel API lookup ──
console.log('[3/3] Fast API lookup...');
const CONCURRENCY = 20;
let completed = 0, found = 0, failed = 0;
const startTime = Date.now();

async function lookupOne(word) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const m = data[0].meanings?.[0];
    if (!m) return null;
    const defs = m.definitions?.slice(0, 3).map(d => d.definition).join('; ') || '';
    const ph = data[0].phonetic || '';
    return { p: m.partOfSpeech || '', c: '', e: defs + (ph ? ' | /' + ph + '/' : '') };
  } catch (e) { return null; }
}

// Process with a concurrent queue
async function processAll(words) {
  let idx = 0;

  async function worker() {
    while (idx < words.length) {
      const i = idx++;
      const w = words[i];
      const entry = await lookupOne(w);
      completed++;
      if (entry && entry.e) {
        result[w] = entry;
        found++;
      } else {
        failed++;
      }

      // Progress every 200 words
      if (completed % 200 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (completed / elapsed).toFixed(1);
        const remain = words.length - completed;
        const eta = Math.round(remain / parseFloat(rate));
        console.log('  ' + Math.round(100 * completed / words.length) + '% | ' + completed + '/' + words.length + ' | found=' + found + ' | ' + rate + ' req/s | ~' + eta + 's left');
      }
    }
  }

  // Launch workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

async function main() {
await processAll(toLookup);

const elapsed = Math.round((Date.now() - startTime) / 1000);
console.log('\n=== Done in ' + elapsed + 's ===');
console.log('  From SAT:', Object.keys(result).length - found);
console.log('  From API:', found);
console.log('  Failed:', failed);
console.log('  Total:', Object.keys(result).length);

// Save
const outPath = 'lightning_dict.json';
fs.writeFileSync(outPath, JSON.stringify(result), 'utf-8');
console.log('  Saved:', outPath, '(' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB)');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
