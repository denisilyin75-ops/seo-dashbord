// ============================================================================
// ORIGINAL PROTOTYPE — Claude.ai React artifact.
// Использует window.storage (artifact API) и прямые вызовы к api.anthropic.com.
// В production-версии (src/) заменено на REST API к Express + SQLite.
// Хранится как reference для UI/UX (цвета, верстка, стили, UX-флоу).
// ============================================================================
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

// [Полный код DeployWizard, ArticleRow, GlobalAI, LogPanel, DeploysPanel, AddForm,
//  SiteForm и App() — см. коммит в репозитории или исходный артефакт в Claude.ai.
//  В production-версии разбито на отдельные файлы под src/components/ и src/pages/.]
