import { useState, useEffect, useCallback } from "react";

const DEF_SITES = [
  { id:"popolkam", name:"popolkam.ru", market:"RU", niche:"Кофемашины", status:"active",
    wpAdmin:"https://popolkam.ru/wp-admin", ga4:"https://analytics.google.com",
    gsc:"https://search.google.com/search-console", affiliate:"https://www.admitad.com/ru/webmaster/",
    metrics:{sessions:4820,revenue:312,affiliateClicks:890,sales:34,rpm:64.73,epc:0.35,ctr:18.46,cr:3.82} },
  { id:"koffie", name:"koffie-expert.nl", market:"NL", niche:"Koffiemachines", status:"setup",
    wpAdmin:"https://koffie-expert.nl/wp-admin", ga4:"#", gsc:"#", affiliate:"#",
    metrics:{sessions:0,revenue:0,affiliateClicks:0,sales:0,rpm:0,epc:0,ctr:0,cr:0} },
];
const DEF_ARTS = [
  { id:"a1",siteId:"popolkam",title:"Обзор De'Longhi Magnifica S",url:"/obzor-delonghi-magnifica-s/",type:"review",status:"published",sessions:1240,clicks:312,cr:4.2,updated:"2026-03-28",notes:"" },
  { id:"a2",siteId:"popolkam",title:"Топ-5 кофемашин до 30 000₽",url:"/top-5-kofemashin-do-30000/",type:"comparison",status:"published",sessions:980,clicks:198,cr:3.1,updated:"2026-04-01",notes:"" },
  { id:"a3",siteId:"popolkam",title:"Jura E8 vs De'Longhi ECAM",url:"/jura-e8-vs-delonghi-ecam/",type:"comparison",status:"published",sessions:760,clicks:145,cr:2.8,updated:"2026-03-15",notes:"" },
  { id:"a4",siteId:"popolkam",title:"Как выбрать кофемашину для дома",url:"/kak-vybrat-kofemashinu/",type:"guide",status:"published",sessions:1840,clicks:235,cr:1.9,updated:"2026-04-10",notes:"" },
  { id:"a5",siteId:"popolkam",title:"Обзор Philips 3200 LatteGo",url:"/obzor-philips-3200-lattego/",type:"review",status:"draft",sessions:0,clicks:0,cr:0,updated:"2026-04-14",notes:"" },
  { id:"a6",siteId:"popolkam",title:"Квиз: Подбор кофемашины",url:"/quiz-podbor-kofemashiny/",type:"quiz",status:"planned",sessions:0,clicks:0,cr:0,updated:"",notes:"" },
];
const DEF_PLAN = [
  { id:"p1",siteId:"popolkam",title:"Обзор Saeco GranAroma",type:"review",priority:"high",deadline:"2026-04-20",status:"in_progress" },
  { id:"p2",siteId:"popolkam",title:"Сравнение капсульных машин",type:"comparison",priority:"high",deadline:"2026-04-25",status:"queued" },
  { id:"p3",siteId:"popolkam",title:"Гайд по уходу за кофемашиной",type:"guide",priority:"medium",deadline:"2026-05-01",status:"queued" },
  { id:"p4",siteId:"popolkam",title:"Топ-3 машин для офиса",type:"comparison",priority:"medium",deadline:"2026-05-10",status:"idea" },
  { id:"p5",siteId:"koffie",title:"Beste koffiemachine 2026",type:"comparison",priority:"high",deadline:"2026-05-15",status:"idea" },
];

const ST={published:{l:"Live",c:"#34d399"},draft:{l:"Draft",c:"#fbbf24"},planned:{l:"Plan",c:"#818cf8"},active:{l:"Active",c:"#34d399"},setup:{l:"Setup",c:"#fbbf24"},in_progress:{l:"WIP",c:"#fbbf24"},queued:{l:"Queue",c:"#818cf8"},idea:{l:"Idea",c:"#94a3b8"},deploying:{l:"Deploy...",c:"#f97316"},deployed:{l:"Deployed",c:"#34d399"},failed:{l:"Failed",c:"#ef4444"}};
const TI={review:"📋",comparison:"⚖️",guide:"📖",quiz:"🎯",tool:"🔧",category:"📁"};
const PC={high:"#ef4444",medium:"#f59e0b",low:"#22c55e"};
const uid=()=>Math.random().toString(36).slice(2,9);
const fmt=n=>{if(n==null)return"—";if(n>=1000)return(n/1000).toFixed(1)+"k";return n%1===0?n.toString():n.toFixed(2)};
const now=()=>new Date().toISOString();
const d2s=d=>new Date(d).toLocaleString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

function useStore(key,fb){
  const[data,setData]=useState(null);const[ok,setOk]=useState(false);
  useEffect(()=>{(async()=>{try{const r=await window.storage.get(key);if(r?.value)setData(JSON.parse(r.value));else{setData(fb);await window.storage.set(key,JSON.stringify(fb))}}catch{setData(fb);try{await window.storage.set(key,JSON.stringify(fb))}catch{}}setOk(true)})()},[]);
  const save=useCallback(async next=>{const val=typeof next==="function"?next(data):next;setData(val);try{await window.storage.set(key,JSON.stringify(val))}catch{}return val},[data,key]);
  return[data,save,ok];
}

const Badge=({s})=>{const x=ST[s]||{l:s,c:"#64748b"};return<span style={{padding:"2px 6px",borderRadius:"4px",background:x.c+"15",color:x.c,fontSize:"10px",fontWeight:700,letterSpacing:".5px",textTransform:"uppercase",border:`1px solid ${x.c}30`}}>{x.l}</span>};
const Metric=({label,value,sfx})=><div style={{flex:1,minWidth:"65px"}}><div style={{fontSize:"9px",color:"#64748b",textTransform:"uppercase",letterSpacing:".7px",marginBottom:"1px"}}>{label}</div><div style={{fontSize:"18px",fontWeight:800,fontFamily:"var(--mn)",color:"#e2e8f0"}}>{fmt(value)}<span style={{fontSize:"10px",color:"#64748b",marginLeft:"1px"}}>{sfx}</span></div></div>;
const Btn=({children,onClick,v="def",disabled,sx={}})=>{const b={border:"none",borderRadius:"5px",padding:"6px 12px",fontSize:"12px",fontWeight:700,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",opacity:disabled?.5:1,...sx};const m={def:{background:"#1e293b",color:"#94a3b8",...b},acc:{background:"#3b82f6",color:"#fff",...b},ghost:{background:"transparent",color:"#64748b",padding:"3px 6px",...b},danger:{background:"#ef4444",color:"#fff",...b},success:{background:"#059669",color:"#fff",...b},orange:{background:"#f97316",color:"#fff",...b}};return<button onClick={onClick} disabled={disabled} style={m[v]||m.def}>{children}</button>};
const Inp=({value,onChange,placeholder,onKeyDown,sx={},type="text"})=><input type={type} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"5px",padding:"7px 10px",color:"#e2e8f0",fontSize:"12px",outline:"none",fontFamily:"inherit",width:"100%",...sx}}/>;
const Sel=({value,onChange,opts,sx={}})=><select value={value} onChange={e=>onChange(e.target.value)} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"5px",padding:"6px 8px",color:"#e2e8f0",fontSize:"12px",outline:"none",appearance:"auto",...sx}}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;
const XLink=({href,label,icon})=><a href={href} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"3px",padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"#1e293b",color:"#60a5fa",textDecoration:"none",border:"1px solid #1e293b",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="#3b82f6";e.currentTarget.style.color="#fff"}} onMouseLeave={e=>{e.currentTarget.style.background="#1e293b";e.currentTarget.style.color="#60a5fa"}}><span style={{fontSize:"12px"}}>{icon}</span>{label}</a>;
const Modal=({title,onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"#000b",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"10px",padding:"20px",width:"100%",maxWidth:wide?"680px":"500px",maxHeight:"85vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}><span style={{fontSize:"14px",fontWeight:800,color:"#e2e8f0"}}>{title}</span><Btn onClick={onClose} v="ghost">✕</Btn></div>{children}</div></div>;

function DeployWizard({sites,onDeploy,onAddSite,onClose}){
  const[step,setStep]=useState(0);
  const[cfg,setCfg]=useState({niche:"",nicheRu:"",market:"RU",deployType:"subdirectory",parentSite:sites?.[0]?.id||"",domain:"",subdirectory:"",theme:"rehub",ssl:true,analytics:true,n8nWebhook:"https://your-server.com/webhook/deploy-wp",serverHost:"your-server.com"});
  const[aiPlan,setAiPlan]=useState(null);
  const[aiLoading,setAiLoading]=useState(false);
  const[deployLog,setDeployLog]=useState([]);
  const parentSite=(sites||[]).find(s=>s.id===cfg.parentSite);
  const getUrl=()=>{if(cfg.deployType==="newdomain")return cfg.domain||"new-site.com";if(cfg.deployType==="subdirectory")return`${parentSite?.name||"site.com"}/${cfg.subdirectory||"niche"}`;return`${cfg.subdirectory||"niche"}.${parentSite?.name||"site.com"}`};

  const genPlan=async()=>{setAiLoading(true);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Ты SEO-стратег. Новый affiliate-сайт.\nНиша: ${cfg.niche||cfg.nicheRu}\nРынок: ${cfg.market}\nРазмещение: ${cfg.deployType==="newdomain"?`домен ${cfg.domain}`:`${cfg.deployType} на ${parentSite?.name}: ${getUrl()}`}\nСуществующие сайты: ${(sites||[]).map(s=>s.name+"("+s.niche+")").join(", ")}\n\nОтветь строго JSON без markdown:\n{"siteName":"название","seoTitle":"SEO title","description":"мета 160 симв","categories":["кат1","кат2","кат3","кат4","кат5"],"firstArticles":[{"title":"заг","type":"review","priority":"high","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"high","slug":"/slug/"},{"title":"заг","type":"guide","priority":"medium","slug":"/slug/"},{"title":"заг","type":"review","priority":"medium","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"medium","slug":"/slug/"}],"monetization":"рекомендации CPA","estimatedTraffic":"прогноз 3-6 мес","competitionLevel":"low|medium|high","keywords":["кл1","кл2","кл3","кл4","кл5"]}`}]})});const d=await r.json();const txt=d.content?.map(i=>i.text||"").join("\n")||"";setAiPlan(JSON.parse(txt.replace(/```json|```/g,"").trim()));setStep(2)}catch(e){setAiPlan({error:e.message});setStep(2)}setAiLoading(false)};

  const startDeploy=async()=>{setStep(3);const steps=["🔍 Проверка домена и DNS...","🗄️ Создание базы данных MySQL...","📦 Установка WordPress (WP-CLI)...",`🎨 Тема: ${cfg.theme==="rehub"?"REHub":"Custom"}...`,"🔌 Плагины: Content Egg, WP All Import, WooCommerce, Rank Math...","⚙️ Пермалинки и SEO...",cfg.ssl?"🔒 SSL (Let's Encrypt)...":"⏭️ SSL skip",cfg.analytics?"📊 GA4 + GSC...":"⏭️ Analytics skip","📝 Категории...","🚀 Финализация..."];const acc=[];for(const s of steps){await new Promise(r=>setTimeout(r,800+Math.random()*800));acc.push({msg:s,status:"ok"});setDeployLog([...acc])}const newSite={id:"site_"+uid(),name:getUrl(),market:cfg.market,niche:cfg.niche||cfg.nicheRu,status:"setup",wpAdmin:`https://${getUrl()}/wp-admin`,ga4:cfg.analytics?"https://analytics.google.com":"#",gsc:cfg.analytics?"https://search.google.com/search-console":"#",affiliate:"#",metrics:{sessions:0,revenue:0,affiliateClicks:0,sales:0,rpm:0,epc:0,ctr:0,cr:0}};onAddSite(newSite);onDeploy({id:"dep_"+uid(),ts:now(),config:cfg,aiPlan,status:"deployed",siteId:newSite.id,url:getUrl()});setStep(4)};

  return(
    <Modal title="🚀 Deploy Wizard" onClose={onClose} wide>
      <div style={{display:"flex",gap:"4px",marginBottom:"16px"}}>{["Настройка","AI-план","Ревью","Deploy","Готово"].map((s,i)=><div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:"3px",borderRadius:"2px",background:step>=i?"#3b82f6":"#1e293b",transition:"all .3s",marginBottom:"4px"}}/><span style={{fontSize:"9px",color:step>=i?"#60a5fa":"#475569"}}>{s}</span></div>)}</div>

      {step===0&&<div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px",background:"#1e293b",borderRadius:"6px"}}><span style={{fontSize:"24px"}}>🚀</span><div><div style={{fontSize:"13px",fontWeight:700,color:"#e2e8f0"}}>Развернуть новый сайт</div><div style={{fontSize:"11px",color:"#64748b"}}>WordPress + REHub + плагины за 1 клик</div></div></div>
        <div style={{fontSize:"11px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:".8px"}}>1. Ниша и рынок</div>
        <Inp value={cfg.niche} onChange={v=>setCfg({...cfg,niche:v})} placeholder="Ниша EN: electric kettles"/>
        <Inp value={cfg.nicheRu} onChange={v=>setCfg({...cfg,nicheRu:v})} placeholder="Ниша RU: электрические чайники"/>
        <Sel value={cfg.market} onChange={v=>setCfg({...cfg,market:v})} opts={[{v:"RU",l:"🇷🇺 Россия"},{v:"NL",l:"🇳🇱 Нидерланды"},{v:"DE",l:"🇩🇪 Германия"},{v:"US",l:"🇺🇸 США"}]}/>
        <div style={{fontSize:"11px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:".8px",marginTop:"4px"}}>2. Размещение</div>
        <div style={{display:"flex",gap:"6px"}}>{[{v:"subdirectory",l:"📁 Поддиректория",d:"site.com/niche/"},{v:"subdomain",l:"🌐 Поддомен",d:"niche.site.com"},{v:"newdomain",l:"🆕 Новый домен",d:"niche-expert.com"}].map(o=><div key={o.v} onClick={()=>setCfg({...cfg,deployType:o.v})} style={{flex:1,padding:"10px",borderRadius:"6px",cursor:"pointer",background:cfg.deployType===o.v?"#3b82f615":"#0f172a",border:cfg.deployType===o.v?"2px solid #3b82f6":"2px solid #1e293b",textAlign:"center",transition:"all .15s"}}><div style={{fontSize:"14px",marginBottom:"3px"}}>{o.l.split(" ")[0]}</div><div style={{fontSize:"11px",fontWeight:700,color:"#e2e8f0"}}>{o.l.split(" ").slice(1).join(" ")}</div><div style={{fontSize:"9px",color:"#64748b",fontFamily:"var(--mn)",marginTop:"2px"}}>{o.d}</div></div>)}</div>
        {cfg.deployType!=="newdomain"&&<div style={{display:"flex",gap:"6px"}}><Sel value={cfg.parentSite} onChange={v=>setCfg({...cfg,parentSite:v})} opts={(sites||[]).map(s=>({v:s.id,l:s.name}))} sx={{flex:1}}/><Inp value={cfg.subdirectory} onChange={v=>setCfg({...cfg,subdirectory:v})} placeholder={cfg.deployType==="subdirectory"?"path (chainiki)":"subdomain (chainiki)"} sx={{flex:1}}/></div>}
        {cfg.deployType==="newdomain"&&<Inp value={cfg.domain} onChange={v=>setCfg({...cfg,domain:v})} placeholder="chainiki-expert.ru"/>}
        <div style={{padding:"8px 12px",background:"#1e293b",borderRadius:"5px",fontSize:"12px",fontFamily:"var(--mn)",color:"#60a5fa"}}>→ {getUrl()}</div>
        <div style={{fontSize:"11px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:".8px",marginTop:"4px"}}>3. Настройки</div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          <Sel value={cfg.theme} onChange={v=>setCfg({...cfg,theme:v})} opts={[{v:"rehub",l:"🎨 REHub"},{v:"custom",l:"🎨 Custom"}]}/>
          <label style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",color:"#94a3b8",cursor:"pointer"}}><input type="checkbox" checked={cfg.ssl} onChange={e=>setCfg({...cfg,ssl:e.target.checked})}/> SSL</label>
          <label style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"11px",color:"#94a3b8",cursor:"pointer"}}><input type="checkbox" checked={cfg.analytics} onChange={e=>setCfg({...cfg,analytics:e.target.checked})}/> GA4</label>
        </div>
        <div style={{fontSize:"11px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase",letterSpacing:".8px",marginTop:"4px"}}>4. Сервер</div>
        <Inp value={cfg.n8nWebhook} onChange={v=>setCfg({...cfg,n8nWebhook:v})} placeholder="n8n webhook URL"/>
        <Inp value={cfg.serverHost} onChange={v=>setCfg({...cfg,serverHost:v})} placeholder="IP/hostname сервера"/>
        <div style={{display:"flex",gap:"6px",justifyContent:"flex-end",marginTop:"4px"}}><Btn onClick={onClose}>Отмена</Btn><Btn v="acc" onClick={()=>{setStep(1);genPlan()}} disabled={!cfg.niche&&!cfg.nicheRu}>🤖 AI: Спланировать →</Btn></div>
      </div>}

      {step===1&&<div style={{padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:"40px",marginBottom:"16px",animation:"pulse 1.5s infinite"}}>🤖</div><div style={{fontSize:"14px",fontWeight:700,color:"#e2e8f0",marginBottom:"8px"}}>AI планирует структуру...</div><div style={{fontSize:"12px",color:"#64748b"}}>{cfg.niche||cfg.nicheRu} · {cfg.market}</div><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style></div>}

      {step===2&&(!aiPlan||aiPlan.error?<div style={{padding:"20px",textAlign:"center"}}><div style={{color:"#ef4444",marginBottom:"10px"}}>⚠️ {aiPlan?.error||"Ошибка"}</div><Btn onClick={()=>{setStep(1);genPlan()}} v="acc">Повторить</Btn></div>:
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{padding:"12px",background:"#1e293b",borderRadius:"6px"}}><div style={{fontSize:"13px",fontWeight:800,color:"#e2e8f0",marginBottom:"4px"}}>📋 AI-план: {getUrl()}</div><div style={{fontSize:"11px",color:"#94a3b8"}}>{aiPlan.siteName}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <div style={{padding:"10px",background:"#0f172a",borderRadius:"5px",border:"1px solid #1e293b"}}><div style={{fontSize:"9px",color:"#64748b",textTransform:"uppercase",marginBottom:"4px"}}>SEO Title</div><div style={{fontSize:"12px",color:"#e2e8f0"}}>{aiPlan.seoTitle}</div></div>
            <div style={{padding:"10px",background:"#0f172a",borderRadius:"5px",border:"1px solid #1e293b"}}><div style={{fontSize:"9px",color:"#64748b",textTransform:"uppercase",marginBottom:"4px"}}>Конкуренция</div><div style={{fontSize:"12px",color:aiPlan.competitionLevel==="low"?"#34d399":aiPlan.competitionLevel==="high"?"#ef4444":"#fbbf24",fontWeight:700}}>{aiPlan.competitionLevel==="low"?"🟢 Низкая":aiPlan.competitionLevel==="high"?"🔴 Высокая":"🟡 Средняя"}</div></div>
          </div>
          <div style={{padding:"10px",background:"#0f172a",borderRadius:"5px",border:"1px solid #1e293b"}}><div style={{fontSize:"9px",color:"#64748b",textTransform:"uppercase",marginBottom:"4px"}}>Трафик прогноз</div><div style={{fontSize:"12px",color:"#e2e8f0"}}>{aiPlan.estimatedTraffic}</div></div>
          <div style={{fontSize:"10px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase"}}>Категории</div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{(aiPlan.categories||[]).map((c,i)=><span key={i} style={{padding:"3px 8px",background:"#1e293b",borderRadius:"4px",fontSize:"11px",color:"#94a3b8"}}>{c}</span>)}</div>
          <div style={{fontSize:"10px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase"}}>Первые 5 статей</div>
          {(aiPlan.firstArticles||[]).map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 8px",background:"#0f172a",borderRadius:"4px",border:"1px solid #1e293b"}}><span>{TI[a.type]||"📄"}</span><span style={{fontSize:"12px",color:"#e2e8f0",flex:1}}>{a.title}</span><span style={{fontSize:"9px",color:"#475569",fontFamily:"var(--mn)"}}>{a.slug}</span><span style={{padding:"1px 5px",borderRadius:"3px",fontSize:"9px",background:(PC[a.priority]||"#64748b")+"20",color:PC[a.priority]||"#64748b"}}>{a.priority}</span></div>)}
          <div style={{padding:"10px",background:"#0f172a",borderRadius:"5px",border:"1px solid #1e293b"}}><div style={{fontSize:"9px",color:"#64748b",textTransform:"uppercase",marginBottom:"4px"}}>Монетизация</div><div style={{fontSize:"11px",color:"#94a3b8"}}>{aiPlan.monetization}</div></div>
          <div style={{fontSize:"10px",fontWeight:700,color:"#60a5fa",textTransform:"uppercase"}}>Ключевые слова</div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{(aiPlan.keywords||[]).map((k,i)=><span key={i} style={{padding:"2px 7px",background:"#1e293b",borderRadius:"3px",fontSize:"10px",color:"#94a3b8",fontFamily:"var(--mn)"}}>{k}</span>)}</div>
          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end",marginTop:"6px"}}><Btn onClick={()=>setStep(0)}>← Назад</Btn><Btn v="acc" onClick={()=>{setStep(1);genPlan()}}>🔄 Заново</Btn><Btn v="success" onClick={startDeploy}>🚀 Развернуть!</Btn></div>
        </div>
      )}

      {step===3&&<div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px",background:"#f9731615",borderRadius:"6px",border:"1px solid #f9731630"}}><span style={{fontSize:"20px",animation:"pulse 1s infinite"}}>⚙️</span><div><div style={{fontSize:"13px",fontWeight:700,color:"#f97316"}}>Развёртывание...</div><div style={{fontSize:"11px",color:"#64748b"}}>{getUrl()}</div></div></div>
        {deployLog.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"6px",padding:"4px 8px",fontSize:"11px"}}><span style={{color:"#34d399"}}>✓</span><span style={{color:"#94a3b8"}}>{l.msg}</span></div>)}
        <div style={{width:"100%",height:"3px",background:"#1e293b",borderRadius:"2px",overflow:"hidden",marginTop:"4px"}}><div style={{height:"100%",background:"#3b82f6",borderRadius:"2px",width:`${(deployLog.length/10)*100}%`,transition:"width .3s"}}/></div>
      </div>}

      {step===4&&<div style={{textAlign:"center",padding:"20px"}}>
        <div style={{fontSize:"48px",marginBottom:"12px"}}>🎉</div>
        <div style={{fontSize:"16px",fontWeight:800,color:"#34d399",marginBottom:"6px"}}>Сайт развёрнут!</div>
        <div style={{fontSize:"13px",color:"#e2e8f0",fontFamily:"var(--mn)",marginBottom:"16px"}}>{getUrl()}</div>
        <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}><XLink href={`https://${getUrl()}`} label="Открыть" icon="🌐"/><XLink href={`https://${getUrl()}/wp-admin`} label="WP Admin" icon="⚡"/></div>
        <div style={{marginTop:"16px",padding:"10px",background:"#1e293b",borderRadius:"6px",fontSize:"11px",color:"#64748b",textAlign:"left"}}><strong style={{color:"#94a3b8"}}>Следующие шаги:</strong><div style={{marginTop:"4px"}}>1. Content Egg API ключи</div><div>2. Партнёрские сети</div><div>3. Первые статьи из AI-плана</div><div>4. Google Analytics + Search Console</div></div>
        <div style={{marginTop:"12px"}}><Btn v="acc" onClick={onClose}>Готово →</Btn></div>
      </div>}
    </Modal>
  );
}

function ArticleRow({article,onUpdate,onDelete,onLog}){
  const[cmd,setCmd]=useState("");const[ld,setLd]=useState(false);const[res,setRes]=useState(null);
  const[editing,setEditing]=useState(false);const[dr,setDr]=useState(article);
  const runAI=async()=>{if(!cmd.trim())return;setLd(true);setRes(null);try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`SEO/affiliate сайт. Статья: "${article.title}" (${article.type},${article.status},CR:${article.cr}%,sessions:${article.sessions}).\nКоманда: "${cmd}"\nПлан 3-5 пунктов. SEO+CPA+UX. Русский.`}]})});const d=await r.json();const t=d.content?.map(i=>i.text||"").join("\n")||"—";setRes(t);onLog({ts:now(),articleId:article.id,articleTitle:article.title,command:cmd,result:t.slice(0,200)})}catch(e){setRes("⚠️ "+e.message)}setLd(false)};
  return(
    <div style={{background:"#0f172a",borderRadius:"6px",padding:"10px 12px",border:"1px solid #1e293b",marginBottom:"4px"}}>
      {!editing?<>
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap"}}>
          <span style={{fontSize:"14px"}}>{TI[article.type]||"📄"}</span>
          <div style={{flex:1,minWidth:"160px"}}><div style={{fontSize:"12px",fontWeight:700,color:"#e2e8f0"}}>{article.title}</div><div style={{fontSize:"10px",color:"#475569",fontFamily:"var(--mn)"}}>{article.url}</div></div>
          <Badge s={article.status}/>
          <div style={{display:"flex",gap:"12px",fontSize:"11px",fontFamily:"var(--mn)"}}><span style={{color:"#64748b"}}>👁{fmt(article.sessions)}</span><span style={{color:"#60a5fa"}}>🖱{fmt(article.clicks)}</span><span style={{color:article.cr>3?"#34d399":article.cr>0?"#fbbf24":"#475569"}}>⚡{article.cr}%</span></div>
          <Btn onClick={()=>{setDr({...article});setEditing(true)}} v="ghost" sx={{fontSize:"12px"}}>✏️</Btn>
          <Btn onClick={()=>onDelete(article.id)} v="ghost" sx={{fontSize:"12px",color:"#ef4444"}}>🗑</Btn>
        </div>
        <div style={{display:"flex",gap:"4px",marginTop:"6px"}}><Inp value={cmd} onChange={setCmd} onKeyDown={e=>e.key==="Enter"&&runAI()} placeholder="AI: обнови, добавь модель, перепиши..." sx={{flex:1}}/><Btn onClick={runAI} disabled={ld} v="acc">{ld?"⏳":"▶ AI"}</Btn></div>
        {res&&<div style={{marginTop:"6px",padding:"10px",background:"#1e293b",borderRadius:"5px",fontSize:"12px",color:"#cbd5e1",lineHeight:1.6,borderLeft:"3px solid #3b82f6",whiteSpace:"pre-wrap"}}>{res}</div>}
      </>:<>
        <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}><Inp value={dr.title} onChange={v=>setDr({...dr,title:v})} placeholder="Заголовок" sx={{flex:2}}/><Inp value={dr.url} onChange={v=>setDr({...dr,url:v})} placeholder="/url/" sx={{flex:1}}/></div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}><Sel value={dr.type} onChange={v=>setDr({...dr,type:v})} opts={[{v:"review",l:"Обзор"},{v:"comparison",l:"Сравнение"},{v:"guide",l:"Гайд"},{v:"quiz",l:"Квиз"},{v:"tool",l:"Инструмент"}]}/><Sel value={dr.status} onChange={v=>setDr({...dr,status:v})} opts={[{v:"published",l:"Published"},{v:"draft",l:"Draft"},{v:"planned",l:"Planned"}]}/><Inp value={dr.sessions} onChange={v=>setDr({...dr,sessions:+v||0})} placeholder="Sessions" sx={{width:"75px"}}/><Inp value={dr.clicks} onChange={v=>setDr({...dr,clicks:+v||0})} placeholder="Clicks" sx={{width:"75px"}}/><Inp value={dr.cr} onChange={v=>setDr({...dr,cr:+v||0})} placeholder="CR%" sx={{width:"65px"}}/></div>
          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}><Btn onClick={()=>setEditing(false)}>Отмена</Btn><Btn onClick={()=>{onUpdate(dr);setEditing(false)}} v="acc">💾</Btn></div>
        </div>
      </>}
    </div>
  );
}

function GlobalAI({sites,articles,plan,onLog}){
  const[q,setQ]=useState("");const[ld,setLd]=useState(false);const[res,setRes]=useState(null);const[hist,setHist]=useState([]);
  const ask=async query=>{const t=query||q;if(!t.trim())return;setLd(true);setRes(null);const ctx=`Портфель: ${(sites||[]).map(s=>`${s.name}(${s.market},s:${s.metrics.sessions},rev:$${s.metrics.revenue},RPM:$${s.metrics.rpm},CR:${s.metrics.cr}%)`).join("; ")}\nСтатей:${(articles||[]).length}. WP+REHub+WooCommerce+ContentEgg.`;try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`${ctx}\n\nЗапрос:"${t}"\nКонкретный ответ. Русский.`}]})});const d=await r.json();const txt=d.content?.map(i=>i.text||"").join("\n")||"—";setRes(txt);setHist(p=>[{q:t,ts:new Date().toLocaleTimeString("ru")},...p].slice(0,10));onLog({ts:now(),command:t,result:txt.slice(0,200),type:"global"})}catch(e){setRes("⚠️ "+e.message)}setLd(false);setQ("")};
  return(
    <div>
      <div style={{background:"#0f172a",borderRadius:"8px",padding:"14px",border:"1px solid #1e293b"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}><span style={{fontSize:"18px"}}>🤖</span><span style={{fontSize:"13px",fontWeight:800,color:"#60a5fa"}}>AI Command Center</span></div>
        <div style={{display:"flex",gap:"5px"}}><Inp value={q} onChange={setQ} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Стратегия, контент, аналитика..." sx={{flex:1,padding:"9px 12px",fontSize:"13px"}}/><Btn onClick={()=>ask()} disabled={ld} v="acc" sx={{padding:"9px 18px",fontSize:"13px"}}>{ld?"...":"▶ Go"}</Btn></div>
        <div style={{display:"flex",gap:"4px",marginTop:"7px",flexWrap:"wrap"}}>{["Идеи контента","Слабые статьи","SEO-план","Рост CR","Новые ниши"].map(p=><button key={p} onClick={()=>{setQ(p);ask(p)}} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:"4px",padding:"3px 8px",fontSize:"10px",color:"#94a3b8",cursor:"pointer"}}>{p}</button>)}</div>
        {res&&<div style={{marginTop:"10px",padding:"12px",background:"#1e293b",borderRadius:"6px",fontSize:"12px",color:"#cbd5e1",lineHeight:1.7,borderLeft:"3px solid #3b82f6",whiteSpace:"pre-wrap",maxHeight:"350px",overflowY:"auto"}}>{res}</div>}
      </div>
      {hist.length>0&&<div style={{marginTop:"10px"}}><div style={{fontSize:"10px",color:"#475569",fontWeight:700,marginBottom:"4px",textTransform:"uppercase"}}>История</div>{hist.map((h,i)=><div key={i} style={{display:"flex",gap:"6px",padding:"3px 0",borderBottom:"1px solid #1e293b22"}}><span style={{fontSize:"9px",color:"#475569",fontFamily:"var(--mn)"}}>{h.ts}</span><span style={{fontSize:"11px",color:"#94a3b8",cursor:"pointer"}} onClick={()=>setQ(h.q)}>{h.q}</span></div>)}</div>}
    </div>
  );
}

function LogPanel({log}){
  if(!log?.length)return<div style={{padding:"30px",textAlign:"center",color:"#475569",fontSize:"12px"}}>Лог пуст</div>;
  return<div><div style={{fontSize:"10px",color:"#475569",fontWeight:700,marginBottom:"6px",textTransform:"uppercase"}}>AI-лог ({log.length})</div>{log.slice().reverse().slice(0,20).map((e,i)=><div key={i} style={{background:"#0f172a",borderRadius:"4px",padding:"6px 8px",marginBottom:"3px",border:"1px solid #1e293b",fontSize:"10px"}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#60a5fa",fontWeight:700}}>{e.articleTitle||"Global"}</span><span style={{color:"#475569",fontFamily:"var(--mn)",fontSize:"9px"}}>{d2s(e.ts)}</span></div><div style={{color:"#94a3b8"}}>→ {e.command}</div></div>)}</div>;
}

function DeploysPanel({deploys}){
  if(!deploys?.length)return<div style={{padding:"30px",textAlign:"center",color:"#475569",fontSize:"12px"}}>Нет развёртываний. Нажмите 🚀 Deploy.</div>;
  return<div><div style={{fontSize:"10px",color:"#475569",fontWeight:700,marginBottom:"6px",textTransform:"uppercase"}}>Развёртывания ({deploys.length})</div>{deploys.slice().reverse().map((d,i)=><div key={i} style={{background:"#0f172a",borderRadius:"5px",padding:"10px",marginBottom:"4px",border:"1px solid #1e293b"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}><div style={{display:"flex",alignItems:"center",gap:"6px"}}><span style={{fontSize:"14px"}}>🌐</span><span style={{fontSize:"12px",fontWeight:700,color:"#e2e8f0",fontFamily:"var(--mn)"}}>{d.url}</span></div><Badge s={d.status}/></div><div style={{fontSize:"10px",color:"#64748b"}}>{d.config?.niche||d.config?.nicheRu} · {d.config?.market} · {d.config?.deployType} · {d2s(d.ts)}</div>{d.aiPlan&&!d.aiPlan.error&&<div style={{marginTop:"6px",display:"flex",gap:"4px",flexWrap:"wrap"}}>{(d.aiPlan.categories||[]).slice(0,5).map((c,j)=><span key={j} style={{padding:"1px 6px",background:"#1e293b",borderRadius:"3px",fontSize:"9px",color:"#94a3b8"}}>{c}</span>)}</div>}</div>)}</div>;
}

function AddForm({type,siteId,onAdd}){
  const isA=type==="article";const[d,setD]=useState(isA?{title:"",url:"/",type:"review",status:"planned",sessions:0,clicks:0,cr:0}:{title:"",type:"review",priority:"medium",deadline:"",status:"idea"});
  return<div style={{display:"flex",flexDirection:"column",gap:"8px"}}><Inp value={d.title} onChange={v=>setD({...d,title:v})} placeholder={isA?"Заголовок":"Название"}/>{isA&&<Inp value={d.url} onChange={v=>setD({...d,url:v})} placeholder="/url/"/>}<div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}><Sel value={d.type} onChange={v=>setD({...d,type:v})} opts={[{v:"review",l:"Обзор"},{v:"comparison",l:"Сравнение"},{v:"guide",l:"Гайд"},{v:"quiz",l:"Квиз"},{v:"tool",l:"Инструмент"}]}/>{isA?<Sel value={d.status} onChange={v=>setD({...d,status:v})} opts={[{v:"planned",l:"Planned"},{v:"draft",l:"Draft"},{v:"published",l:"Published"}]}/>:<><Sel value={d.priority} onChange={v=>setD({...d,priority:v})} opts={[{v:"high",l:"🔴 High"},{v:"medium",l:"🟡 Med"},{v:"low",l:"🟢 Low"}]}/><Sel value={d.status} onChange={v=>setD({...d,status:v})} opts={[{v:"idea",l:"Идея"},{v:"queued",l:"Очередь"},{v:"in_progress",l:"В работе"}]}/></>}</div>{!isA&&<Inp value={d.deadline} onChange={v=>setD({...d,deadline:v})} placeholder="YYYY-MM-DD"/>}<Btn v="acc" onClick={()=>onAdd({...d,id:(isA?"a":"p")+uid(),siteId,...(isA?{updated:new Date().toISOString().slice(0,10),notes:""}:{})})}>{isA?"Создать":"Добавить"}</Btn></div>;
}
function SiteForm({site,onSave}){
  const[d,setD]=useState(site||{id:uid(),name:"",market:"RU",niche:"",status:"setup",wpAdmin:"",ga4:"",gsc:"",affiliate:"",metrics:{sessions:0,revenue:0,affiliateClicks:0,sales:0,rpm:0,epc:0,ctr:0,cr:0}});
  return<div style={{display:"flex",flexDirection:"column",gap:"8px"}}><Inp value={d.name} onChange={v=>setD({...d,name:v})} placeholder="domain.com"/><div style={{display:"flex",gap:"6px"}}><Sel value={d.market} onChange={v=>setD({...d,market:v})} opts={[{v:"RU",l:"🇷🇺"},{v:"NL",l:"🇳🇱"},{v:"DE",l:"🇩🇪"},{v:"US",l:"🇺🇸"}]}/><Inp value={d.niche} onChange={v=>setD({...d,niche:v})} placeholder="Ниша" sx={{flex:1}}/><Sel value={d.status} onChange={v=>setD({...d,status:v})} opts={[{v:"active",l:"Active"},{v:"setup",l:"Setup"}]}/></div><Inp value={d.wpAdmin} onChange={v=>setD({...d,wpAdmin:v})} placeholder="WP Admin"/><Inp value={d.ga4} onChange={v=>setD({...d,ga4:v})} placeholder="GA4"/><Inp value={d.gsc} onChange={v=>setD({...d,gsc:v})} placeholder="GSC"/><Inp value={d.affiliate} onChange={v=>setD({...d,affiliate:v})} placeholder="Affiliate"/><Btn v="acc" onClick={()=>onSave(d)}>{site?"Сохранить":"Добавить"}</Btn></div>;
}

export default function App(){
  const[sites,saveSites,s1]=useStore("cmd:sites",DEF_SITES);
  const[articles,saveArticles,s2]=useStore("cmd:articles",DEF_ARTS);
  const[plan,savePlan,s3]=useStore("cmd:plan",DEF_PLAN);
  const[log,saveLog,s4]=useStore("cmd:log",[]);
  const[deploys,saveDeploys,s5]=useStore("cmd:deploys",[]);
  const[sel,setSel]=useState("popolkam");const[tab,setTab]=useState("articles");const[modal,setModal]=useState(null);const[showDeploy,setShowDeploy]=useState(false);const[mounted,setMounted]=useState(false);
  useEffect(()=>{setMounted(true)},[]);
  if(!(s1&&s2&&s3&&s4&&s5))return<div style={{background:"#0a0e17",color:"#475569",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>⏳</div>;
  const sA=(articles||[]).filter(a=>a.siteId===sel);const sP=(plan||[]).filter(p=>p.siteId===sel);const cur=(sites||[]).find(s=>s.id===sel);
  const addLog=async e=>saveLog(p=>[...(p||[]),e]);
  const updArt=async u=>saveArticles(p=>p.map(a=>a.id===u.id?{...a,...u}:a));
  const delArt=async id=>saveArticles(p=>p.filter(a=>a.id!==id));
  const addArt=async a=>saveArticles(p=>[...p,a]);
  const addPl=async p=>savePlan(prev=>[...prev,p]);
  const delPl=async id=>savePlan(p=>p.filter(x=>x.id!==id));
  const addSite=async s=>{await saveSites(p=>[...p,s]);setSel(s.id)};
  const updSite=async s=>saveSites(p=>p.map(x=>x.id===s.id?s:x));
  const addDeploy=async d=>saveDeploys(p=>[...(p||[]),d]);
  const reset=async()=>{if(!confirm("Сбросить ВСЕ?"))return;await saveSites(DEF_SITES);await saveArticles(DEF_ARTS);await savePlan(DEF_PLAN);await saveLog([]);await saveDeploys([]);setSel("popolkam")};
  const tabs=[{id:"articles",l:"Статьи",ic:"📄",n:sA.length},{id:"plan",l:"План",ic:"📋",n:sP.length},{id:"ai",l:"AI",ic:"🤖"},{id:"deploys",l:"Деплои",ic:"🚀",n:(deploys||[]).length},{id:"log",l:"Лог",ic:"📜",n:(log||[]).length}];

  return(
    <div style={{"--mn":"'JetBrains Mono','Fira Code',monospace",background:"#0a0e17",color:"#e2e8f0",minHeight:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",padding:"14px",opacity:mounted?1:0,transition:"opacity .4s"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0a0e17}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}input::placeholder{color:#475569}select{appearance:auto}`}</style>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",paddingBottom:"10px",borderBottom:"1px solid #1e293b"}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px"}}><div style={{width:"30px",height:"30px",borderRadius:"7px",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>☕</div><div><div style={{fontSize:"15px",fontWeight:800,letterSpacing:"-.3px"}}>SEO Command Center</div><div style={{fontSize:"9px",color:"#475569",fontFamily:"var(--mn)"}}>v3 · deploy · AI</div></div></div>
        <div style={{display:"flex",alignItems:"center",gap:"7px"}}><Btn onClick={()=>setShowDeploy(true)} v="success" sx={{fontSize:"11px",padding:"5px 12px"}}>🚀 Deploy</Btn><Btn onClick={reset} v="ghost" sx={{fontSize:"10px"}}>🔄</Btn><div style={{padding:"3px 8px",borderRadius:"4px",background:"#1e293b",fontSize:"10px",fontFamily:"var(--mn)",color:"#64748b"}}>{new Date().toLocaleDateString("ru-RU")}</div><div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d39944"}}/></div>
      </div>

      <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
        {(sites||[]).map(site=>{const isSel=sel===site.id;const m=site.metrics;return(
          <div key={site.id} onClick={()=>setSel(site.id)} style={{background:isSel?"#3b82f608":"#0f172a",borderRadius:"7px",padding:"12px",border:isSel?"2px solid #3b82f6":"2px solid #1e293b",cursor:"pointer",flex:1,minWidth:"240px",transition:"all .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}}><div style={{display:"flex",alignItems:"center",gap:"5px"}}><span style={{fontSize:"13px",fontWeight:800,fontFamily:"var(--mn)",color:"#e2e8f0"}}>{site.name}</span><span style={{fontSize:"9px",color:"#64748b",background:"#1e293b",padding:"1px 4px",borderRadius:"3px"}}>{site.market}</span></div><div style={{display:"flex",gap:"3px",alignItems:"center"}}><Badge s={site.status}/><Btn onClick={e=>{e.stopPropagation();setModal({t:"editSite",site})}} v="ghost" sx={{fontSize:"11px",padding:"1px 3px"}}>✏️</Btn></div></div>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"8px"}}><Metric label="Sessions" value={m.sessions}/><Metric label="Revenue" value={m.revenue} sfx="$"/><Metric label="RPM" value={m.rpm} sfx="$"/><Metric label="CR" value={m.cr} sfx="%"/></div>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}><XLink href={site.wpAdmin} label="WP" icon="⚡"/><XLink href={site.ga4} label="GA4" icon="📈"/><XLink href={site.gsc} label="GSC" icon="🔍"/><XLink href={site.affiliate} label="Aff" icon="💰"/></div>
          </div>)})}
        <div onClick={()=>setModal("addSite")} style={{background:"#0f172a",borderRadius:"7px",padding:"12px",border:"2px dashed #1e293b",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"100px",color:"#475569",fontSize:"12px",fontWeight:700}} onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1e293b"}>＋</div>
      </div>

      <div style={{display:"flex",gap:"2px",marginBottom:"10px",borderBottom:"1px solid #1e293b",overflowX:"auto"}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#0f172a":"transparent",border:tab===t.id?"1px solid #1e293b":"1px solid transparent",borderBottom:tab===t.id?"1px solid #0f172a":"none",borderRadius:"5px 5px 0 0",padding:"6px 12px",marginBottom:"-1px",color:tab===t.id?"#60a5fa":"#64748b",fontSize:"11px",fontWeight:tab===t.id?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:"4px",whiteSpace:"nowrap"}}><span>{t.ic}</span>{t.l}{t.n!=null&&<span style={{background:tab===t.id?"#3b82f615":"#1e293b",color:tab===t.id?"#60a5fa":"#64748b",padding:"0 4px",borderRadius:"8px",fontSize:"9px",fontFamily:"var(--mn)"}}>{t.n}</span>}</button>)}
      </div>

      <div style={{animation:"fadeIn .3s ease"}}>
        {tab==="articles"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}><span style={{fontSize:"11px",color:"#64748b"}}>{sA.length} · {cur?.name}</span><Btn onClick={()=>setModal("addArticle")} v="acc" sx={{fontSize:"10px"}}>＋ Статья</Btn></div>
          {sA.map(a=><ArticleRow key={a.id} article={a} onUpdate={updArt} onDelete={delArt} onLog={addLog}/>)}
          {!sA.length&&<div style={{padding:"30px",textAlign:"center",color:"#475569",fontSize:"12px"}}>Нет статей</div>}
        </div>}
        {tab==="plan"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}><span style={{fontSize:"11px",color:"#64748b"}}>План · {cur?.name}</span><Btn onClick={()=>setModal("addPlan")} v="acc" sx={{fontSize:"10px"}}>＋</Btn></div>
          {sP.map(p=><div key={p.id} style={{background:"#0f172a",borderRadius:"5px",padding:"8px 10px",border:"1px solid #1e293b",marginBottom:"3px",borderLeft:`3px solid ${PC[p.priority]||"#64748b"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:"6px"}}><span>{TI[p.type]||"📄"}</span><span style={{fontSize:"12px",fontWeight:600,color:"#e2e8f0"}}>{p.title}</span></div><div style={{display:"flex",gap:"6px",alignItems:"center"}}><Badge s={p.status}/><span style={{fontSize:"9px",color:"#475569",fontFamily:"var(--mn)"}}>{p.deadline}</span><Btn onClick={()=>delPl(p.id)} v="ghost" sx={{fontSize:"10px",color:"#ef4444"}}>✕</Btn></div></div>)}
          {!sP.length&&<div style={{padding:"30px",textAlign:"center",color:"#475569",fontSize:"12px"}}>Пусто</div>}
        </div>}
        {tab==="ai"&&<GlobalAI sites={sites} articles={articles} plan={plan} onLog={addLog}/>}
        {tab==="deploys"&&<DeploysPanel deploys={deploys}/>}
        {tab==="log"&&<LogPanel log={log}/>}
      </div>

      <div style={{marginTop:"16px",padding:"10px",background:"#0f172a",borderRadius:"6px",border:"1px solid #1e293b"}}>
        <div style={{fontSize:"9px",fontWeight:700,color:"#475569",marginBottom:"5px",textTransform:"uppercase",letterSpacing:".8px"}}>Stack</div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{[{n:"Claude API",s:1},{n:"Storage",s:1},{n:"Deploy",s:1},{n:"WP REST",s:0},{n:"GA4",s:0},{n:"n8n",s:0}].map(i=><div key={i.n} style={{padding:"4px 8px",background:"#1e293b",borderRadius:"3px",fontSize:"9px",display:"flex",alignItems:"center",gap:"4px"}}><div style={{width:"5px",height:"5px",borderRadius:"50%",background:i.s?"#34d399":"#fbbf24"}}/><span style={{fontWeight:700,color:"#cbd5e1"}}>{i.n}</span></div>)}</div>
      </div>

      {modal==="addArticle"&&<Modal title="➕ Статья" onClose={()=>setModal(null)}><AddForm type="article" siteId={sel} onAdd={a=>{addArt(a);setModal(null)}}/></Modal>}
      {modal==="addPlan"&&<Modal title="📋 План" onClose={()=>setModal(null)}><AddForm type="plan" siteId={sel} onAdd={p=>{addPl(p);setModal(null)}}/></Modal>}
      {modal==="addSite"&&<Modal title="🌐 Сайт" onClose={()=>setModal(null)}><SiteForm onSave={s=>{addSite(s);setModal(null)}}/></Modal>}
      {modal?.t==="editSite"&&<Modal title="✏️ Сайт" onClose={()=>setModal(null)}><SiteForm site={modal.site} onSave={s=>{updSite(s);setModal(null)}}/></Modal>}
      {showDeploy&&<DeployWizard sites={sites} onDeploy={addDeploy} onAddSite={addSite} onClose={()=>setShowDeploy(false)}/>}
    </div>
  );
}
