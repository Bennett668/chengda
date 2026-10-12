const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {migrate} = require('./migrate-product-galleries.cjs');
const root = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(root,'assets/product-gallery.js'),'utf8');
test('all retained product templates use the same manual gallery without bulk preload',()=>{
  const files = execFileSync('git',['ls-files','-z','products/*/index.html','zh/products/*/index.html'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  assert.equal(files.length,538);
  for(const file of files){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.equal(migrate(html),html,file);
    assert.equal((html.match(/src="\/assets\/product-gallery.js\?v=1"/g)||[]).length,1,file);
    assert.doesNotMatch(html,/autoTimer|new Image\(\)|const thumbs = Array.from/,file);
  }
});
test('gallery migration refuses unreviewed inline code',()=>{
  assert.throws(()=>migrate('  const thumbs = Array.from([]); strangeChange();\n  const addBtn = 1;'),/Unreviewed/);
});
for(const lang of ['en','zh-Hant'])for(const count of [0,1,4])test(`${lang} gallery has names, one tab stop and on-demand keyboard selection (${count})`,()=>{
  const element=(dataset={})=>({dataset,attrs:{},events:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},addEventListener(k,fn){this.events[k]=fn;},focus(){this.focused=true;}});
  const main=element(),panel=element(),list=element(),prev=element(),next=element();
  main.alt='Model';let requested=[];Object.defineProperty(main,'src',{set(v){requested.push(v);},get(){return requested.at(-1);}});
  const thumbs=Array.from({length:count},(_,i)=>element({src:`photo-${i}.webp`,alt:`View ${i}`}));
  const document={documentElement:{lang},getElementById:()=>main,querySelectorAll:()=>thumbs,querySelector:s=>({'.pd-hero':panel,'.pd-thumbs':list,'.pd-arrow.prev':prev,'.pd-arrow.next':next})[s]};
  vm.runInNewContext(source,{document,setInterval(){throw Error('No automatic advance');},setTimeout(){throw Error('No delayed image changes');},Image(){throw Error('No eager preloads');}});
  if(!count){assert.equal(requested.length,0);return;}
  assert.deepEqual(requested,['photo-0.webp']);
  const check=index=>{assert.equal(thumbs.filter(t=>t.tabIndex===0).length,1);assert.equal(thumbs[index].tabIndex,0);assert.equal(panel.attrs['aria-labelledby'],thumbs[index].id);for(const t of thumbs){assert.ok(t.attrs['aria-label']);assert.equal(t.attrs['aria-controls'],panel.id);}};
  check(0);next.events.click();check(1%count);prev.events.click();check(0);
  for(const [key,target] of [['End',count-1],['Home',0],['ArrowLeft',count-1],['ArrowRight',0]]){
    const active=thumbs.find(t=>t.tabIndex===0);let prevented=false;active.events.keydown({key,preventDefault(){prevented=true;}});assert.equal(prevented,true);check(target);assert.equal(thumbs[target].focused,true);
  }
  thumbs[count-1].events.click();check(count-1);assert.equal(main.src,`photo-${count-1}.webp`);
});
