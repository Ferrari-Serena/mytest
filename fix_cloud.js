const fs = require('fs');
let app = fs.readFileSync('./app.js', 'utf-8');

// Fix 1: Remove floating saveWordsToCloud(this.data.words) line
app = app.replace(/\n\s*saveWordsToCloud\(this\.data\.words\);\n/, '\n');

// Fix 2: Update _save to also call cloud sync
app = app.replace(
  '_save(){try{localStorage.setItem(this.key,JSON.stringify(this.data))}catch(e){}}',
  '_save(){try{localStorage.setItem(this.key,JSON.stringify(this.data));saveWordsToCloud(Object.values(this.data.words))}catch(e){}}'
);

// Fix 3: Make sure the init code is inside the IIFE
// Move CloudBase init from before IIFE to inside it (after 'use strict')
// Actually the init code BEFORE the IIFE is fine because it defines global functions
// that the IIFE code can access. But we need to ensure they don't error out.

// Check what we have
console.log('Floating statement removed:', !app.includes('saveWordsToCloud(this.data.words)'));
console.log('_save calls cloud:', app.includes('saveWordsToCloud(Object.values'));

fs.writeFileSync('./app.js', app, 'utf-8');
console.log('app.js fixed');
