// Vercel serverless function. Needs GEMINI_API_KEY (Google AI Studio). Uses the Gemini REST API
// with the Google Search grounding tool. Returns a guide in the same schema as public/guides.js.
// Every claim must cite a fetched URL or be tagged "unverified".
const SCHEMA_HINT=`Return ONLY JSON (no markdown fences): {"name","difficulty":"Easy|Medium|Hard","setup","approval","composio","steps":[[text,sourceId|null,"sourced|inferred|unverified"]],"reqs":[same],"agent":[str],"human":[str],"sources":{"s1":url}}`;
function cors(res){res.setHeader('Access-Control-Allow-Origin',process.env.ALLOW_ORIGIN||'*');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type')}
module.exports=async(req,res)=>{
 cors(res);
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 const key=process.env.GEMINI_API_KEY; if(!key)return res.status(503).json({error:'GEMINI_API_KEY not configured on the server, so live generation is unavailable'});
 let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
 const app=String(body.app||'').slice(0,100).trim(); if(!app)return res.status(400).json({error:'app required'});
 const prompt=`You are investigating how a developer creates and gets approval for an OAuth app with "${app}" so their AI agent's users can connect it.
Use Google Search on the provider's OFFICIAL developer docs. Cover: where to register, redirect URI rules, scopes, whether review/verification exists, published review times, requirements (domain, privacy policy, video, security assessment, partner program), and limits before approval.
Also check https://docs.composio.dev/toolkits/managed-auth to see if Composio provides a managed OAuth app for it.
Rules: put the URL of every page you rely on in "sources"; tag a claim "sourced" only if a source states it, "inferred" if reasoned from sources, else "unverified" with sourceId null. Never guess review times. ${SCHEMA_HINT}`;
 // Model fallbacks: aliases get retired (gemini-2.5-flash was for new keys), and flash models return 503 under load.
 const models=[process.env.GEMINI_MODEL,'gemini-3.5-flash-lite','gemini-3.5-flash','gemini-flash-lite-latest'].filter(Boolean);
 const t0=Date.now(); let r,model,searched=true,last='';
 const call=(m,useSearch)=>fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`,{method:'POST',
  headers:{'x-goog-api-key':key,'Content-Type':'application/json'},signal:AbortSignal.timeout(Math.max(5000,52000-(Date.now()-t0))),
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],...(useSearch?{tools:[{google_search:{}}]}:{}),generationConfig:{temperature:0.2,...(useSearch?{}:{responseMimeType:'application/json'})}})});
 // Pass 1 with Google Search grounding; pass 2 without it (free-tier keys often have no grounding quota -> 429).
 outer: for(const useSearch of [true,false]){for(const m of models){if(Date.now()-t0>45000)break outer;
  try{r=await call(m,useSearch)}catch(e){last='timeout/network';r=null;continue}
  if(r.ok){model=m;searched=useSearch;break outer}
  try{last=r.status+': '+((await r.json()).error?.message||'').slice(0,160)}catch(e){last=String(r.status)}
  r=null}}
 if(!r)return res.status(502).json({error:'Gemini error '+last});
 const j=await r.json(); const cand=(j.candidates||[])[0]||{};
 const text=((cand.content||{}).parts||[]).map(p=>p.text||'').join('');
 // URLs Google Search actually returned (grounding metadata); used to flag citations the model did not ground.
 const grounded=((cand.groundingMetadata||{}).groundingChunks||[]).map(c=>(c.web||{}).uri).filter(Boolean);
 let g;
 try{g=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1))}catch(e){return res.status(502).json({error:'Agent returned unparseable output'})}
 g.sources=g.sources||{};
 // Drop cited URLs that do not resolve (model-remembered URLs are often dead); their claims become unverified.
 const dead=[];await Promise.all(Object.entries(g.sources).map(async([id,u])=>{try{const x=await fetch(u,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(4000)});if(x.status===404||x.status===410){dead.push(u);delete g.sources[id]}}catch(e){}}));
 if(dead.length)g.droppedSources=dead;
 // Honesty rule: a claim citing a missing source id is downgraded to unverified.
 for(const k of ['steps','reqs'])g[k]=(g[k]||[]).map(([t,s,tag])=>(s&&g.sources[s])?[t,s,tag||'inferred']:[t,null,tag==='inferred'?'inferred':'unverified']);
 // Without live search the URLs come from model memory, so nothing may claim "sourced".
 if(!searched)for(const k of ['steps','reqs'])g[k]=g[k].map(([t,s,tag])=>[t,s,tag==='sourced'?'inferred':tag]);
 if(!Object.keys(g.sources).length&&grounded.length)grounded.slice(0,8).forEach((u,i)=>g.sources['g'+(i+1)]=u);
 g.generated=new Date().toISOString()+` (Gemini ${model} ${searched?' + Google Search':', NO live search: sources from model memory, tags capped at inferred'}, not human-reviewed)`;
 res.status(200).json(g);
};
