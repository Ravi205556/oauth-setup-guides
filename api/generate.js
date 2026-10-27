// Vercel serverless function. Needs OPENAI_API_KEY (uses the Responses API with the web_search tool).
// Returns a guide in the same schema as public/guides.js. Every claim must cite a fetched URL or be tagged "unverified".
const SCHEMA_HINT=`Return ONLY JSON: {"name","difficulty":"Easy|Medium|Hard","setup","approval","composio","steps":[[text,sourceId|null,"sourced|inferred|unverified"]],"reqs":[same],"agent":[str],"human":[str],"sources":{"s1":url}}`;
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 const key=process.env.OPENAI_API_KEY; if(!key)return res.status(503).json({error:'OPENAI_API_KEY not configured'});
 const app=String((req.body||{}).app||'').slice(0,100); if(!app)return res.status(400).json({error:'app required'});
 const prompt=`You are investigating how a developer creates and gets approval for an OAuth app with "${app}" so their AI agent's users can connect it.
Use web search on the provider's OFFICIAL developer docs. Cover: where to register, redirect URI rules, scopes, whether review/verification exists, published review times, requirements (domain, privacy policy, video, security assessment, partner program), and limits before approval.
Also check https://docs.composio.dev/toolkits/managed-auth to see if Composio provides a managed OAuth app for it.
Rules: cite a source id for each claim; if you could not find a doc stating it, mark "unverified". Never guess review times. ${SCHEMA_HINT}`;
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({model:process.env.MODEL||'gpt-4.1',tools:[{type:'web_search'}],input:prompt})});
 if(!r.ok)return res.status(502).json({error:'LLM error '+r.status});
 const j=await r.json(); const text=j.output_text||(j.output||[]).flatMap(o=>o.content||[]).map(c=>c.text||'').join('');
 try{const g=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));g.generated=new Date().toISOString()+' (not human-reviewed)';res.status(200).json(g)}
 catch(e){res.status(502).json({error:'Agent returned unparseable output'})}
};
