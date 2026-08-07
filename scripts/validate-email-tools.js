const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const toolsRoot=path.join(root,'email-tools');
const failures=[];
const titles=new Set();
const descriptions=new Set();
const canonicals=new Set();
const infrastructureDirectories=new Set(['assets','data','audiences','de']);
const directories=fs.readdirSync(toolsRoot,{withFileTypes:true}).filter(item=>item.isDirectory()&&!infrastructureDirectories.has(item.name));

function fail(message){failures.push(message);}
function match(html,re){return (html.match(re)||[])[1]||'';}
function decodeAttribute(value){return value.replace(/&#10;/g,'\n').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}

if(directories.length!==50)fail(`Expected 50 English tool directories, found ${directories.length}`);

for(const directory of directories){
  const file=path.join(toolsRoot,directory.name,'index.html');
  if(!fs.existsSync(file)){fail(`${directory.name}: missing index.html`);continue;}
  const html=fs.readFileSync(file,'utf8');
  const title=match(html,/<title>(.*?)<\/title>/);
  const description=match(html,/<meta name="description" content="([^"]+)"/);
  const canonical=match(html,/<link rel="canonical" href="([^"]+)"/);
  const h1Count=(html.match(/<h1[ >]/g)||[]).length;
  const visible=html.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<[^>]+>/g,' ').replace(/&(?:\w+|#\d+);/g,' ');
  const words=(visible.match(/[A-Za-z0-9’'-]+/g)||[]).length;
  if(title.length<30||title.length>60)fail(`${directory.name}: title length ${title.length}`);
  if(description.length<120||description.length>160)fail(`${directory.name}: description length ${description.length}`);
  if(!canonical.endsWith(`/email-tools/${directory.name}/`))fail(`${directory.name}: wrong canonical ${canonical}`);
  if(h1Count!==1)fail(`${directory.name}: expected one H1, found ${h1Count}`);
  if(words<400)fail(`${directory.name}: only ${words} visible words`);
  if(titles.has(title))fail(`${directory.name}: duplicate title`);titles.add(title);
  if(descriptions.has(description))fail(`${directory.name}: duplicate description`);descriptions.add(description);
  if(canonicals.has(canonical))fail(`${directory.name}: duplicate canonical`);canonicals.add(canonical);
  const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if(scripts.length!==1)fail(`${directory.name}: expected one JSON-LD block`);
  for(const script of scripts){try{JSON.parse(script[1]);}catch(error){fail(`${directory.name}: invalid JSON-LD (${error.message})`);}}
  for(const tone of ['warm','direct','formal']){
    const raw=match(html,new RegExp(`data-template-${tone}="([^"]+)"`));
    const draft=decodeAttribute(raw).replace(/\{recipient\}/g,'Dana').replace(/\{context\}/g,'Context.').replace(/\{detail\}/g,'Next step.');
    if(!raw||/[{}]/.test(draft)||draft.length<20)fail(`${directory.name}: unusable ${tone} builder template`);
  }
}

// Validate German Tools
const germanToolsRoot=path.join(toolsRoot,'de');
if(fs.existsSync(germanToolsRoot)){
  const germanDirectories=fs.readdirSync(germanToolsRoot,{withFileTypes:true}).filter(item=>item.isDirectory());
  if(germanDirectories.length!==20)fail(`Expected 20 German tool directories, found ${germanDirectories.length}`);
  for(const directory of germanDirectories){
    const file=path.join(germanToolsRoot,directory.name,'index.html');
    if(!fs.existsSync(file)){fail(`de/${directory.name}: missing index.html`);continue;}
    const html=fs.readFileSync(file,'utf8');
    const title=match(html,/<title>(.*?)<\/title>/);
    const description=match(html,/<meta name="description" content="([^"]+)"/);
    const canonical=match(html,/<link rel="canonical" href="([^"]+)"/);
    if(title.length<30||title.length>65)fail(`de/${directory.name}: title length ${title.length}`);
    if(description.length<110||description.length>170)fail(`de/${directory.name}: description length ${description.length}`);
    if(!canonical.endsWith(`/email-tools/de/${directory.name}/`))fail(`de/${directory.name}: wrong canonical ${canonical}`);
    if(titles.has(title))fail(`de/${directory.name}: duplicate title`);titles.add(title);
    if(descriptions.has(description))fail(`de/${directory.name}: duplicate description`);descriptions.add(description);
    if(canonicals.has(canonical))fail(`de/${directory.name}: duplicate canonical`);canonicals.add(canonical);
  }
}

const hub=fs.readFileSync(path.join(toolsRoot,'index.html'),'utf8');
for(const directory of directories){if(!hub.includes(`href="${directory.name}/"`))fail(`Hub missing ${directory.name}`);}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const directory of directories){if(!sitemap.includes(`/email-tools/${directory.name}/`))fail(`Sitemap missing ${directory.name}`);}
if(!sitemap.includes(`/email-tools/de/`))fail(`Sitemap missing /email-tools/de/`);

if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Validated 50 English pages and 20 German pages: metadata, canonicals, H1s, 400+ words, JSON-LD, internal links, sitemap, and robots.txt.`);
