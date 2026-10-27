const BACKEND=window.GENERATE_URL||window.GUIDE_API||"";const STATIC_HOST=/github\.io$/.test(location.hostname)&&!BACKEND;
const out=document.getElementById('out');const API=BACKEND||'/api/generate';
const tag=s=>`<span class="tag ${s}">${s}</span>`;
function src(g,id){return id&&g.sources[id]?` <a href="${g.sources[id]}" target="_blank">[${id}]</a>`:''}
function render(g,slug){out.innerHTML=`<p><a href="#">← library</a> · Share: <code>${location.href.split('#')[0]}#/guide/${slug}</code></p>
<h2>${g.name}</h2><p class="diff">Difficulty: ${g.difficulty}</p>
<p><b>Setup effort:</b> ${g.setup}<br><b>Approval wait:</b> ${g.approval}</p>
<p><b>Do you even need your own app?</b> ${g.composio} <a href="${COMPOSIO_MANAGED.url}" target="_blank">[Composio]</a></p>
<h3>Steps</h3><ol>${g.steps.map(s=>`<li>${s[0]}${src(g,s[1])}${tag(s[2])}</li>`).join('')}</ol>
<h3>Requirements & blockers</h3><ul>${g.reqs.map(s=>`<li>${s[0]}${src(g,s[1])}${tag(s[2])}</li>`).join('')}</ul>
<div class="grid"><div><h3>An agent can</h3><ul>${g.agent.map(x=>`<li>${x}</li>`).join('')}</ul></div>
<div><h3>You must take over</h3><ul>${g.human.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>
<h3>Sources</h3><ul>${Object.entries(g.sources).map(([k,u])=>`<li>[${k}] <a href="${u}" target="_blank">${u}</a></li>`).join('')}</ul>
<p><i>${g.generated?'Generated live by an agent – '+g.generated:'Researched from official docs on 27 Oct 2026. Not tested against a live provider account.'}</i></p>`}
function library(){out.innerHTML='<h2>Library</h2>'+Object.entries(GUIDES).map(([k,g])=>`<div class="card" onclick="location.hash='/guide/${k}'"><b>${g.name}</b> — <span class="diff">${g.difficulty}</span><br><small>Approval: ${g.approval}</small></div>`).join('')}
async function live(q){out.innerHTML=`<p>Agent is investigating <b>${q}</b>… (reading developer docs, checking review requirements)</p>`;
 try{if(STATIC_HOST)throw new Error('this static GitHub Pages host has no backend, so live generation is not available here. Use the library guides above');const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app:q})});
  if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||r.status);const g=await r.json();
  const slug='live-'+q.toLowerCase().replace(/[^a-z0-9]+/g,'-');sessionStorage.setItem(slug,JSON.stringify(g));GUIDES[slug]=g;location.hash='/guide/'+slug;
 }catch(e){out.innerHTML=`<h2>Live generation unavailable</h2><p>The live agent backend is not reachable (${e.message}). It needs a deployed <code>/api/generate</code> function with XAI_API_KEY (or GEMINI_API_KEY fallback). Nothing was generated, so no guide is shown.</p><p><a href="#">← library</a></p>`}}
function route(){const m=location.hash.match(/#\/guide\/(.+)/);if(m){const s=m[1];const g=GUIDES[s]||JSON.parse(sessionStorage.getItem(s)||'null');if(g)return render(g,s)}library()}
document.getElementById('f').onsubmit=e=>{e.preventDefault();const q=document.getElementById('q').value.trim();if(!q)return;
 const k=Object.keys(GUIDES).find(k=>GUIDES[k].name.toLowerCase().startsWith(q.toLowerCase())||k===q.toLowerCase());k?location.hash='/guide/'+k:live(q)};
window.onhashchange=route;route();
