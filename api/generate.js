// Vercel serverless function. Primary provider: xAI Grok (Responses API + live web_search tool), env XAI_API_KEY.
// Fallback: Google Gemini (env GEMINI_API_KEY). Returns a guide in the same schema as public/guides.js.
// Honesty rules: "sourced" only when live search ran AND returned that exact URL as a citation.
const SCHEMA_HINT=`Return ONLY JSON (no markdown fences): {"name","difficulty":"Easy|Medium|Hard","setup","approval","composio","steps":[[text,sourceId|null,"sourced|inferred|unverified"]],"reqs":[same],"agent":[str],"human":[str],"sources":{"s1":url}}`;
const MANAGED_URL='https://docs.composio.dev/toolkits/managed-auth.md';
function cors(res){res.setHeader('Access-Control-Allow-Origin',process.env.ALLOW_ORIGIN||'*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type')}
const norm=s=>String(s).toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\.(com|io|dev|co|app|net|org).*$/,'').replace(/[^a-z0-9]/g,'');
const normUrl=u=>String(u).replace(/[#?].*$/,'').replace(/\/+$/,'').toLowerCase();

// Server-side lookup of Composio's managed OAuth list (deterministic, not model-guessed).
async function composioManaged(app){
 try{const r=await fetch(MANAGED_URL,{signal:AbortSignal.timeout(6000)});if(!r.ok)return null;const md=await r.text();
  const i=md.indexOf('## Composio-managed'),j=md.indexOf('## Bring your own');if(i<0||j<0)return null;
  const rows=s=>[...s.matchAll(/^\|\s*\[([^\]]+)\][^|]*\|\s*`([A-Z0-9_]+)`/gm)].map(m=>[norm(m[1]),norm(m[2]),m[1]]);
  const k=norm(app),hit=list=>list.find(([n,s])=>n===k||s===k);
  const m=hit(rows(md.slice(i,j))),b=hit(rows(md.slice(j)));
  if(m)return{managed:true,label:m[2]};if(b)return{managed:false,label:b[2]};return{managed:null};
 }catch(e){return null}}

function buildPrompt(app){return `You are investigating how a developer creates and gets approval for an OAuth app with "${app}" so their AI agent's users can connect it.
Search the provider's OFFICIAL developer docs. Cover: where to register, redirect URI rules, scopes, whether review/verification/app-store listing exists, published review times, requirements (domain, privacy policy, demo video, security assessment, partner program), and limits before approval (user caps, dev stores, test users).
Rules:
- "setup" and "approval": give CONCRETE time estimates only when a source states them, quoting the figure (e.g. "Shopify states app review takes 5-7 business days"). If no source publishes a figure, write "not published" and optionally add your rough estimate explicitly labelled "estimate".
- Do NOT state whether Composio manages an OAuth app for this service; leave "composio" as "" (the server fills it from Composio's docs).
- Put the URL of every page you rely on in "sources" (only URLs you actually opened or got from search). Tag a claim "sourced" only if that source states it, "inferred" if reasoned from sources, else "unverified" with sourceId null. Never invent review times, URLs or numbers.
- Keep 4-8 steps and 2-6 reqs, each one concise and specific. ${SCHEMA_HINT}`}

// --- xAI Grok (Responses API) ---
async function callXai(prompt,t0){
 const key=process.env.XAI_API_KEY;if(!key)return{err:'XAI_API_KEY not set'};
 const models=[process.env.XAI_MODEL,'grok-4-1-fast-non-reasoning','grok-4-fast-non-reasoning','grok-4.7'].filter(Boolean);let last='';
 for(const m of models){if(Date.now()-t0>40000)break;
  let r;try{r=await fetch('https://api.x.ai/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(Math.max(5000,50000-(Date.now()-t0))),
   body:JSON.stringify({model:m,input:[{role:'user',content:prompt}],tools:[{type:'web_search'}],temperature:0.2})})}catch(e){last='timeout/network';continue}
  if(!r.ok){try{const j=await r.json();last=r.status+': '+String(j.error?.message||j.error||j.code||'').slice(0,160)}catch(e){last=String(r.status)}
   if(r.status===401||r.status===403)break;continue}
  const j=await r.json();let text='';const cites=new Set(Array.isArray(j.citations)?j.citations.map(c=>typeof c==='string'?c:c.url).filter(Boolean):[]);
  for(const o of j.output||[])for(const c of o.content||[]){if(c.text)text+=c.text;for(const a of c.annotations||[])if(a.url)cites.add(a.url)}
  if(!text&&j.output_text)text=j.output_text;
  const searchCalls=(j.output||[]).filter(o=>/search/.test(o.type||'')).length+((j.usage||{}).num_server_side_tools_used||0);
  return{text,cites:[...cites],searched:cites.size>0||searchCalls>0,label:`Grok ${m} + xAI web_search`};}
 return{err:'xAI '+last}}

// --- Gemini fallback ---
async function callGemini(prompt,t0){
 const key=process.env.GEMINI_API_KEY;if(!key)return{err:'GEMINI_API_KEY not set'};
 const models=[process.env.GEMINI_MODEL,'gemini-3.5-flash-lite','gemini-3.5-flash','gemini-flash-lite-latest'].filter(Boolean);let last='';
 const call=(m,s)=>fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,{method:'POST',
  headers:{'x-goog-api-key':key,'Content-Type':'application/json'},signal:AbortSignal.timeout(Math.max(5000,52000-(Date.now()-t0))),
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],...(s?{tools:[{google_search:{}}]}:{}),generationConfig:{temperature:0.2,...(s?{}:{responseMimeType:'application/json'})}})});
 for(const s of [true,false])for(const m of models){if(Date.now()-t0>47000)return{err:'Gemini '+last};
  let r;try{r=await call(m,s)}catch(e){last='timeout/network';continue}
  if(!r.ok){try{last=r.status+': '+((await r.json()).error?.message||'').slice(0,160)}catch(e){last=String(r.status)}continue}
  const j=await r.json();const cand=(j.candidates||[])[0]||{};
  const text=((cand.content||{}).parts||[]).map(p=>p.text||'').join('');
  const cites=((cand.groundingMetadata||{}).groundingChunks||[]).map(c=>(c.web||{}).uri).filter(Boolean);
  return{text,cites,searched:s&&cites.length>0,label:`Gemini ${m}${s?' + Google Search':', NO live search'}`};}
 return{err:'Gemini '+last}}

module.exports=async(req,res)=>{
 cors(res);
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 if(!process.env.XAI_API_KEY&&!process.env.GEMINI_API_KEY)return res.status(503).json({error:'No XAI_API_KEY or GEMINI_API_KEY configured on the server, so live generation is unavailable'});
 let body=req.body||{};if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
 const app=String(body.app||'').slice(0,100).trim();if(!app)return res.status(400).json({error:'app required'});
 const t0=Date.now(),prompt=buildPrompt(app),managedP=composioManaged(app);
 let out=await callXai(prompt,t0);const errs=[];
 if(out.err){errs.push(out.err);out=await callGemini(prompt,t0)}
 if(out.err){errs.push(out.err);return res.status(502).json({error:'All providers failed: '+errs.join(' | ')})}
 let g;const text=out.text||'';
 try{g=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1))}catch(e){return res.status(502).json({error:'Agent returned unparseable output'})}
 g.sources=g.sources&&typeof g.sources==='object'?g.sources:{};
 for(const[id,u]of Object.entries(g.sources))if(!/^https?:\/\//.test(String(u)))delete g.sources[id];
 // Drop cited URLs that do not resolve; their claims become unverified.
 const dead=[];await Promise.all(Object.entries(g.sources).map(async([id,u])=>{try{const x=await fetch(u,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(4000)});if(x.status===404||x.status===410){dead.push(u);delete g.sources[id]}}catch(e){}}));
 if(dead.length)g.droppedSources=dead;
 const cited=new Set(out.cites.map(normUrl));
 const live=id=>out.searched&&g.sources[id]&&cited.has(normUrl(g.sources[id]));
 for(const k of ['steps','reqs'])g[k]=(Array.isArray(g[k])?g[k]:[]).filter(Array.isArray).map(([t,s,tag])=>{
  if(!(s&&g.sources[s]))return[t,null,tag==='inferred'?'inferred':'unverified'];
  // "sourced" requires the URL to be among the citations the live search tool actually returned.
  return[t,s,tag==='sourced'&&!live(s)?'inferred':(tag||'inferred')]});
 // Composio-managed claim comes from the server-side lookup only.
 const m=await managedP;
 if(m&&m.managed===true){g.composio=`Yes: Composio lists ${m.label} under "Composio-managed OAuth available" (${MANAGED_URL.replace('.md','')}).`;g.sources.composio=MANAGED_URL.replace('.md','')}
 else if(m&&m.managed===false){g.composio=`No: Composio lists ${m.label} under "Bring your own OAuth app"; you must register your own OAuth app.`;g.sources.composio=MANAGED_URL.replace('.md','')}
 else g.composio='Unverified: could not match this app in Composio\'s managed OAuth list; check docs.composio.dev/toolkits/managed-auth.';
 if(!Object.keys(g.sources).length&&out.cites.length)out.cites.slice(0,8).forEach((u,i)=>g.sources['c'+(i+1)]=u);
 g.citations=out.cites.slice(0,20);
 g.generated=new Date().toISOString()+` (${out.label}${out.searched?'':': sources from model memory, tags capped at inferred'}${errs.length?'; fallback after: '+errs.join(' | '):''}; ${((Date.now()-t0)/1000).toFixed(1)}s, not human-reviewed)`;
 res.status(200).json(g);
};
