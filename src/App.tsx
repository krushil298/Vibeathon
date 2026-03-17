import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from './supabase';

// --- Types ---
type MarketPotential = 'Low' | 'Medium' | 'High' | 'Very High';
type Stage = 'Concept' | 'Early Stage' | 'MVP' | 'Growth';
type SortMode = 'newest' | 'popular' | 'easiest';
type ViewMode = 'grid' | 'list';
type Page = 'dashboard' | 'trending';
type Idea = {
  id: string; title: string; description: string; problem_statement: string;
  category: string; difficulty: number; market_potential: MarketPotential;
  target_audience: string; revenue_model: string; stage: Stage;
  upvotes: number; created_at: string;
};

const CATEGORIES = ['FinTech','HealthTech','EdTech','E-Commerce','AI/ML','SaaS','GreenTech','Social','Gaming','Other'];
const MARKET_OPTIONS: MarketPotential[] = ['Low','Medium','High','Very High'];
const STAGES: Stage[] = ['Concept','Early Stage','MVP','Growth'];
const REVENUE_MODELS = ['SaaS','Marketplace','Freemium','Subscription','Ad-based','E-commerce','Consulting','Other'];
const MARKET_WEIGHT: Record<string,number> = {'Low':1,'Medium':2,'High':3,'Very High':4};
const CAT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#14b8a6','#f97316','#ef4444','#6b7280'];
const CAT_EMOJI: Record<string,string> = {'FinTech':'💳','HealthTech':'🏥','EdTech':'📚','E-Commerce':'🛒','AI/ML':'🤖','SaaS':'☁️','GreenTech':'🌱','Social':'👥','Gaming':'🎮','Other':'💡'};

const DC: Record<number,{bar:string;glow:string;text:string;bg:string;label:string}> = {
  1:{bar:'#10b981',glow:'rgba(16,185,129,.2)',text:'text-emerald-400',bg:'bg-emerald-500/10',label:'Easy'},
  2:{bar:'#3b82f6',glow:'rgba(59,130,246,.2)',text:'text-blue-400',bg:'bg-blue-500/10',label:'Moderate'},
  3:{bar:'#f59e0b',glow:'rgba(245,158,11,.2)',text:'text-amber-400',bg:'bg-amber-500/10',label:'Hard'},
  4:{bar:'#f97316',glow:'rgba(249,115,22,.2)',text:'text-orange-400',bg:'bg-orange-500/10',label:'Very Hard'},
  5:{bar:'#ef4444',glow:'rgba(239,68,68,.2)',text:'text-red-400',bg:'bg-red-500/10',label:'Extreme'},
};
const MC: Record<string,{text:string;bg:string}> = {
  'Low':{text:'text-zinc-400',bg:'bg-zinc-400/10'},
  'Medium':{text:'text-blue-400',bg:'bg-blue-400/10'},
  'High':{text:'text-violet-400',bg:'bg-violet-400/10'},
  'Very High':{text:'text-indigo-400',bg:'bg-indigo-400/10'},
};
const SC: Record<Stage,{color:string;dot:string;emoji:string}> = {
  'Concept':{color:'text-zinc-400',dot:'#71717a',emoji:'🌱'},
  'Early Stage':{color:'text-amber-400',dot:'#f59e0b',emoji:'🔬'},
  'MVP':{color:'text-blue-400',dot:'#3b82f6',emoji:'🚀'},
  'Growth':{color:'text-emerald-400',dot:'#10b981',emoji:'📈'},
};

function getScore(i: Idea) { return i.upvotes * 2 + MARKET_WEIGHT[i.market_potential] + (6 - i.difficulty); }

function exportCSV(ideas: Idea[]) {
  const h = ['Title','Category','Stage','Difficulty','Market','Revenue Model','Target Audience','Upvotes','Score','Description','Problem'];
  const rows = ideas.map(i => [i.title,i.category,i.stage,`${i.difficulty}-${DC[i.difficulty].label}`,i.market_potential,i.revenue_model,i.target_audience,i.upvotes,getScore(i),`"${i.description.replace(/"/g,'""')}"`,`"${i.problem_statement.replace(/"/g,'""')}"`]);
  const csv = [h.join(','),...rows.map(r=>r.join(','))].join('\n');
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'ideavault.csv'});
  a.click();
}

function confettiBurst() {
  const c = document.createElement('canvas');
  c.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(c); c.width=innerWidth; c.height=innerHeight;
  const ctx=c.getContext('2d')!;
  const p=Array.from({length:100},()=>({x:Math.random()*c.width,y:-10,vx:(Math.random()-.5)*5,vy:Math.random()*3+2,color:['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'][Math.floor(Math.random()*5)],s:Math.random()*7+3,r:Math.random()*360,rv:(Math.random()-.5)*6,life:1}));
  let f=0;
  (function draw(){ctx.clearRect(0,0,c.width,c.height);p.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.08;q.r+=q.rv;q.life-=.013;ctx.save();ctx.globalAlpha=Math.max(0,q.life);ctx.fillStyle=q.color;ctx.translate(q.x,q.y);ctx.rotate(q.r*Math.PI/180);ctx.fillRect(-q.s/2,-q.s/2,q.s,q.s);ctx.restore();});if(++f<120)requestAnimationFrame(draw);else c.remove();})();
}

// Icons
const Ic={
  Search:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Plus:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  X:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Up:()=><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>,
  Star:()=><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Sun:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Moon:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  DL:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Copy:()=><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Check:()=><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  Grid:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  List:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
  Filter:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2"/></svg>,
  Menu:()=><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
  Chevron:({open}:{open:boolean})=><svg className={`w-3.5 h-3.5 transition-transform ${open?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>,
  Bulb:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  Flame:()=><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.5 6 6 7.5 6 12a6 6 0 0012 0c0-3-1.5-5.5-3-7a11.3 11.3 0 01-1 5C12.5 8.5 12 5 12 2z"/></svg>,
};

// --- Dropdown Component ---
function Dropdown({label,value,options,onChange,dark}:{label:string;value:string;options:string[];onChange:(v:string)=>void;dark:boolean}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current && !ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);
  const sel=value!=='All';
  return(
    <div ref={ref} className="relative w-full">
      <button onClick={()=>setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium transition-all ${sel?(dark?'bg-indigo-600/20 border-indigo-500/40 text-indigo-300':'bg-indigo-50 border-indigo-300 text-indigo-700'):(dark?'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20':'bg-gray-50 border-gray-200 text-zinc-600 hover:border-gray-300')}`}>
        <span className="truncate">{sel?value:label}</span>
        <Ic.Chevron open={open}/>
      </button>
      {open&&(
        <div className={`absolute z-50 mt-1 w-full border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dark?'bg-zinc-900 border-white/10':'bg-white border-gray-200'}`}>
          {['All',...options].map(opt=>(
            <button key={opt} onClick={()=>{onChange(opt==='All'?'All':opt);setOpen(false);}}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${value===opt?(dark?'bg-indigo-600/20 text-indigo-300':'bg-indigo-50 text-indigo-700'):(dark?'text-zinc-300 hover:bg-white/5':'text-zinc-700 hover:bg-gray-50')}`}>
              {opt==='All'?`All ${label}s`:opt}
              {value===opt&&<Ic.Check/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [dark,setDark]=useState(true);
  const [activePage,setActivePage]=useState<Page>('dashboard');
  const [ideas,setIdeas]=useState<Idea[]>([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [formError,setFormError]=useState('');
  const [formSuccess,setFormSuccess]=useState(false);
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const [copiedId,setCopiedId]=useState<string|null>(null);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [viewMode,setViewMode]=useState<ViewMode>('grid');
  const [search,setSearch]=useState('');
  const [filterCat,setFilterCat]=useState('All');
  const [filterDiff,setFilterDiff]=useState('All');
  const [filterMarket,setFilterMarket]=useState('All');
  const [filterStage,setFilterStage]=useState('All');
  const [filterRevenue,setFilterRevenue]=useState('All');
  const [sortBy,setSortBy]=useState<SortMode>('newest');
  const searchRef=useRef<HTMLInputElement>(null);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  // --- Central 3D Object Transforms ---
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 0.9]);
  const bgRotateX = useTransform(scrollYProgress, [0, 1], [40, -10]);
  const bgRotateY = useTransform(scrollYProgress, [0, 1], [-20, 30]);

  // --- Text Slides Opacity & Y Translates ---
  // Slide 1: Intro (Visbible 0 to 0.2)
  const t1Opacity = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0]);
  const t1Y       = useTransform(scrollYProgress, [0, 0.25], [0, -50]);

  // Slide 2: Pitch (Visible 0.2 to 0.45)
  const t2Opacity = useTransform(scrollYProgress, [0.15, 0.25, 0.40, 0.50], [0, 1, 1, 0]);
  const t2Y       = useTransform(scrollYProgress, [0.15, 0.25, 0.40, 0.50], [50, 0, 0, -50]);

  // Slide 3: Explore (Visible 0.45 to 0.70)
  const t3Opacity = useTransform(scrollYProgress, [0.40, 0.50, 0.65, 0.75], [0, 1, 1, 0]);
  const t3Y       = useTransform(scrollYProgress, [0.40, 0.50, 0.65, 0.75], [50, 0, 0, -50]);

  // Slide 4: Compete (Visible 0.70 to 1)
  const t4Opacity = useTransform(scrollYProgress, [0.65, 0.75, 1], [0, 1, 1]);
  const t4Y       = useTransform(scrollYProgress, [0.65, 0.75, 1], [50, 0, 0]);

  const [form,setForm]=useState({title:'',description:'',problem_statement:'',target_audience:'',revenue_model:REVENUE_MODELS[0],category:CATEGORIES[0],difficulty:3,market_potential:'High' as MarketPotential,stage:'Concept' as Stage});

  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);},[dark]);
  useEffect(()=>{fetchIdeas();},[]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;
      if(e.key==='n'||e.key==='N'){setShowForm(true);setFormError('');setFormSuccess(false);}
      if(e.key==='/'){{e.preventDefault();searchRef.current?.focus();}}
      if(e.key==='Escape'){setShowForm(false);setExpandedId(null);}
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[]);

  const fetchIdeas=useCallback(async()=>{
    setLoading(true);
    const {data}=await supabase.from('startup_ideas').select('*').order('created_at',{ascending:false});
    if(data)setIdeas(data as Idea[]);
    setLoading(false);
  },[]);

  const ff=(k:string,v:string|number)=>setForm(p=>({...p,[k]:v}));

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();setFormError('');
    if(!form.title.trim()||!form.description.trim()||!form.problem_statement.trim()||!form.target_audience.trim()) return setFormError('All starred fields are required.');
    if(ideas.some(i=>i.title.toLowerCase()===form.title.toLowerCase().trim())) return setFormError('This title already exists.');
    setSubmitting(true);
    const {error}=await supabase.from('startup_ideas').insert([{...form,title:form.title.trim()}]);
    setSubmitting(false);
    if(error)return setFormError('Submission failed: '+error.message);
    setFormSuccess(true);confettiBurst();
    setForm({title:'',description:'',problem_statement:'',target_audience:'',revenue_model:REVENUE_MODELS[0],category:CATEGORIES[0],difficulty:3,market_potential:'High',stage:'Concept'});
    fetchIdeas();setTimeout(()=>{setFormSuccess(false);setShowForm(false);},1800);
  }

  async function handleUpvote(id:string,cur:number,e:React.MouseEvent){
    e.stopPropagation();
    setIdeas(p=>p.map(i=>i.id===id?{...i,upvotes:cur+1}:i));
    await supabase.from('startup_ideas').update({upvotes:cur+1}).eq('id',id);
  }

  function copyLink(idea:Idea,e:React.MouseEvent){
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}?idea=${idea.id}`);
    setCopiedId(idea.id);setTimeout(()=>setCopiedId(null),1800);
  }

  const filtered=useMemo(()=>{
    let list=[...ideas];
    if(sortBy==='popular') list=list.sort((a,b)=>getScore(b)-getScore(a));
    if(sortBy==='easiest') list=list.sort((a,b)=>a.difficulty-b.difficulty);
    if(search.trim()) list=list.filter(i=>[i.title,i.description,i.category,i.target_audience,i.revenue_model,i.stage].join(' ').toLowerCase().includes(search.toLowerCase()));
    if(filterCat!=='All') list=list.filter(i=>i.category===filterCat);
    if(filterDiff!=='All') list=list.filter(i=>i.difficulty===parseInt(filterDiff));
    if(filterMarket!=='All') list=list.filter(i=>i.market_potential===filterMarket);
    if(filterStage!=='All') list=list.filter(i=>i.stage===filterStage);
    if(filterRevenue!=='All') list=list.filter(i=>i.revenue_model===filterRevenue);
    return list;
  },[ideas,search,filterCat,filterDiff,filterMarket,filterStage,filterRevenue,sortBy]);

  const stats=useMemo(()=>{
    if(!ideas.length)return{total:0,topCat:'—',avgDiff:'—',avgScore:'—',topIdea:null as Idea|null};
    const cc:Record<string,number>={};let ds=0,ss=0;
    ideas.forEach(i=>{cc[i.category]=(cc[i.category]||0)+1;ds+=i.difficulty;ss+=getScore(i);});
    const topIdea=[...ideas].sort((a,b)=>getScore(b)-getScore(a))[0];
    return{total:ideas.length,topCat:Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—',avgDiff:(ds/ideas.length).toFixed(1),avgScore:(ss/ideas.length).toFixed(0),topIdea};
  },[ideas]);

  const catBreakdown=useMemo(()=>{
    const m:Record<string,number>={};ideas.forEach(i=>{m[i.category]=(m[i.category]||0)+1;});
    const mx=Math.max(...Object.values(m),1);
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([cat,count])=>({cat,count,pct:(count/mx)*100,color:CAT_COLORS[CATEGORIES.indexOf(cat)%CAT_COLORS.length]}));
  },[ideas]);

  const anyFilter=filterCat!=='All'||filterDiff!=='All'||filterMarket!=='All'||filterStage!=='All'||filterRevenue!=='All'||search;
  const activeFilterCount=[filterCat!=='All',filterDiff!=='All',filterMarket!=='All',filterStage!=='All',filterRevenue!=='All',!!search].filter(Boolean).length;

  // Theme tokens
  const d=dark;
  const T={
    page:    d?'bg-[#080810] text-zinc-100':'bg-slate-50 text-zinc-900',
    nav:     d?'bg-[#080810]/95 border-white/[0.06]':'bg-white/95 border-black/5',
    sidebar: d?'bg-[#0c0c18] border-white/[0.06]':'bg-white border-gray-100',
    card:    d?'bg-white/[0.034] border-white/[0.07] hover:bg-white/[0.06] hover:border-indigo-500/30':'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md',
    inp:     d?'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/50':'bg-white border-gray-200 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400',
    modal:   d?'bg-[#0e0e1c] border-white/10':'bg-white border-gray-200',
    sub:     d?'text-zinc-400':'text-zinc-500',
    muted:   d?'text-zinc-500':'text-zinc-400',
    div:     d?'border-white/[0.06]':'border-gray-100',
    iconBtn: d?'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white':'bg-gray-100 border-transparent hover:bg-gray-200 text-zinc-500 hover:text-zinc-900',
    upvote:  d?'bg-white/5 border-white/10 text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-indigo-300':'bg-gray-50 border-gray-200 text-zinc-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600',
    pbar:    d?'bg-white/8':'bg-gray-100',
    skel:    d?'bg-white/[0.03] border-white/[0.07]':'bg-white border-gray-100 shadow-sm',
  };
  const inputCls=`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${T.inp}`;

  function IdeaCard({idea}:{idea:Idea}) {
    const score=getScore(idea); const dc=DC[idea.difficulty]; const mc=MC[idea.market_potential]; const sc=SC[idea.stage];
    const expanded=expandedId===idea.id;
    if(viewMode==='list') return(
      <div onClick={()=>setExpandedId(expanded?null:idea.id)}
        className={`group border rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-px ${T.card}`}
        style={{animation:'fadeUp .25s ease-out both'}}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs">{sc.emoji}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${sc.color}`}>{idea.stage}</span>
            <span className={`text-[10px] ${T.muted}`}>· {idea.category}</span>
          </div>
          <p className="font-bold text-sm">{idea.title}</p>
          <p className={`text-xs truncate mt-0.5 ${T.sub}`}>{idea.description}</p>
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mc.bg} ${mc.text}`}>📈 {idea.market_potential}</span>
          <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
            <Ic.Star/><span className="text-xs font-black">{score}</span>
          </div>
          <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
            <button onClick={e=>copyLink(idea,e)} className={`flex items-center gap-1 border text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${copiedId===idea.id?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':T.upvote}`}>
              {copiedId===idea.id?<><Ic.Check/>Copied</>:<><Ic.Copy/>Share</>}
            </button>
            <button onClick={e=>handleUpvote(idea.id,idea.upvotes,e)} className={`flex items-center gap-1 border text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
              <Ic.Up/> {idea.upvotes>0?idea.upvotes:'Vote'}
            </button>
          </div>
        </div>
      </div>
    );

    return(
      <div onClick={()=>setExpandedId(expanded?null:idea.id)}
        className={`group border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${T.card}`}
        style={{boxShadow:expanded?`0 0 0 1px rgba(99,102,241,.3),0 8px 32px ${dc.glow}`:'',animation:'fadeUp .3s ease-out both'}}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span>{sc.emoji}</span>
              <span className={`text-[10px] font-bold ${sc.color}`}>{idea.stage}</span>
              <span className={`text-[10px] ${T.muted}`}>· {CAT_EMOJI[idea.category]||'💡'} {idea.category}</span>
            </div>
            <h3 className="font-bold text-[15px] leading-snug">{idea.title}</h3>
          </div>
          <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5 shrink-0">
            <Ic.Star/><span className="text-amber-400 text-sm font-black leading-tight">{score}</span>
          </div>
        </div>
        <p className={`text-sm leading-relaxed line-clamp-2 ${T.sub}`}>{idea.description}</p>
        <div>
          <div className="flex justify-between mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${T.muted}`}>Difficulty</span>
            <span className={`text-[10px] font-bold ${dc.text}`}>{idea.difficulty}/5 · {dc.label}</span>
          </div>
          <div className={`h-1 rounded-full overflow-hidden ${T.pbar}`}>
            <div className="h-full rounded-full" style={{width:`${idea.difficulty/5*100}%`,backgroundColor:dc.bar,boxShadow:`0 0 6px ${dc.bar}`}}/>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mc.bg} ${mc.text}`}>📈 {idea.market_potential}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d?'bg-white/5 text-zinc-500':'bg-gray-100 text-zinc-500'}`}>💰 {idea.revenue_model}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d?'bg-white/5 text-zinc-500':'bg-gray-100 text-zinc-500'}`}>👥 {idea.target_audience.length>22?idea.target_audience.slice(0,22)+'…':idea.target_audience}</span>
        </div>
        {expanded&&(
          <div className={`text-xs space-y-2.5 border-t pt-3 ${T.div} animate-in fade-in duration-200`}>
            <div><p className={`font-bold uppercase text-[10px] tracking-widest mb-0.5 ${T.muted}`}>Problem</p><p className={T.sub}>{idea.problem_statement}</p></div>
            <div><p className={`font-bold uppercase text-[10px] tracking-widest mb-0.5 ${T.muted}`}>Audience</p><p className={T.sub}>{idea.target_audience}</p></div>
          </div>
        )}
        <div className={`flex items-center justify-between border-t pt-3 mt-auto ${T.div}`}>
          <span className={`text-[11px] ${T.muted}`}>{new Date(idea.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
          <div className="flex gap-1.5" onClick={e=>e.stopPropagation()}>
            <button onClick={e=>copyLink(idea,e)} className={`flex items-center gap-1 border text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${copiedId===idea.id?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':T.upvote}`}>
              {copiedId===idea.id?<><Ic.Check/>Copied</>:<><Ic.Copy/>Share</>}
            </button>
            <button onClick={e=>handleUpvote(idea.id,idea.upvotes,e)} className={`flex items-center gap-1 border text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
              <Ic.Up/> {idea.upvotes>0?idea.upvotes:'Vote'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div className={`min-h-screen font-[system-ui,sans-serif] transition-colors duration-300 ${T.page}`}>
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-60 -left-32 w-[600px] h-[600px] bg-indigo-600/7 rounded-full blur-3xl"/>
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl"/>
        <div className="absolute -bottom-48 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl"/>
      </div>

      {/* Navbar */}
      <nav className={`border-b sticky top-0 z-40 backdrop-blur-xl transition-colors ${T.nav}`}>
        <div className="px-5 md:px-8 h-16 flex items-center gap-3">

          {/* Left: sidebar toggle (dashboard only) + brand */}
          {activePage==='dashboard' && (
            <button onClick={()=>setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-xl border transition-all shrink-0 ${T.iconBtn}`}>
              <Ic.Menu/>
            </button>
          )}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-sm select-none">💡</div>
            <div className="hidden sm:block">
              <span className="font-black text-[17px] tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">IdeaVault</span>
            </div>
          </div>

          {/* Center: nav links */}
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {([
              {label:'🏠 Dashboard', page:'dashboard' as Page},
              {label:'🔥 Trending', page:'trending' as Page},
            ]).map(({label,page})=>(
              <button key={page} onClick={()=>{setActivePage(page); setExpandedId(null);}}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${activePage===page?(d?'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20':'bg-indigo-50 text-indigo-700 border border-indigo-200'):(d?'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent':'text-zinc-500 hover:text-zinc-900 hover:bg-gray-100 border border-transparent')}`}>
                {label}
              </button>
            ))}
            {activePage==='dashboard' && [
              {label:'⭐ Popular', s:'popular' as SortMode},
              {label:'✅ Easiest', s:'easiest' as SortMode},
              {label:'🕐 Newest',  s:'newest'  as SortMode},
            ].map(({label,s})=>(
              <button key={s} onClick={()=>setSortBy(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${sortBy===s?(d?'bg-purple-600/20 text-purple-300':'bg-purple-50 text-purple-700'):(d?'text-zinc-500 hover:text-white hover:bg-white/5':'text-zinc-400 hover:text-zinc-900 hover:bg-gray-100')}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Center: search bar */}
          <div className="relative flex-1 max-w-md mx-auto hidden md:block">
            <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${T.muted}`}><Ic.Search/></span>
            <input ref={searchRef} type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search ideas…"
              className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all ${T.inp}`}/>
            {search && (
              <button onClick={()=>setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${T.muted} hover:text-red-400 transition-colors`}><Ic.X/></button>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Ideas count badge */}
            <div className={`hidden md:flex items-center gap-1.5 text-xs font-bold border rounded-full px-3 py-1.5 ${d?'bg-white/5 border-white/10 text-zinc-400':'bg-gray-100 border-gray-200 text-zinc-500'}`}>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>
              {ideas.length} ideas
            </div>
            <button onClick={()=>exportCSV(filtered)} title="Export CSV"
              className={`p-2.5 rounded-xl border transition-all hidden md:flex ${T.iconBtn}`}><Ic.DL/>
            </button>
            <button onClick={()=>setDark(!d)}
              className={`p-2.5 rounded-xl border transition-all ${T.iconBtn}`}>
              {d?<Ic.Sun/>:<Ic.Moon/>}
            </button>
            <button onClick={()=>{setShowForm(true);setFormError('');setFormSuccess(false);}}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              <Ic.Plus/>
              <span className="hidden sm:inline">Submit Idea</span>
            </button>
          </div>
        </div>
      </nav>
      {/* ── Dashboard Page ── */}
      {activePage === 'dashboard' && (
      <>
      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative h-[400vh]">
        <div className={`sticky top-16 h-[calc(100vh-64px)] w-full overflow-hidden flex items-center justify-center [perspective:1000px] border-b ${T.div}`}>
          {/* Main static backdrop */}
          <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute inset-0 ${d?'bg-[#020202]':'bg-[#f5f5f7]'}`}/>
          </div>
          
          {/* The Central Twisting 3D Object (Kontenta/Apple style glass container) */}
          <motion.div 
            style={{ scale: bgScale, rotateX: bgRotateX, rotateY: bgRotateY }}
            className={`absolute w-[80%] md:w-[60%] max-w-4xl aspect-[4/3] rounded-[3rem] md:rounded-[4rem] border flex items-center justify-center p-8 origin-center shadow-2xl overflow-hidden pointer-events-none ${d?'bg-[#111116]/80 border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)]':'bg-white/80 border-black/5 shadow-[0_0_60px_rgba(0,0,0,0.1)]'} backdrop-blur-2xl`}
          >
            {/* Inner dynamic lighting/mesh inside the object */}
            <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${d?'from-indigo-500/10 via-purple-500/5 to-transparent':'from-indigo-400/5 via-purple-400/5 to-transparent'}`}/>
            <div className={`absolute top-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px] ${d?'bg-indigo-600/20':'bg-indigo-300/30'}`}/>
            <div className={`absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] ${d?'bg-purple-600/10':'bg-purple-300/20'}`}/>
            <div className="absolute inset-0 border border-white/10 rounded-[3rem] md:rounded-[4rem] mix-blend-overlay"/>
          </motion.div>

          {/* Foreground Text Track - Centered Overlays */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
            
            {/* SLIDE 1: Intro */}
            <motion.div style={{ opacity: t1Opacity, y: t1Y }} className="absolute text-center flex flex-col items-center">
              <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-bold mb-6 ${d?'bg-white/5 border-white/10 text-zinc-300':'bg-black/5 border-black/10 text-zinc-600'}`}>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"/> IdeaVault
              </div>
              <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] mb-6 ${d?'text-zinc-100':'text-zinc-900'}`}>
                Validate. <br/><span className="text-indigo-400">Compare.</span> <br/>Ship.
              </h1>
              <p className={`text-lg md:text-xl max-w-lg mx-auto leading-relaxed ${d?'text-zinc-400':'text-zinc-500'}`}>
                The intelligence platform for builders. Market-test your startup ideas globally before you write a single line of code.
              </p>
            </motion.div>

            {/* SLIDE 2: Pitch */}
            <motion.div style={{ opacity: t2Opacity, y: t2Y }} className="absolute text-center flex flex-col items-center">
              <div className="text-7xl mb-6">💡</div>
              <h1 className={`text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6 ${d?'text-zinc-100':'text-zinc-900'}`}>
                Pitch Your Ambitions
              </h1>
              <p className={`text-lg md:text-xl max-w-xl mx-auto leading-relaxed ${d?'text-zinc-400':'text-zinc-500'}`}>
                Define your exact problem statement, target audience, and business model. Publish your concepts to a global think-tank of founders and operators instantly.
              </p>
            </motion.div>

            {/* SLIDE 3: Explore */}
            <motion.div style={{ opacity: t3Opacity, y: t3Y }} className="absolute text-center flex flex-col items-center">
              <div className="text-7xl mb-6">🔍</div>
              <h1 className={`text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6 ${d?'text-zinc-100':'text-zinc-900'}`}>
                Analyze The Market
              </h1>
              <p className={`text-lg md:text-xl max-w-xl mx-auto leading-relaxed ${d?'text-zinc-400':'text-zinc-500'}`}>
                Filter by industry constraints. Identify high-potential models in FinTech, AI, and SaaS. We map difficulty against revenue potential so you can pivot precisely.
              </p>
            </motion.div>

            {/* SLIDE 4: Compete / Trending */}
            <motion.div style={{ opacity: t4Opacity, y: t4Y }} className="absolute text-center flex flex-col items-center w-full max-w-4xl">
              <div className="text-7xl mb-6">🔥</div>
              <h1 className={`text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-10 ${d?'text-zinc-100':'text-zinc-900'}`}>
                Climb The Trends
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
                <button onClick={()=>{setShowForm(true);setFormError('');setFormSuccess(false);}}
                  className={`flex items-center gap-2 font-bold px-8 py-4 rounded-2xl transition-all active:scale-95 shadow-xl text-base pointer-events-auto ${d?'bg-white text-black hover:bg-zinc-200':'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                  <Ic.Plus/> Start Building
                </button>
                <button onClick={()=>{setActivePage('trending'); setExpandedId(null);}}
                  className={`flex items-center gap-2 border font-semibold px-8 py-4 rounded-2xl transition-all text-base pointer-events-auto ${d?'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 backdrop-blur-md':'bg-black/5 border-black/10 text-zinc-700 hover:bg-black/10 backdrop-blur-md shadow-sm'}`}>
                  View Trending Now
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 w-full">
                {[
                  {val:stats.total, label:'Global Ideas'},
                  {val:stats.topCat, label:'Top Sector'},
                  {val:stats.avgDiff!=='—'?stats.avgDiff+'/5':'—', label:'Avg Friction'},
                ].map((s,i)=>(
                  <div key={i} className={`text-center px-6 py-4 rounded-2xl border flex-1 min-w-[140px] max-w-[200px] ${d?'bg-white/5 border-white/10 backdrop-blur-xl':'bg-white/50 border-black/5 backdrop-blur-xl'}`}>
                    <div className={`text-3xl md:text-4xl font-black tracking-tight ${d?'text-zinc-100':'text-zinc-900'}`}>{s.val}</div>
                    <div className={`text-xs font-bold mt-2 uppercase tracking-widest ${d?'text-zinc-500':'text-zinc-400'}`}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* ── Trending Page ── */}
      {activePage === 'trending' && (() => {
        const ranked = [...ideas].sort((a, b) => getScore(b) - getScore(a));
        const maxScore = Math.max(getScore(ranked[0]) || 1, 1);
        const p1 = ranked[0] ?? null;
        const p2 = ranked[1] ?? null;
        const p3 = ranked[2] ?? null;
        const rest = ranked.slice(3, 10);

        type PodiumMeta = { medal: string; label: string; glow: string; border: string; bg: string; ring: string; text: string };
        const PM: [PodiumMeta, PodiumMeta, PodiumMeta] = [
          { medal:'🥇', label:'1st Place', glow:'rgba(251,191,36,.20)', border: d?'border-amber-400/40':'border-amber-400', bg: d?'bg-amber-500/[0.08]':'bg-amber-50',  ring: d?'ring-1 ring-amber-400/30':'ring-1 ring-amber-400/50', text:'text-amber-400' },
          { medal:'🥈', label:'2nd Place', glow:'rgba(148,163,184,.14)', border: d?'border-slate-400/30':'border-slate-300', bg: d?'bg-slate-500/[0.05]':'bg-slate-50',  ring: '', text: d?'text-slate-300':'text-slate-500' },
          { medal:'🥉', label:'3rd Place', glow:'rgba(180,120,60,.14)',  border: d?'border-amber-700/30':'border-orange-300', bg: d?'bg-amber-900/[0.08]':'bg-orange-50', ring: '', text:'text-amber-700' },
        ];

        function PodiumCard({ idea, meta, delay }: { idea: Idea; meta: PodiumMeta; delay: number }) {
          const score = getScore(idea);
          const dc = DC[idea.difficulty];
          return (
            <div onClick={() => setExpandedId(idea.id)}
              className={`w-full md:w-72 border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${meta.bg} ${meta.border} ${meta.ring}`}
              style={{ boxShadow: `0 0 40px ${meta.glow}`, animation: `fadeUp .4s ease-out ${delay}ms both` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{meta.medal}</span>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-widest ${meta.text}`}>{meta.label}</div>
                    <div className={`text-[10px] ${T.muted}`}>{idea.category}</div>
                  </div>
                </div>
                <div className="flex flex-col items-center bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-1.5">
                  <Ic.Star/>
                  <span className="text-amber-400 text-lg font-black leading-none">{score}</span>
                  <span className={`text-[9px] ${T.muted}`}>pts</span>
                </div>
              </div>
              <p className="font-black text-base leading-snug">{idea.title}</p>
              <p className={`text-xs leading-relaxed line-clamp-2 ${T.sub}`}>{idea.description}</p>
              <div>
                <div className="flex justify-between mb-1">
                  <span className={`text-[10px] uppercase tracking-widest font-semibold ${T.muted}`}>Difficulty</span>
                  <span className={`text-[10px] font-bold ${dc.text}`}>{idea.difficulty}/5 · {dc.label}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${T.pbar}`}>
                  <div className="h-full rounded-full" style={{ width:`${idea.difficulty/5*100}%`, backgroundColor:dc.bar, boxShadow:`0 0 6px ${dc.bar}` }}/>
                </div>
              </div>
              <div className={`flex items-center justify-between border-t pt-3 ${T.div}`}>
                <div className="flex gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MC[idea.market_potential].bg} ${MC[idea.market_potential].text}`}>📈 {idea.market_potential}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d?'bg-white/5 text-zinc-500':'bg-gray-100 text-zinc-400'}`}>💰 {idea.revenue_model}</span>
                </div>
                <button onClick={e => handleUpvote(idea.id, idea.upvotes, e)}
                  className={`flex items-center gap-1 text-xs font-black border px-3 py-1.5 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
                  <Ic.Up/> {idea.upvotes}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className={`border-b ${T.div} ${d?'bg-[#09090f]':'bg-gray-50/80'}`}>
            {/* Header */}
            <div className="px-6 md:px-10 pt-8 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🏆</span>
                  <h2 className="text-lg font-black tracking-tight">Idea Leaderboard</h2>
                </div>
                <p className={`text-xs ${T.muted}`}>Score = votes×2 + market weight + (6−difficulty)</p>
              </div>
              <span className={`text-xs font-bold border px-3 py-1.5 rounded-full ${d?'bg-white/5 border-white/10 text-zinc-400':'bg-white border-gray-200 text-zinc-500'}`}>
                {ranked.length} ideas ranked
              </span>
            </div>

            <div className="px-6 md:px-10 pb-10 space-y-8">
              {/* Podium: Silver left, Gold center (raised), Bronze right */}
              <div className="flex flex-col md:flex-row items-end justify-center gap-4 pt-2">
                {p2 && <div className="w-full md:w-72"><PodiumCard idea={p2} meta={PM[1]} delay={80}/></div>}
                {p1 && <div className="w-full md:w-72 md:mb-6"><PodiumCard idea={p1} meta={PM[0]} delay={0}/></div>}
                {p3 && <div className="w-full md:w-72"><PodiumCard idea={p3} meta={PM[2]} delay={160}/></div>}
              </div>

              {/* Ranked table #4 onward */}
              {rest.length > 0 && (
                <div className={`border rounded-2xl overflow-hidden ${T.div} ${d?'bg-white/[0.02]':'bg-white shadow-sm'}`}>
                  <div className={`px-5 py-3 border-b flex items-center ${T.div} ${d?'bg-white/[0.03]':'bg-gray-50'}`}>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${T.muted}`}>📋 Rankings #4 – #{rest.length + 3}</span>
                  </div>
                  <div className={`divide-y ${d?'divide-white/[0.05]':'divide-gray-100'}`}>
                    {rest.map((idea, idx) => {
                      const score = getScore(idea);
                      const dc = DC[idea.difficulty];
                      const sc = SC[idea.stage as Stage] ?? SC['Concept'];
                      const pct = (score / maxScore) * 100;
                      return (
                        <div key={idea.id}
                          onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                          className={`flex items-center gap-3 md:gap-4 px-5 py-3.5 cursor-pointer transition-all ${d?'hover:bg-white/[0.04]':'hover:bg-gray-50'}`}
                          style={{ animation:`fadeUp .3s ease-out ${idx*40}ms both` }}>
                          <span className={`shrink-0 w-6 text-center text-sm font-black ${T.muted}`}>#{idx+4}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{idea.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span style={{ color: sc.dot }} className="text-[9px]">●</span>
                              <span className={`text-[10px] ${T.muted}`}>{idea.stage} · {idea.category}</span>
                            </div>
                          </div>
                          {/* Score bar */}
                          <div className="w-20 hidden sm:block">
                            <div className={`h-1.5 rounded-full overflow-hidden ${T.pbar}`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width:`${pct}%` }}/>
                            </div>
                          </div>
                          {/* Badges */}
                          <div className="hidden md:flex items-center gap-1.5 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MC[idea.market_potential].bg} ${MC[idea.market_potential].text}`}>{idea.market_potential}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dc.bg} ${dc.text}`}>{dc.label}</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 shrink-0">
                            <Ic.Star/><span className="text-xs font-black">{score}</span>
                          </div>
                          <button onClick={e => handleUpvote(idea.id, idea.upvotes, e)}
                            className={`shrink-0 flex items-center gap-1 text-[11px] font-black border px-2.5 py-1 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
                            <Ic.Up/> {idea.upvotes}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Dashboard Main Grid Area */}
      {activePage === 'dashboard' && (
      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Sidebar — Filters only */}
        <aside className={`shrink-0 border-r transition-all duration-300 overflow-hidden ${T.sidebar} ${T.div} ${sidebarOpen?'w-60':'w-0'}`}>
          <div className="w-60 p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-56px)] sticky top-14">

            {/* Category breakdown */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${T.muted}`}>By Category</p>
              <div className="space-y-2">
                {catBreakdown.map(({cat,count,pct,color})=>(
                  <button key={cat} onClick={()=>setFilterCat(filterCat===cat?'All':cat)} className="w-full text-left group">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium transition-colors ${filterCat===cat?'text-white font-bold':T.sub} group-hover:text-white`}>{CAT_EMOJI[cat]} {cat}</span>
                      <span className={`text-[10px] font-bold ${T.muted}`}>{count}</span>
                    </div>
                    <div className={`h-1 rounded-full overflow-hidden ${T.pbar}`}>
                      <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,backgroundColor:color,opacity:filterCat===cat?1:.55}}/>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter dropdowns */}
            <div className="space-y-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${T.muted}`}>
                Filters {activeFilterCount>0&&<span className="text-indigo-400">({activeFilterCount} active)</span>}
              </p>
              <Dropdown label="Market Potential" value={filterMarket} options={[...MARKET_OPTIONS]} onChange={setFilterMarket} dark={d}/>
              <Dropdown label="Stage" value={filterStage} options={[...STAGES]} onChange={setFilterStage} dark={d}/>
              <Dropdown label="Difficulty" value={filterDiff!=='All'?`${filterDiff} – ${DC[parseInt(filterDiff)]?.label||''}`:filterDiff}
                options={Object.entries(DC).map(([k,v])=>`${k} – ${v.label}`)} onChange={v=>setFilterDiff(v==='All'?'All':v.split(' – ')[0])} dark={d}/>
              <Dropdown label="Revenue Model" value={filterRevenue} options={REVENUE_MODELS} onChange={setFilterRevenue} dark={d}/>
              {anyFilter&&(
                <button onClick={()=>{setFilterCat('All');setFilterDiff('All');setFilterMarket('All');setFilterStage('All');setFilterRevenue('All');setSearch('');}}
                  className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors py-1.5 font-semibold">
                  ✕ Reset all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-5 md:p-8 space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${T.muted}`}><span className="font-bold text-white">{filtered.length}</span> of {ideas.length} ideas</span>
              {anyFilter&&<span className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">{activeFilterCount} filter{activeFilterCount!==1?'s':''} active</span>}
            </div>
            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className={`flex border rounded-xl p-1 gap-0.5 transition-colors ${d?'bg-white/[0.04] border-white/[0.08]':'bg-white border-gray-200'}`}>
                {([['newest','🕐'],['popular','⭐'],['easiest','✅']] as [SortMode,string][]).map(([s,e])=>(
                  <button key={s} onClick={()=>setSortBy(s)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${sortBy===s?'bg-indigo-600 text-white shadow-md':T.muted}`}>
                    {e} {s}
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div className={`flex border rounded-xl p-1 gap-0.5 ${d?'bg-white/[0.04] border-white/[0.08]':'bg-white border-gray-200'}`}>
                <button onClick={()=>setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode==='grid'?'bg-indigo-600 text-white':T.muted}`}><Ic.Grid/></button>
                <button onClick={()=>setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode==='list'?'bg-indigo-600 text-white':T.muted}`}><Ic.List/></button>
              </div>
              <button onClick={()=>exportCSV(filtered)} className={`p-2 border rounded-xl transition-all ${T.iconBtn}`} title="Export CSV"><Ic.DL/></button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="md:hidden relative">
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${T.muted}`}><Ic.Search/></span>
            <input ref={searchRef} type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ideas…"
              className={`w-full border rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-all ${T.inp}`}/>
          </div>

          {/* Cards */}
          {loading?(
            <div className={`grid gap-4 ${viewMode==='grid'?'grid-cols-1 md:grid-cols-2 lg:grid-cols-3':'grid-cols-1'}`}>
              {Array.from({length:6},(_,i)=><div key={i} className={`border rounded-2xl h-48 animate-pulse ${T.skel}`}/>)}
            </div>
          ):filtered.length===0?(
            <div className={`text-center py-28 ${T.muted}`}>
              <div className="text-6xl mb-5 opacity-30">💡</div>
              <p className="text-xl font-bold mb-1.5">No ideas match</p>
              <p className="text-sm">Clear filters or submit a new idea!</p>
            </div>
          ):(
            <div className={`grid gap-4 ${viewMode==='grid'?'grid-cols-1 md:grid-cols-2 lg:grid-cols-3':'grid-cols-1'}`}>
              {filtered.map(idea=><IdeaCard key={idea.id} idea={idea}/>)}
            </div>
          )}
        </main>
      </div>
      )}

      {/* Submit Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={()=>setShowForm(false)}/>
          <div className={`relative border rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 ${T.modal}`}>
            {formSuccess?(
              <div className="text-center py-16 animate-in zoom-in duration-300">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-black mb-2">Idea Submitted!</h2>
                <p className={T.muted}>Your startup idea is now live on the dashboard.</p>
              </div>
            ):(
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black flex items-center gap-2"><Ic.Bulb/> New Startup Idea</h2>
                    <p className={`text-xs mt-0.5 ${T.muted}`}>Starred ( * ) fields are required · Shortcut: N</p>
                  </div>
                  <button onClick={()=>setShowForm(false)} className={`p-2 rounded-xl transition-all ${T.iconBtn}`}><Ic.X/></button>
                </div>
                {formError&&<div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Startup Title *</label>
                    <input type="text" value={form.title} onChange={e=>ff('title',e.target.value)} placeholder="e.g. AI-Powered Calorie Tracker" className={inputCls}/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Short Description *</label>
                      <textarea value={form.description} onChange={e=>ff('description',e.target.value)} placeholder="What does your startup do?" rows={3} className={`${inputCls} resize-none`}/>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Problem Statement *</label>
                      <textarea value={form.problem_statement} onChange={e=>ff('problem_statement',e.target.value)} placeholder="What problem does this solve?" rows={3} className={`${inputCls} resize-none`}/>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Target Audience *</label>
                    <input type="text" value={form.target_audience} onChange={e=>ff('target_audience',e.target.value)} placeholder="e.g. College students, SMB owners" className={inputCls}/>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{label:'Category',key:'category',opts:CATEGORIES},{label:'Stage',key:'stage',opts:STAGES},{label:'Revenue Model',key:'revenue_model',opts:REVENUE_MODELS}].map(({label,key,opts})=>(
                      <div key={key}>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>{label}</label>
                        <select value={(form as any)[key]} onChange={e=>ff(key,e.target.value)} className={`${inputCls} cursor-pointer`}>
                          {opts.map(o=><option key={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Difficulty</label>
                      <select value={form.difficulty} onChange={e=>ff('difficulty',parseInt(e.target.value))} className={`${inputCls} cursor-pointer`}>
                        {Object.entries(DC).map(([k,v])=><option key={k} value={k}>{k} – {v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${T.muted}`}>Market Potential</label>
                      <select value={form.market_potential} onChange={e=>ff('market_potential',e.target.value as MarketPotential)} className={`${inputCls} cursor-pointer`}>
                        {MARKET_OPTIONS.map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-indigo-500/20">
                    {submitting?'Submitting…':'🚀 Submit Idea'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
