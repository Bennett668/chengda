const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('approved product preview hashes, source targets and bilingual markup stay current',()=>{
  execFileSync(process.env.PYTHON||'python3',['tools/product_previews.py'],{cwd:root,stdio:'pipe'});
  const manifest=require('./product-previews.json');
  for(const [code,entry] of Object.entries(manifest))for(const prefix of ['','zh/']){
    const html=fs.readFileSync(path.join(root,prefix,'products',code,'index.html'),'utf8');
    for(const item of entry.gallery){
      assert.ok(html.includes(`data-src="${item.source}"`));
      assert.ok(html.includes(`src="${item.thumbnail.url}"`));
      assert.ok(Math.max(item.thumbnail.width,item.thumbnail.height)<=192);
    }
    for(const item of entry.drawings){
      assert.ok(html.includes(`href="${item.source}"`));
      assert.equal(item.previews.length,2);
      assert.ok(item.previews[1].width<=1440);
    }
  }
});
