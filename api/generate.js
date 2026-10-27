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
 const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
 let r;
 try{r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',
  headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
  body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.2}})})}
 catch(e){return res.status(502).json({error:'Could not reach Gemini API'})}
 if(!r.ok){let d='';try{d=(await r.json()).error?.message||''}catch(e){}return res.status(502).json({error:'Gemini error '+r.status+(d?': '+d.slice(0,200):'')})}
 const j=await r.json(); const cand=(j.candidates||[])[0]||{};
 const text=((cand.content||{}).parts||[]).map(p=>p.text||'').join('');
 // URLs Google Search actually returned (grounding metadata); used to flag citations the model did not ground.
 const grounded=((cand.groundingMetadata||{}).groundingChunks||[]).map(c=>(c.web||{}).uri).filter(Boolean);
 let g;
 try{g=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1))}catch(e){return res.status(502).json({error:'Agent returned unparseable output'})}
 g.sources=g.sources||{};
 // Honesty rule: a claim citing a missing source id is downgraded to unverified.
 for(const k of ['steps','reqs'])g[k]=(g[k]||[]).map(([t,s,tag])=>(s&&g.sources[s])?[t,s,tag||'inferred']:[t,null,tag==='inferred'?'inferred':'unverified']);
 if(!Object.keys(g.sources).length&&grounded.length)grounded.slice(0,8).forEach((u,i)=>g.sources['g'+(i+1)]=u);
 g.generated=new Date().toISOString()+` (Gemini ${model} + Google Search, not human-reviewed)`;
 res.status(200).json(g);
};
