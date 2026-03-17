import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';

// --- Types ---
type MarketPotential = 'Low' | 'Medium' | 'High' | 'Very High';
type Stage = 'Concept' | 'Early Stage' | 'MVP' | 'Growth';
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
const DIFFICULTY_COLORS: Record<number, { bar: string; text: string; bg: string }> = {
  1: { bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  2: { bar: 'bg-blue-500',    text: 'text-blue-500',    bg: 'bg-blue-500/10' },
  3: { bar: 'bg-yellow-500',  text: 'text-yellow-500',  bg: 'bg-yellow-500/10' },
  4: { bar: 'bg-orange-500',  text: 'text-orange-500',  bg: 'bg-orange-500/10' },
  5: { bar: 'bg-red-500',     text: 'text-red-500',     bg: 'bg-red-500/10' },
};
const MARKET_CONFIG: Record<string, { color: string; bg: string }> = {
  'Low':      { color: 'text-zinc-400',   bg: 'bg-zinc-400/10' },
  'Medium':   { color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  'High':     { color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'Very High':{ color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
};
const STAGE_CONFIG: Record<Stage, { color: string; dot: string }> = {
  'Concept':     { color: 'text-zinc-400',   dot: 'bg-zinc-400' },
  'Early Stage': { color: 'text-amber-400',  dot: 'bg-amber-400' },
  'MVP':         { color: 'text-blue-400',   dot: 'bg-blue-400' },
  'Growth':      { color: 'text-emerald-400',dot: 'bg-emerald-400' },
};
const MARKET_WEIGHT: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
function getPopularityScore(idea: Idea) {
  return idea.upvotes * 2 + MARKET_WEIGHT[idea.market_potential] + (6 - idea.difficulty);
}

// --- Inline SVG Icons ---
const Icon = {
  Search:  () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  Plus:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  X:       () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Up:      () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>,
  Star:    () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Sun:     () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Moon:    () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Flame:   () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.5 6 6 7.5 6 12a6 6 0 0012 0c0-3-1.5-5.5-3-7a11.3 11.3 0 01-1 5C12.5 8.5 12 5 12 2z"/></svg>,
  Chart:   () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  Filter:  () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2"/></svg>,
};

export default function App() {
  const [dark, setDark] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', problem_statement: '', target_audience: '',
    revenue_model: REVENUE_MODELS[0], category: CATEGORIES[0],
    difficulty: 3, market_potential: 'High' as MarketPotential, stage: 'Concept' as Stage,
  });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDiff, setFilterDiff] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending'>('newest');

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { fetchIdeas(); }, []);

  async function fetchIdeas() {
    setLoading(true);
    const { data } = await supabase.from('startup_ideas').select('*').order('created_at', { ascending: false });
    if (data) setIdeas(data as Idea[]);
    setLoading(false);
  }

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.description.trim() || !form.problem_statement.trim() || !form.target_audience.trim())
      return setFormError('Please fill in all required fields.');
    if (ideas.some(i => i.title.toLowerCase() === form.title.toLowerCase().trim()))
      return setFormError('An idea with this title already exists.');
    setSubmitting(true);
    const { error } = await supabase.from('startup_ideas').insert([{ ...form, title: form.title.trim() }]);
    setSubmitting(false);
    if (error) return setFormError('Submission failed: ' + error.message);
    setFormSuccess('🎉 Idea submitted!');
    setForm({ title: '', description: '', problem_statement: '', target_audience: '', revenue_model: REVENUE_MODELS[0], category: CATEGORIES[0], difficulty: 3, market_potential: 'High', stage: 'Concept' });
    fetchIdeas();
    setTimeout(() => { setFormSuccess(''); setShowForm(false); }, 1400);
  }

  async function handleUpvote(id: string, cur: number, e: React.MouseEvent) {
    e.stopPropagation();
    setIdeas(p => p.map(i => i.id === id ? { ...i, upvotes: cur + 1 } : i));
    await supabase.from('startup_ideas').update({ upvotes: cur + 1 }).eq('id', id);
  }

  // Sort + filter
  const filtered = useMemo(() => {
    let list = [...ideas];
    if (sortBy === 'popular')  list = list.sort((a, b) => getPopularityScore(b) - getPopularityScore(a));
    if (sortBy === 'trending') list = list.sort((a, b) => b.upvotes - a.upvotes);
    if (search.trim()) list = list.filter(i => [i.title, i.description, i.category, i.target_audience].join(' ').toLowerCase().includes(search.toLowerCase()));
    if (filterCat    !== 'All') list = list.filter(i => i.category === filterCat);
    if (filterDiff   !== 'All') list = list.filter(i => i.difficulty === parseInt(filterDiff));
    if (filterMarket !== 'All') list = list.filter(i => i.market_potential === filterMarket);
    if (filterStage  !== 'All') list = list.filter(i => i.stage === filterStage);
    return list;
  }, [ideas, search, filterCat, filterDiff, filterMarket, filterStage, sortBy]);

  const stats = useMemo(() => {
    if (!ideas.length) return { total: 0, topCat: '—', avgDiff: '—', topScore: 0, avgScore: '—' };
    const catCount: Record<string, number> = {};
    let diffSum = 0, scoreSum = 0;
    ideas.forEach(i => { catCount[i.category] = (catCount[i.category] || 0) + 1; diffSum += i.difficulty; scoreSum += getPopularityScore(i); });
    return {
      total: ideas.length,
      topCat: Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
      avgDiff: (diffSum / ideas.length).toFixed(1),
      topScore: Math.max(...ideas.map(getPopularityScore)),
      avgScore: (scoreSum / ideas.length).toFixed(0),
    };
  }, [ideas]);

  const trending = useMemo(() => [...ideas].sort((a, b) => b.upvotes - a.upvotes).filter(i => i.upvotes > 0).slice(0, 3), [ideas]);
  const anyFilter = filterCat !== 'All' || filterDiff !== 'All' || filterMarket !== 'All' || filterStage !== 'All' || search;

  // Theme
  const d = dark;
  const T = {
    page:     d ? 'bg-[#0a0a0f] text-zinc-100'          : 'bg-slate-50 text-zinc-900',
    header:   d ? 'bg-[#0a0a0f]/90 border-white/5'       : 'bg-white/90 border-black/5',
    card:     d ? 'bg-zinc-900/40 border-white/8 hover:border-indigo-500/30 hover:bg-zinc-900/60' : 'bg-white border-gray-100 hover:border-indigo-300 shadow-sm hover:shadow-md',
    input:    d ? 'bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/60 focus:bg-white/8' : 'bg-white border-gray-200 text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400',
    select:   d ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700',
    statCard: d ? 'bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border-white/8' : 'bg-white border-gray-100 shadow-sm',
    modalBg:  d ? 'bg-zinc-900 border-white/10'           : 'bg-white border-gray-200 shadow-2xl',
    sub:      d ? 'text-zinc-400'    : 'text-zinc-500',
    muted:    d ? 'text-zinc-500'    : 'text-zinc-400',
    divider:  d ? 'border-white/8'   : 'border-gray-100',
    pill:     d ? 'bg-white/5 border-white/10 text-zinc-400 hover:border-indigo-500/40 hover:text-white' : 'bg-gray-100 border-transparent text-zinc-500 hover:border-indigo-300 hover:text-zinc-900',
    pillActive: 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20',
    toggle:   d ? 'bg-white/8 hover:bg-white/12 text-amber-300' : 'bg-gray-100 hover:bg-gray-200 text-indigo-600',
    upvote:   d ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:text-indigo-400' : 'bg-gray-50 border-gray-200 text-zinc-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600',
    progressBg: d ? 'bg-white/8' : 'bg-gray-100',
    skeleton: d ? 'bg-white/5 border-white/8' : 'bg-white border-gray-100 shadow-sm',
    trendBox: d ? 'bg-gradient-to-r from-amber-500/6 to-orange-500/6 border-amber-500/15' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200',
    trendChip:d ? 'bg-white/5 border-white/10 hover:border-amber-500/30 text-zinc-300' : 'bg-white border-gray-200 text-zinc-700 hover:border-amber-300 shadow-sm',
    sortBtn:  d ? 'bg-zinc-900/60 border-white/8 text-zinc-400'  : 'bg-white border-gray-200 text-zinc-500',
  };

  const inp = `w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-0 transition-all ${T.input}`;
  const ta  = `${inp} resize-none`;
  const sel = `${inp} cursor-pointer`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${T.page}`}>

      {/* Header */}
      <header className={`border-b backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300 ${T.header}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-sm">💡</div>
            <div>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">IdeaVault</span>
              <span className={`hidden md:inline ml-2 text-xs font-medium ${T.muted}`}>Startup Idea Validator</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!d)} className={`p-2 rounded-lg transition-all active:scale-95 ${T.toggle}`}>{d ? <Icon.Sun /> : <Icon.Moon />}</button>
            <button onClick={() => { setShowForm(true); setFormError(''); setFormSuccess(''); }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              <Icon.Plus /> Submit Idea
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-10 py-10 space-y-10">

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Ideas',     value: stats.total,     icon: '📊', accent: 'from-indigo-500/15 to-purple-500/15', border: d ? 'border-indigo-500/15' : 'border-indigo-100' },
            { label: 'Top Category',    value: stats.topCat,    icon: '🏆', accent: 'from-amber-500/10 to-yellow-500/10',  border: d ? 'border-amber-500/15'  : 'border-amber-100' },
            { label: 'Avg Difficulty',  value: stats.avgDiff !== '—' ? `${stats.avgDiff}/5` : '—', icon: '⚙️', accent: 'from-blue-500/10 to-cyan-500/10', border: d ? 'border-blue-500/15' : 'border-blue-100' },
            { label: 'Avg Popularity',  value: stats.avgScore !== '—' ? `${stats.avgScore} pts` : '—', icon: '⭐', accent: 'from-emerald-500/10 to-teal-500/10', border: d ? 'border-emerald-500/15' : 'border-emerald-100' },
          ].map((s, i) => (
            <div key={i} className={`relative overflow-hidden border rounded-2xl p-5 transition-all duration-300 ${T.statCard} ${s.border}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} rounded-2xl`} />
              <div className="relative">
                <span className="text-xl">{s.icon}</span>
                <div className="text-2xl md:text-3xl font-black mt-2 mb-0.5 tracking-tight">{s.value}</div>
                <div className={`text-xs font-medium ${T.muted}`}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trending Banner */}
        {trending.length > 0 && (
          <div className={`border rounded-2xl p-5 transition-colors duration-300 ${T.trendBox}`}>
            <div className={`flex items-center gap-2 text-amber-500 font-bold text-sm mb-3`}>
              <Icon.Flame /> Hot Right Now
            </div>
            <div className="flex flex-wrap gap-2">
              {trending.map(t => (
                <button key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className={`flex items-center gap-2.5 border rounded-xl px-3.5 py-2 transition-all text-sm ${T.trendChip}`}>
                  <span className={`w-2 h-2 rounded-full ${STAGE_CONFIG[t.stage].dot}`} />
                  <span className="font-semibold truncate max-w-[120px]">{t.title}</span>
                  <span className="flex items-center gap-1 text-amber-500 font-bold text-xs"><Icon.Up />{t.upvotes}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search + Sort Row */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${T.muted}`}><Icon.Search /></span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search across title, description, category, audience…"
                className={`w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all ${T.input}`} />
            </div>
            <div className={`flex border rounded-xl p-1 gap-1 transition-colors ${T.sortBtn}`}>
              {(['newest', 'popular', 'trending'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${sortBy === s ? 'bg-indigo-600 text-white shadow' : ''}`}>
                  {s === 'trending' ? '🔥' : s === 'popular' ? '⭐' : '🕐'} {s}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Category pills */}
            <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${T.muted}`}>Category:</span>
            {['All', ...CATEGORIES].map(c => c !== 'All' ? (
              <button key={c} onClick={() => setFilterCat(filterCat === c ? 'All' : c)}
                className={`px-3 py-1 text-xs font-semibold border rounded-full transition-all ${filterCat === c ? T.pillActive : T.pill}`}>
                {c}
              </button>
            ) : null)}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-xs font-bold uppercase tracking-wider mr-1 ${T.muted}`}>Market:</span>
            {MARKET_OPTIONS.map(m => (
              <button key={m} onClick={() => setFilterMarket(filterMarket === m ? 'All' : m)}
                className={`px-3 py-1 text-xs font-semibold border rounded-full transition-all ${filterMarket === m ? T.pillActive : T.pill}`}>
                {m}
              </button>
            ))}
            <span className={`text-xs font-bold uppercase tracking-wider ml-3 mr-1 ${T.muted}`}>Stage:</span>
            {STAGES.map(s => (
              <button key={s} onClick={() => setFilterStage(filterStage === s ? 'All' : s)}
                className={`px-3 py-1 text-xs font-semibold border rounded-full transition-all ${filterStage === s ? T.pillActive : T.pill}`}>
                {s}
              </button>
            ))}
            <span className={`text-xs font-bold uppercase tracking-wider ml-3 mr-1 ${T.muted}`}>Difficulty:</span>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setFilterDiff(filterDiff === k ? 'All' : k)}
                className={`px-3 py-1 text-xs font-semibold border rounded-full transition-all ${filterDiff === k ? T.pillActive : T.pill}`}>
                {k} – {v}
              </button>
            ))}
            {anyFilter && (
              <button onClick={() => { setFilterCat('All'); setFilterDiff('All'); setFilterMarket('All'); setFilterStage('All'); setSearch(''); }}
                className="ml-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors font-semibold">
                <Icon.X /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <div className={`text-sm ${T.muted}`}>
            Showing <span className="font-bold text-white">{filtered.length}</span> of {ideas.length} ideas
          </div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <div key={i} className={`border rounded-2xl h-56 animate-pulse ${T.skeleton}`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-28 ${T.muted}`}>
            <div className="text-6xl mb-5 opacity-40">💡</div>
            <p className="text-xl font-bold mb-2">No ideas match your filters</p>
            <p className="text-sm">Try adjusting your search or submit a new idea!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((idea) => {
              const score = getPopularityScore(idea);
              const dc = DIFFICULTY_COLORS[idea.difficulty];
              const mc = MARKET_CONFIG[idea.market_potential];
              const sc = STAGE_CONFIG[idea.stage];
              const expanded = expandedId === idea.id;
              return (
                <div key={idea.id}
                  onClick={() => setExpandedId(expanded ? null : idea.id)}
                  className={`group border rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${T.card}`}
                  style={{ animation: 'fadeUp .35s ease-out both' }}>

                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${sc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{idea.stage}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${T.muted}`}>{idea.category}</span>
                      </div>
                      <h3 className="font-bold text-base leading-snug line-clamp-2">{idea.title}</h3>
                    </div>
                    {/* Popularity Score */}
                    <div className="flex flex-col items-center bg-gradient-to-b from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1.5 shrink-0">
                      <Icon.Star />
                      <span className="text-amber-400 text-sm font-black leading-tight">{score}</span>
                      <span className="text-[9px] text-amber-500/70 font-medium">pts</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed line-clamp-2 ${T.sub}`}>{idea.description}</p>

                  {/* Difficulty Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${T.muted}`}>Difficulty</span>
                      <span className={`text-[11px] font-bold ${dc.text}`}>{idea.difficulty}/5 · {DIFFICULTY_LABELS[idea.difficulty]}</span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${T.progressBg}`}>
                      <div className={`h-full rounded-full transition-all ${dc.bar}`} style={{ width: `${(idea.difficulty / 5) * 100}%` }} />
                    </div>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${mc.bg} ${mc.color}`}>📈 {idea.market_potential}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${d ? 'bg-white/5 text-zinc-400' : 'bg-gray-100 text-zinc-500'}`}>💰 {idea.revenue_model}</span>
                  </div>

                  {/* Expanded: problem + audience */}
                  {expanded && (
                    <div className={`text-xs space-y-2 border-t pt-3 ${T.divider} animate-in fade-in duration-200`}>
                      <div><span className={`font-bold uppercase tracking-wider ${T.muted}`}>Problem</span><p className={`mt-0.5 ${T.sub}`}>{idea.problem_statement}</p></div>
                      <div><span className={`font-bold uppercase tracking-wider ${T.muted}`}>Target Audience</span><p className={`mt-0.5 ${T.sub}`}>{idea.target_audience}</p></div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className={`flex items-center justify-between border-t pt-3 mt-auto ${T.divider}`}>
                    <span className={`text-xs ${T.muted}`}>{new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <button onClick={e => handleUpvote(idea.id, idea.upvotes, e)}
                      className={`flex items-center gap-1 border text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${T.upvote}`}>
                      <Icon.Up /> {idea.upvotes > 0 ? idea.upvotes : 'Vote'}
                    </button>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <div className={`relative border rounded-t-3xl md:rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto transition-colors animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300 ${T.modalBg}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black">Submit a Startup Idea</h2>
                <p className={`text-sm mt-0.5 ${T.muted}`}>Fill in the details below. All starred fields are required.</p>
              </div>
              <button onClick={() => setShowForm(false)} className={`p-2 rounded-xl transition-all ${T.toggle}`}><Icon.X /></button>
            </div>

            {formSuccess && <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-semibold text-center">{formSuccess}</div>}
            {formError   && <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">{formError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1 */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Startup Title *</label>
                <input type="text" value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. AI-Powered Calorie Tracker" className={inp} />
              </div>
              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Short Description *</label>
                  <textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="What does your startup do?" rows={3} className={ta} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Problem Statement *</label>
                  <textarea value={form.problem_statement} onChange={e => f('problem_statement', e.target.value)} placeholder="What problem does this solve?" rows={3} className={ta} />
                </div>
              </div>
              {/* Row 3 */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Target Audience *</label>
                <input type="text" value={form.target_audience} onChange={e => f('target_audience', e.target.value)} placeholder="e.g. College students, Small business owners" className={inp} />
              </div>
              {/* Row 4: selects */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Category', key: 'category', opts: CATEGORIES },
                  { label: 'Stage', key: 'stage', opts: STAGES },
                  { label: 'Revenue Model', key: 'revenue_model', opts: REVENUE_MODELS },
                ].map(({ label, key, opts }) => (
                  <div key={key}>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>{label}</label>
                    <select value={(form as any)[key]} onChange={e => f(key, e.target.value)} className={sel}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Difficulty (1–5)</label>
                  <select value={form.difficulty} onChange={e => f('difficulty', parseInt(e.target.value))} className={sel}>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${T.muted}`}>Market Potential</label>
                  <select value={form.market_potential} onChange={e => f('market_potential', e.target.value as MarketPotential)} className={sel}>
                    {MARKET_OPTIONS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 mt-1 shadow-lg shadow-indigo-500/20">
                {submitting ? 'Submitting…' : '🚀 Submit Idea'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
