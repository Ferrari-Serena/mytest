// Apply multi-book patches to app.js - v3: direct cm assignment
const fs = require('fs');
process.chdir(__dirname);

let code = fs.readFileSync('app.js', 'utf-8');
let count = 0;

function apply(label, oldStr, newStr) {
  if (code.includes(oldStr)) {
    code = code.replace(oldStr, newStr);
    count++;
    console.log(`  OK: ${label}`);
    return true;
  }
  console.log(`  FAIL: ${label} - string not found`);
  return false;
}

// 1. Dictionary: null-safe + online lookup
apply('1. Dict null-safe',
  'constructor(rawData){this.map=new Map();for(const[word,entry]of Object.entries(rawData)){this.map.set(word.toLowerCase(),entry)}}',
  'constructor(rawData){this.map=new Map();if(rawData){for(const[word,entry]of Object.entries(rawData)){this.map.set(word.toLowerCase(),entry)}}this.onlineCache=new Map()}'
);
apply('2. Dict online',
  'size(){return this.map.size}',
  'size(){return this.map.size}async lookupOnline(word){const w=word.toLowerCase().replace(/[^a-z-]/g,\'\');if(w.length<=2)return{word:w,pos:\'\',cn:\'\',en:\'\',found:false};if(this.onlineCache.has(w))return this.onlineCache.get(w);try{const res=await fetch(\'https://api.dictionaryapi.dev/api/v2/entries/en/\'+encodeURIComponent(w));if(!res.ok){const r={word:w,pos:\'\',cn:\'\',en:\'\',found:false};this.onlineCache.set(w,r);return r}const data=await res.json();const e=this._parseOnlineResult(w,data);this.onlineCache.set(w,e);return e}catch(err){const r={word:w,pos:\'\',cn:\'\',en:\'\',found:false};this.onlineCache.set(w,r);return r}}_parseOnlineResult(word,data){if(!Array.isArray(data)||!data[0])return{word,pos:\'\',cn:\'\',en:\'\',found:false};const m=data[0].meanings?.[0];if(!m)return{word,pos:\'\',cn:\'\',en:\'\',found:false};const defs=m.definitions?.slice(0,3).map(d=>d.definition).join(\'; \')||\'\';const ph=data[0].phonetic||\'\';return{word,pos:m.partOfSpeech||\'\',cn:\'\',en:defs+(ph?\' | /\'+ph+\'/\':\'\'),found:true}}'
);

// 2. BookManager class
apply('3. BookManager',
  'class SRSManager{',
  'class BookManager{constructor(){this.books=BOOKS_CONFIG.map(b=>({...b,chapterManager:new ChapterManager($(\'#\'+b.templateId))}));this.currentBookId=\'fear\'}getCurrent(){return this.books.find(b=>b.id===this.currentBookId)||this.books[0]}setCurrent(id){this.currentBookId=id;const bk=this.getCurrent();bk.chapterManager.setCurrent(bk.chapterManager.chapters[0]?.id||0);return bk}get cm(){return this.getCurrent().chapterManager}getBook(id){return this.books.find(b=>b.id===id)}}class SRSManager{'
);

// 3. UIManager.init - direct cm assignment (no getter)
apply('4. UIManager.init',
  "init(cm,dict,speech,wb,quiz,recManager){this.cm=cm;this.dict=dict;this.speech=speech;this.wb=wb;this.quiz=quiz;this.recManager=recManager;this._buildShell();this._bindEvents();this.showView('reading');if(cm.chapters.length>0)cm.setCurrent(cm.chapters[0].id)}",
  "init(bm,dict,speech,wb,quiz,recManager){this.bm=bm;this.cm=bm.cm;this.dict=dict;this.speech=speech;this.wb=wb;this.quiz=quiz;this.recManager=recManager;this._buildShell();this._bindEvents();this.showView('reading');const cm=this.cm;if(cm.chapters.length>0)cm.setCurrent(cm.chapters[0].id)}"
);

// 4. _buildShell: add book selector
apply('5. Nav',
  "_buildShell(){const app=$('#app');app.innerHTML='<nav id=\"top-nav\"><span class=\"logo\">SAT 词汇阅读器</span><span id=\"cloud-status\" style=\"font-size:10px;margin-left:4px\" title=\"云同步状态\">&#9898;</span><button data-view=\"reading\" class=\"active\">&#128218; 阅读</button><button data-view=\"wordbank\">&#128221; 生词本 <span class=\"badge\" id=\"wb-badge\">0</span></button><button data-view=\"quiz\">&#128203; 测验</button><button data-view=\"flashcard\">&#127903; 单词卡片</button></nav><div id=\"main-content\"><div id=\"view-reading\" class=\"view active\"></div><div id=\"view-wordbank\" class=\"view\"></div><div id=\"view-quiz\" class=\"view\"></div><div id=\"view-flashcard\" class=\"view\"></div></div>'}",

  "_buildShell(){const app=$('#app');const bo=BOOKS_CONFIG.map(b=>'<option value=\"'+b.id+'\">'+b.title+'</option>').join('');app.innerHTML='<nav id=\"top-nav\"><span class=\"logo\">SAT 词汇阅读器</span><select id=\"book-select\" style=\"font-family:var(--font-ui);font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);cursor:pointer;margin-right:12px;max-width:220px\">'+bo+'</select><span id=\"cloud-status\" style=\"font-size:10px;margin-left:4px\" title=\"云同步状态\">&#9898;</span><button data-view=\"wordbank\">&#128221; 生词本 <span class=\"badge\" id=\"wb-badge\">0</span></button><button data-view=\"quiz\">&#128203; 测验</button><button data-view=\"flashcard\">&#127903; 单词卡片</button></nav><div id=\"main-content\"><div id=\"view-reading\" class=\"view active\"></div><div id=\"view-wordbank\" class=\"view\"></div><div id=\"view-quiz\" class=\"view\"></div><div id=\"view-flashcard\" class=\"view\"></div></div>'}"
);

// 5. _bindEvents: book selector handler - update this.cm on switch
apply('6. Bind events',
  "_bindEvents(){$$('#top-nav button[data-view]').forEach(btn=>{btn.addEventListener('click',()=>this.showView(btn.dataset.view))});$('#popup-overlay').addEventListener('click',(e)=>{if(e.target===$('#popup-overlay'))this.hidePopup()});document.addEventListener('keydown',(e)=>{if(e.key==='Escape')this.hidePopup()})}",

  "_bindEvents(){$$('#top-nav button[data-view]').forEach(btn=>{btn.addEventListener('click',()=>this.showView(btn.dataset.view))});const bs=$('#book-select');if(bs)bs.addEventListener('change',()=>{this.bm.setCurrent(bs.value);this.cm=this.bm.cm;this.showView('reading')});$('#popup-overlay').addEventListener('click',(e)=>{if(e.target===$('#popup-overlay'))this.hidePopup()});document.addEventListener('keydown',(e)=>{if(e.key==='Escape')this.hidePopup()})}"
);

// 6. renderReadingView: online click for book 2
apply('7. Click handler',
  "$('#chapter-body').addEventListener('click',(e)=>{const b=e.target.closest('b');if(b)this.showPopup(b.textContent.trim(),e)})",

  "if(this.bm.getCurrent().hasPreMarked){$('#chapter-body').addEventListener('click',(e)=>{const b=e.target.closest('b');if(b)this.showPopup(b.textContent.trim(),e)})}else{const s=this;$('#chapter-body').addEventListener('click',async function(e){const sel=window.getSelection();if(sel&&sel.toString().trim().length>0)return;const r=document.caretRangeFromPoint(e.clientX,e.clientY);if(!r)return;const tn=r.startContainer;if(tn.nodeType!==3)return;const ft=tn.textContent;const off=r.startOffset;let st=off;while(st>0&&/[a-zA-Z-]/.test(ft[st-1]))st--;let end=off;while(end<ft.length&&/[a-zA-Z-]/.test(ft[end]))end++;const w=ft.substring(st,end).trim();if(w.length<=2)return;if(!/^[a-zA-Z]+/.test(w))return;const en=await s.dict.lookupOnline(w);if(en&&en.found){s.showPopupForEntry(en,w,e)}else{s.showPopupForEntry({word:w,pos:'',cn:'',en:'[Lookup failed]',found:false},w,e)}})}"
);

// 7. showPopupForEntry
apply('8. showPopupForEntry',
  '_startReadAloud(chapter){',
  'async showPopupForEntry(entry,word,event){const saved=this.wb.isSaved(word);const bk=this.bm.getCurrent();const ss=saved?\'<span class="wordbank-status saved"> 已在生词本中 (\'+this.wb.srs.masteryLabels[this.wb.get(word)?.masteryLevel||0]+\')</span>\':\'<span class="wordbank-status unsaved">尚未加入生词本</span>\';const card=$(\'#popup-card\');card.innerHTML=\'<div class="popup-word">\'+entry.word+\'<div><button class="pronounce-btn" title="朗读单词" id="btn-pronounce-word">&#128266;</button><button class="pronounce-btn" title="关闭" id="btn-close-popup">&#10005;</button></div></div>\'+(entry.pos?\'<div class="popup-pos">\'+entry.pos+\'</div>\':\'\')+\'<div class="popup-cn">\'+(entry.cn||\'[Online Dictionary]\')+\'</div>\'+(entry.en?\'<div class="popup-en">\'+entry.en+\'</div>\':\'\')+\'<div class="popup-example">"\'+word+\'" in <i>\'+bk.title+\'</i></div><div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">\'+ss+\'</div><div class="popup-actions" style="flex-wrap:wrap">\'+(saved?\'<button class="btn btn-sm" id="btn-remove-wordbank"> 移出</button>\':\'<button class="btn-accent btn-sm" id="btn-add-wordbank"> 加入生词本</button>\')+\'<button class="btn btn-sm" id="btn-close-popup2">关闭</button></div>\';this._positionPopup(card,event);$(\'#popup-overlay\').classList.add(\'show\');this.currentPopupWord=word;$(\'#btn-pronounce-word\').addEventListener(\'click\',()=>this.speech.speakWord(word));const cf=()=>this.hidePopup();$(\'#btn-close-popup\').addEventListener(\'click\',cf);$(\'#btn-close-popup2\').addEventListener(\'click\',cf);const ab=$(\'#btn-add-wordbank\');if(ab)ab.addEventListener(\'click\',()=>{this.wb.add(word,this.cm.getCurrent()?.id||0,bk.id);this.showToast(\'"\'+word+\'" 已加入生词本\',\'success\');this.updateBadge();this.showPopupForEntry(entry,word,event)});const rb=$(\'#btn-remove-wordbank\');if(rb)rb.addEventListener(\'click\',()=>{this.wb.remove(word);this.showToast(\'"\'+word+\'" 已移出生词本\',\'info\');this.updateBadge();this.showPopupForEntry(entry,word,event)})}_startReadAloud(chapter){'
);

// 8. QuizEngine with BookManager
apply('9. QuizEngine',
  'constructor(dictionary,wordBank,chapterManager){this.dict=dictionary;this.wb=wordBank;this.cm=chapterManager}',
  'constructor(dictionary,wordBank,bookManager){this.dict=dictionary;this.wb=wordBank;this.bm=bookManager;this.cm=bookManager.cm}'
);
apply('10. Quiz source',
  "else if(source.startsWith('chapter_')){const chId=parseInt(source.replace('chapter_',''));const ch=this.cm.getChapter(chId);if(ch)pool=ch.boldWords}",
  "else if(source.startsWith('chapter_')){const p=source.replace('chapter_','').split('_');const bkId=p[0];const chId=parseInt(p[1]);const b=this.bm.getBook(bkId);if(b){const ch=b.chapterManager.getChapter(chId);if(ch)pool=ch.boldWords}}"
);

// 9. WordBank bookId
apply('11. WordBank',
  'add(word,chapterId){const w=word.toLowerCase();if(this.data.words[w])return false;const srs=this.srs.getDefaultSRS();srs.firstSeenChapter=chapterId;',
  'add(word,chapterId,bookId){const w=word.toLowerCase();if(this.data.words[w])return false;const srs=this.srs.getDefaultSRS();srs.firstSeenChapter=chapterId;if(bookId)srs.bookId=bookId;'
);

// 10. DOMContentLoaded
apply('12. Init',
  "document.addEventListener('DOMContentLoaded',async()=>{const dict=new Dictionary(DICTIONARY_RAW);const cm=new ChapterManager($('#chapter-content'));const speech=new SpeechService();const recManager=new RecordingManager();const wb=new WordBank();const quiz=new QuizEngine(dict,wb,cm);const ui=new UIManager();await Promise.all([speech.init(),recManager._ready()]);const cloudWords=await loadWordsFromCloud();if(cloudWords.length>0){cloudWords.forEach(w=>{if(!wb.data.words[w.word]){wb.data.words[w.word]=w}});wb._save();updateCloudStatus('#4caf50','已同步'+cloudWords.length+'词');console.log('CloudBase: merged '+cloudWords.length+' words from cloud')}ui.init(cm,dict,speech,wb,quiz,recManager);console.log('SAT Vocabulary Reader: '+cm.getChapterCount()+' chapters, '+dict.size()+' dict entries, '+wb.getCount()+' words in bank')})})();",

  "document.addEventListener('DOMContentLoaded',async()=>{const dict=new Dictionary(DICTIONARY_RAW);const bm=new BookManager();const speech=new SpeechService();const recManager=new RecordingManager();const wb=new WordBank();const quiz=new QuizEngine(dict,wb,bm);const ui=new UIManager();await Promise.all([speech.init(),recManager._ready()]);const cloudWords=await loadWordsFromCloud();if(cloudWords.length>0){cloudWords.forEach(w=>{if(!wb.data.words[w.word]){wb.data.words[w.word]=w}});wb._save();updateCloudStatus('#4caf50','已同步'+cloudWords.length+'词');console.log('CloudBase: merged '+cloudWords.length+' words from cloud')}ui.init(bm,dict,speech,wb,quiz,recManager);console.log('SAT Reader: Fear='+bm.getBook('fear').chapterManager.getChapterCount()+'ch Lightning='+bm.getBook('lightning').chapterManager.getChapterCount()+'ch')})})();"
);

fs.writeFileSync('app.js', code, 'utf-8');
console.log(`\nTotal: ${count} patches applied`);

const { execSync } = require('child_process');
try {
  execSync('node --check app.js', { stdio: 'pipe' });
  console.log('Syntax: PASSED');
} catch (e) {
  console.log('Syntax: FAILED');
  console.log(e.stderr?.toString()?.substring(0, 500));
}
