import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from './supabase';

// --- Types ---
type MarketPotential = 'Low' | 'Medium' | 'High' | 'Very High';
type Stage = 'Concept' | 'Early Stage' | 'MVP' | 'Growth';
type SortMode = 'newest' | 'popular' | 'trending';
type Idea = {
  id: string; title: string; description: string; problem_statement: string;
  category: string; difficulty: number; market_potential: MarketPotential;
  target_audience: string; revenue_model: string; stage: Stage;
  upvotes: number; created_at: string;
};

// --- Constants ---
const CATEGORIES = ['FinTech', 'HealthTech', 'EdTech', 'E-Commerce', 'AI/ML', 'SaaS', 'GreenTech', 'Social', 'Gaming', 'Other'];
const MARKET_OPTIONS: MarketPotential[] = ['Low', 'Medium', 'High', 'Very High'];
const STAGES: Stage[] = ['Concept', 'Early Stage', 'MVP', 'Growth'];
const REVENUE_MODELS = ['SaaS', 'Marketplace', 'Freemium', 'Subscription', 'Ad-based', 'E-commerce', 'Consulting', 'Other'];
const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Moderate', 3: 'Hard', 4: 'Very Hard', 5: 'Extreme' };
const MARKET_WEIGHT: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
const CAT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#14b8a6','#f97316','#ef4444','#6b7280'];

const DIFF_CFG: Record<number, { bar: string; glow: string; text: string; bg: string }> = {
  1: { bar: '#10b981', glow: 'rgba(16,185,129,.15)', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  2: { bar: '#3b82f6', glow: 'rgba(59,130,246,.15)', text: 'text-blue-400',    bg: 'bg-blue-500/10' },
  3: { bar: '#f59e0b', glow: 'rgba(245,158,11,.15)', text: 'text-amber-400',   bg: 'bg-amber-500/10' },
  4: { bar: '#f97316', glow: 'rgba(249,115,22,.15)', text: 'text-orange-400',  bg: 'bg-orange-500/10' },
  5: { bar: '#ef4444', glow: 'rgba(239,68,68,.15)',  text: 'text-red-400',     bg: 'bg-red-500/10' },
};
const MKT_CFG: Record<string, { text: string; bg: string }> = {
  'Low':       { text: 'text-zinc-400',   bg: 'bg-zinc-400/10' },
  'Medium':    { text: 'text-blue-400',   bg: 'bg-blue-400/10' },
  'High':      { text: 'text-violet-400', bg: 'bg-violet-400/10' },
  'Very High': { text: 'text-indigo-400', bg: 'bg-indigo-400/10' },
};
const STAGE_CFG: Record<Stage, { color: string; dot: string; label: string }> = {
  'Concept':     { color: 'text-zinc-400',   dot: '#71717a', label: '🌱' },
  'Early Stage': { color: 'text-amber-400',  dot: '#f59e0b', label: '🔬' },
  'MVP':         { color: 'text-blue-400',   dot: '#3b82f6', label: '🚀' },
  'Growth':      { color: 'text-emerald-400',dot: '#10b981', label: '📈' },
};

function getScore(idea: Idea) { return idea.upvotes * 2 + MARKET_WEIGHT[idea.market_potential] + (6 - idea.difficulty); }

function exportCSV(ideas: Idea[]) {
  const headers = ['Title','Category','Stage','Difficulty','Market Potential','Revenue Model','Target Audience','Upvotes','Popularity Score','Description','Problem Statement','Created'];
  const rows = ideas.map(i => [i.title, i.category, i.stage, `${i.difficulty} - ${DIFFICULTY_LABELS[i.difficulty]}`, i.market_potential, i.revenue_model, i.target_audience, i.upvotes, getScore(i), `"${i.description.replace(/"/g,'""')}"`, `"${i.problem_statement.replace(/"/g,'""')}"`, new Date(i.created_at).toLocaleDateString()]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'ideavault-export.csv' });
  a.click(); URL.revokeObjectURL(url);
}

// Confetti burst (no external dep)
function confettiBurst() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d')!;
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: -20,
    vx: (Math.random() - 0.5) * 6, vy: Math.random() * 3 + 2,
    color: ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'][Math.floor(Math.random()*5)],
    size: Math.random() * 7 + 3, rot: Math.random() * 360, rotV: (Math.random()-0.5)*6,
    life: 1,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.rot += p.rotV; p.life -= 0.012;
      ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI/180);
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); ctx.restore();
    });
    if (++frame < 130) requestAnimationFrame(draw); else canvas.remove();
  }
  draw();
}

// --- Tiny Icons ---
const I = {
  Search: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Plus:   () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  X:      () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Up:     () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>,
  Star:   () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Sun:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Moon:   () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Download:()=><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Copy:   () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  Bar:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  Check:  () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  Keyboard:()=><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="12" rx="2"/><path strokeLinecap="round" d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg>,
};

export default function App() {
  const [dark, setDark] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDiff, setFilterDiff] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const searchRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', description: '', problem_statement: '', target_audience: '',
    revenue_model: REVENUE_MODELS[0], category: CATEGORIES[0],
    difficulty: 3, market_potential: 'High' as MarketPotential, stage: 'Concept' as Stage,
  });

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { fetchIdeas(); }, []);

  // Keyboard shortcut: N = new idea, / = search, Esc = close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n' || e.key === 'N') { setShowForm(true); setFormError(''); setFormSuccess(false); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') { setShowForm(false); setShowAnalytics(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('startup_ideas').select('*').order('created_at', { ascending: false });
    if (data) setIdeas(data as Idea[]);
    setLoading(false);
  }, []);

  const ff = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.description.trim() || !form.problem_statement.trim() || !form.target_audience.trim())
      return setFormError('All starred fields are required.');
    if (ideas.some(i => i.title.toLowerCase() === form.title.toLowerCase().trim()))
      return setFormError('An idea with this title already exists.');
    setSubmitting(true);
    const { error } = await supabase.from('startup_ideas').insert([{ ...form, title: form.title.trim() }]);
    setSubmitting(false);
    if (error) return setFormError('Submission failed: ' + error.message);
    setFormSuccess(true);
    confettiBurst();
    setForm({ title: '', description: '', problem_statement: '', target_audience: '', revenue_model: REVENUE_MODELS[0], category: CATEGORIES[0], difficulty: 3, market_potential: 'High', stage: 'Concept' });
    fetchIdeas();
    setTimeout(() => { setFormSuccess(false); setShowForm(false); }, 1800);
  }

  async function handleUpvote(id: string, cur: number, e: React.MouseEvent) {
    e.stopPropagation();
    setIdeas(p => p.map(i => i.id === id ? { ...i, upvotes: cur + 1 } : i));
    await supabase.from('startup_ideas').update({ upvotes: cur + 1 }).eq('id', id);
  }

  function copyLink(idea: Idea, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}?idea=${idea.id}`);
    setCopiedId(idea.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  const filtered = useMemo(() => {
    let list = [...ideas];
    if (sortBy === 'popular')  list = list.sort((a, b) => getScore(b) - getScore(a));
    if (sortBy === 'trending') list = list.sort((a, b) => b.upvotes - a.upvotes);
    if (search.trim()) list = list.filter(i => [i.title, i.description, i.category, i.target_audience, i.revenue_model].join(' ').toLowerCase().includes(search.toLowerCase()));
    if (filterCat    !== 'All') list = list.filter(i => i.category === filterCat);
    if (filterDiff   !== 'All') list = list.filter(i => i.difficulty === parseInt(filterDiff));
    if (filterMarket !== 'All') list = list.filter(i => i.market_potential === filterMarket);
    if (filterStage  !== 'All') list = list.filter(i => i.stage === filterStage);
    return list;
  }, [ideas, search, filterCat, filterDiff, filterMarket, filterStage, sortBy]);

  const stats = useMemo(() => {
    if (!ideas.length) return { total: 0, topCat: '—', avgDiff: '—', avgScore: '—', topScore: 0 };
    const catCount: Record<string, number> = {};
    let diffSum = 0, scoreSum = 0;
    ideas.forEach(i => { catCount[i.category] = (catCount[i.category] || 0) + 1; diffSum += i.difficulty; scoreSum += getScore(i); });
    return { total: ideas.length, topCat: Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—', avgDiff: (diffSum / ideas.length).toFixed(1), avgScore: (scoreSum / ideas.length).toFixed(0), topScore: Math.max(...ideas.map(getScore)) };
  }, [ideas]);

  const analytics = useMemo(() => {
    const map: Record<string, number> = {};
    ideas.forEach(i => { map[i.category] = (map[i.category] || 0) + 1; });
    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, count], idx) => ({ cat, count, pct: (count / max) * 100, color: CAT_COLORS[CATEGORIES.indexOf(cat) % CAT_COLORS.length] }));
  }, [ideas]);

  const trending = useMemo(() => [...ideas].sort((a, b) => b.upvotes - a.upvotes).filter(i => i.upvotes > 0).slice(0, 3), [ideas]);
  const anyFilter = filterCat !== 'All' || filterDiff !== 'All' || filterMarket !== 'All' || filterStage !== 'All' || search;

  // Theme
  const d = dark;
  const T = {
    page:       d ? 'bg-[#080810] text-zinc-100' : 'bg-slate-50 text-zinc-900',
    glass:      d ? 'bg-white/[0.03] border-white/[0.07] backdrop-blur-xl' : 'bg-white/80 border-black/5 backdrop-blur-xl',
    card:       d ? 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.14]' : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md',
    inp:        d ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8' : 'bg-white border-gray-200 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:bg-indigo-50/50',
    modal:      d ? 'bg-[#0e0e1a] border-white/10' : 'bg-white border-gray-200',
    sub:        d ? 'text-zinc-400' : 'text-zinc-500',
    muted:      d ? 'text-zinc-500' : 'text-zinc-400',
    divider:    d ? 'border-white/[0.07]' : 'border-gray-100',
    pill:       d ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:border-indigo-500/40 hover:text-white hover:bg-white/[0.07]' : 'bg-gray-100 border-transparent text-zinc-500 hover:border-indigo-300 hover:text-zinc-900 hover:bg-indigo-50',
    pillOn:     'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/25',
    toggle:     d ? 'bg-white/[0.06] hover:bg-white/[0.10] text-amber-300' : 'bg-gray-100 hover:bg-gray-200 text-indigo-600',
    upvote:     d ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-indigo-300' : 'bg-gray-50 border-gray-200 text-zinc-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600',
    pbar:       d ? 'bg-white/8' : 'bg-gray-100',
    skeleton:   d ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-gray-100 shadow-sm',
    sortbox:    d ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-gray-200',
  };
  const inputCls = `w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${T.inp}`;
  const taCls = `${inputCls} resize-none`;
  const selCls = `${inputCls} cursor-pointer`;

  const PillFilter = ({ label, values, current, onChange }: { label: string; values: string[]; current: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className={`text-[11px] font-bold uppercase tracking-widest mr-0.5 shrink-0 ${T.muted}`}>{label}</span>
      {values.map(v => (
        <button key={v} onClick={() => onChange(current === v ? 'All' : v)}
          className={`px-2.5 py-0.5 text-[11px] font-semibold border rounded-full transition-all ${current === v ? T.pillOn : T.pill}`}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`min-h-screen font-[system-ui,sans-serif] transition-colors duration-300 ${T.page}`}>
      {/* Ambient gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] bg-purple-600/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={`border-b sticky top-0 z-40 transition-colors duration-300 ${T.glass}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-xs">💡</div>
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">IdeaVault</span>
            <span className={`hidden md:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium ${T.glass} ${T.muted}`}>
              <I.Keyboard /> Press N
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Keyboard hint */}
            <button onClick={() => setShowAnalytics(!showAnalytics)} title="Analytics"
              className={`p-2 rounded-lg transition-all active:scale-95 ${T.toggle}`}><I.Bar /></button>
            <button onClick={() => exportCSV(ideas)} title="Export CSV"
              className={`p-2 rounded-lg transition-all active:scale-95 ${T.toggle}`}><I.Download /></button>
            <button onClick={() => setDark(!d)} title="Toggle theme"
              className={`p-2 rounded-lg transition-all active:scale-95 ${T.toggle}`}>{d ? <I.Sun /> : <I.Moon />}</button>
            <button onClick={() => { setShowForm(true); setFormError(''); setFormSuccess(false); }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              <I.Plus /> Submit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-10 py-10 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Ideas',   value: stats.total,   suffix: '',    emoji: '📊', grad: 'from-indigo-500/10 to-purple-500/10',  bord: d ? 'border-indigo-500/15' : 'border-indigo-100' },
            { label: 'Top Category',  value: stats.topCat,  suffix: '',    emoji: '🏆', grad: 'from-amber-500/10 to-yellow-500/10',   bord: d ? 'border-amber-500/15'  : 'border-amber-100' },
            { label: 'Avg Difficulty',value: stats.avgDiff, suffix: '/5',  emoji: '⚙️', grad: 'from-blue-500/8 to-cyan-500/8',       bord: d ? 'border-blue-500/15'   : 'border-blue-100' },
            { label: 'Avg Score',     value: stats.avgScore,suffix: ' pts',emoji: '⭐', grad: 'from-emerald-500/8 to-teal-500/8',    bord: d ? 'border-emerald-500/15': 'border-emerald-100' },
          ].map((s, i) => (
            <div key={i} className={`relative overflow-hidden border rounded-2xl p-4 md:p-5 ${T.glass} ${s.bord}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${s.grad}`} />
              <div className="relative">
                <span className="text-lg mb-2 block">{s.emoji}</span>
                <div className="text-2xl md:text-3xl font-black tracking-tight mb-0.5">{s.value}{s.suffix !== '' && s.value !== '—' ? s.suffix : ''}</div>
                <div className={`text-[11px] font-medium uppercase tracking-wider ${T.muted}`}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Panel */}
        {showAnalytics && analytics.length > 0 && (
          <div className={`border rounded-2xl p-6 transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${T.glass}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm uppercase tracking-widest text-indigo-400">📊 Ideas by Category</h3>
              <button onClick={() => setShowAnalytics(false)} className={`${T.muted} hover:text-red-400 transition-colors`}><I.X /></button>
            </div>
            <div className="space-y-2.5">
              {analytics.map(({ cat, count, pct, color }) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-20 shrink-0 ${T.sub}`}>{cat}</span>
                  <div className={`flex-1 h-5 rounded-lg overflow-hidden ${T.pbar}`}>
                    <div className="h-full rounded-lg transition-all duration-700 flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: color }}>
                      <span className="text-[10px] font-black text-white">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Banner */}
        {trending.length > 0 && (
          <div className={`border rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3 ${d ? 'bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/15' : 'bg-amber-50/80 border-amber-200'}`}>
            <span className={`text-sm font-bold text-amber-500 flex items-center gap-1.5 shrink-0`}>🔥 Hot</span>
            {trending.map(t => (
              <button key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${d ? 'bg-white/5 border-white/10 hover:border-amber-500/30 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700 hover:border-amber-300'}`}>
                <span style={{ color: STAGE_CFG[t.stage].dot }}>●</span>
                <span className="max-w-[110px] truncate">{t.title}</span>
                <span className="text-amber-500 flex items-center gap-0.5"><I.Up />{t.upvotes}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${T.muted}`}><I.Search /></span>
            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ideas… press / to focus"
              className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all ${T.inp}`} />
          </div>
          <div className={`flex border rounded-xl p-1 gap-0.5 transition-colors ${T.sortbox}`}>
            {(['newest', 'popular', 'trending'] as SortMode[]).map(s => (
              <button key={s} onClick={() => setSortBy(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${sortBy === s ? 'bg-indigo-600 text-white shadow-md' : T.muted}`}>
                {s === 'trending' ? '🔥' : s === 'popular' ? '⭐' : '🕐'} {s}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <PillFilter label="Category" values={CATEGORIES} current={filterCat} onChange={setFilterCat} />
          <div className="flex flex-wrap gap-2 items-center">
            <PillFilter label="Market"  values={MARKET_OPTIONS} current={filterMarket} onChange={setFilterMarket} />
            <PillFilter label="Stage"   values={STAGES}         current={filterStage}  onChange={setFilterStage} />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <PillFilter label="Difficulty" values={Object.entries(DIFFICULTY_LABELS).map(([k, v]) => `${k} – ${v}`)}
              current={filterDiff} onChange={v => setFilterDiff(v.split(' – ')[0])} />
            {anyFilter && (
              <button onClick={() => { setFilterCat('All'); setFilterDiff('All'); setFilterMarket('All'); setFilterStage('All'); setSearch(''); }}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-semibold transition-colors">
                <I.X /> Reset all
              </button>
            )}
          </div>
        </div>

        {/* Count row */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className={`text-sm ${T.muted}`}>
              <span className="font-bold text-white">{filtered.length}</span> of {ideas.length} ideas
            </p>
            {ideas.length > 0 && (
              <button onClick={() => exportCSV(filtered)} className={`text-xs flex items-center gap-1.5 ${T.muted} hover:text-emerald-400 transition-colors font-semibold`}>
                <I.Download /> Export {filtered.length} idea{filtered.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className={`border rounded-2xl h-52 animate-pulse ${T.skeleton}`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-28 ${T.muted}`}>
            <div className="text-6xl mb-5 opacity-30">💡</div>
            <p className="text-xl font-bold mb-1.5">No ideas match</p>
            <p className="text-sm">Clear filters or submit a brand-new idea!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((idea) => {
              const score = getScore(idea);
              const dc = DIFF_CFG[idea.difficulty];
              const mc = MKT_CFG[idea.market_potential];
              const sc = STAGE_CFG[idea.stage];
              const expanded = expandedId === idea.id;
              return (
                <div key={idea.id} onClick={() => setExpandedId(expanded ? null : idea.id)}
                  className={`group relative border rounded-2xl p-5 flex flex-col gap-3.5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${T.card}`}
                  style={{ boxShadow: expanded ? `0 0 0 1px rgba(99,102,241,.3), 0 8px 32px ${dc.glow}` : '', animation: 'fadeUp .3s ease-out both' }}>

                  {/* Stage + Category */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{sc.label}</span>
                      <span className={`text-[11px] font-bold ${sc.color}`}>{idea.stage}</span>
                      <span className={`text-[11px] ${T.muted}`}>· {idea.category}</span>
                    </div>
                    {/* Score badge */}
                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-0.5">
                      <I.Star />
                      <span className="text-xs font-black text-amber-400">{score}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-[15px] leading-snug">{idea.title}</h3>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed line-clamp-2 ${T.sub}`}>{idea.description}</p>

                  {/* Difficulty bar */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${T.muted}`}>Difficulty</span>
                      <span className={`text-[10px] font-bold ${dc.text}`}>{idea.difficulty}/5 · {DIFFICULTY_LABELS[idea.difficulty]}</span>
                    </div>
                    <div className={`h-1 rounded-full overflow-hidden ${T.pbar}`}>
                      <div className="h-full rounded-full" style={{ width: `${(idea.difficulty / 5) * 100}%`, backgroundColor: dc.bar, boxShadow: `0 0 6px ${dc.bar}` }} />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${mc.bg} ${mc.text}`}>📈 {idea.market_potential}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d ? 'bg-white/5 text-zinc-500' : 'bg-gray-100 text-zinc-500'}`}>💰 {idea.revenue_model}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d ? 'bg-white/5 text-zinc-500' : 'bg-gray-100 text-zinc-500'}`}>👥 {idea.target_audience.length > 20 ? idea.target_audience.slice(0,20)+'…' : idea.target_audience}</span>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className={`grid grid-cols-1 gap-2.5 text-xs border-t pt-3.5 ${T.divider} animate-in fade-in duration-200`}>
                      <div>
                        <p className={`font-bold uppercase tracking-wider text-[10px] mb-1 ${T.muted}`}>Problem</p>
                        <p className={T.sub}>{idea.problem_statement}</p>
                      </div>
                      <div>
                        <p className={`font-bold uppercase tracking-wider text-[10px] mb-1 ${T.muted}`}>Target Audience</p>
                        <p className={T.sub}>{idea.target_audience}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className={`flex items-center justify-between border-t pt-3 mt-auto ${T.divider}`}>
                    <span className={`text-[11px] ${T.muted}`}>{new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={e => copyLink(idea, e)}
                        className={`flex items-center gap-1 border text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${copiedId === idea.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : T.upvote}`}>
                        {copiedId === idea.id ? <><I.Check /> Copied</> : <><I.Copy /> Share</>}
                      </button>
                      <button onClick={e => handleUpvote(idea.id, idea.upvotes, e)}
                        className={`flex items-center gap-1 border text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
                        <I.Up /> {idea.upvotes > 0 ? idea.upvotes : 'Vote'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Submit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className={`relative border rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto transition-colors animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 ${T.modal}`}>
            {formSuccess ? (
              <div className="text-center py-16 animate-in zoom-in duration-300">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-black mb-2">Idea Submitted!</h2>
                <p className={T.muted}>Your startup idea is now live on the dashboard.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-black">New Startup Idea</h2>
                    <p className={`text-xs mt-0.5 ${T.muted}`}>All starred ( * ) fields are required</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className={`p-2 rounded-xl transition-all ${T.toggle}`}><I.X /></button>
                </div>
                {formError && <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{formError}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Startup Title *</label>
                    <input type="text" value={form.title} onChange={e => ff('title', e.target.value)} placeholder="e.g. AI-Powered Calorie Tracker" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Short Description *</label>
                      <textarea value={form.description} onChange={e => ff('description', e.target.value)} placeholder="What does your startup do?" rows={3} className={taCls} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Problem Statement *</label>
                      <textarea value={form.problem_statement} onChange={e => ff('problem_statement', e.target.value)} placeholder="What problem does this solve?" rows={3} className={taCls} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Target Audience *</label>
                    <input type="text" value={form.target_audience} onChange={e => ff('target_audience', e.target.value)} placeholder="e.g. College students, SMB owners" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Category', key: 'category', opts: CATEGORIES },
                      { label: 'Stage', key: 'stage', opts: STAGES },
                      { label: 'Revenue Model', key: 'revenue_model', opts: REVENUE_MODELS },
                    ].map(({ label, key, opts }) => (
                      <div key={key}>
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>{label}</label>
                        <select value={(form as any)[key]} onChange={e => ff(key, e.target.value)} className={selCls}>
                          {opts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Difficulty</label>
                      <select value={form.difficulty} onChange={e => ff('difficulty', parseInt(e.target.value))} className={selCls}>
                        {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${T.muted}`}>Market Potential</label>
                      <select value={form.market_potential} onChange={e => ff('market_potential', e.target.value as MarketPotential)} className={selCls}>
                        {MARKET_OPTIONS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl py-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-indigo-500/20 mt-1">
                    {submitting ? 'Submitting…' : '🚀 Submit Idea'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
