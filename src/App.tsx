import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';

// --- Types ---
type MarketPotential = 'Low' | 'Medium' | 'High' | 'Very High';
type Idea = {
  id: string; title: string; description: string; problem_statement: string;
  category: string; difficulty: number; market_potential: MarketPotential;
  upvotes: number; created_at: string;
};

// --- Constants ---
const CATEGORIES = ['FinTech', 'HealthTech', 'EdTech', 'E-Commerce', 'AI/ML', 'SaaS', 'GreenTech', 'Social', 'Gaming', 'Other'];
const MARKET_OPTIONS: MarketPotential[] = ['Low', 'Medium', 'High', 'Very High'];
const DIFFICULTY_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Moderate', 3: 'Hard', 4: 'Very Hard', 5: 'Extremely Hard' };
const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  2: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  3: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  4: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  5: 'bg-red-500/10 text-red-500 border-red-500/20',
};
const MARKET_COLORS: Record<string, string> = {
  'Low': 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  'Medium': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'High': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Very High': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

// --- Icons ---
const SearchIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const UpvoteIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
const XIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
const FlameIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C9.5 6 6 7.5 6 12a6 6 0 0012 0c0-3-1.5-5.5-3-7a11.3 11.3 0 01-1 5C12.5 8.5 12 5 12 2z"/></svg>;
const SunIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const MoonIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const StarIcon = () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;

// Popularity score: upvotes×2 + marketWeight + (6 - difficulty)
const MARKET_WEIGHT: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4 };
function popularityScore(idea: Idea) { return idea.upvotes * 2 + (MARKET_WEIGHT[idea.market_potential] ?? 2) + (6 - idea.difficulty); }

export default function App() {
  const [dark, setDark] = useState(true);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ title: '', description: '', problem_statement: '', category: CATEGORIES[0], difficulty: 3, market_potential: 'High' as MarketPotential });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'trending'>('all');

  // Apply dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => { fetchIdeas(); }, []);

  async function fetchIdeas() {
    setLoading(true);
    const { data } = await supabase.from('startup_ideas').select('*').order('created_at', { ascending: false });
    if (data) setIdeas(data as Idea[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim() || !form.problem_statement.trim()) return setError('All fields are required.');
    if (ideas.some(i => i.title.toLowerCase() === form.title.toLowerCase().trim())) return setError('A startup idea with this title already exists.');
    setSubmitting(true);
    const { error: err } = await supabase.from('startup_ideas').insert([{ title: form.title.trim(), description: form.description.trim(), problem_statement: form.problem_statement.trim(), category: form.category, difficulty: form.difficulty, market_potential: form.market_potential }]);
    setSubmitting(false);
    if (err) return setError('Submission failed: ' + err.message);
    setSuccess('🎉 Idea submitted successfully!');
    setForm({ title: '', description: '', problem_statement: '', category: CATEGORIES[0], difficulty: 3, market_potential: 'High' });
    fetchIdeas();
    setTimeout(() => { setSuccess(''); setShowForm(false); }, 1500);
  }

  async function handleUpvote(id: string, current: number) {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, upvotes: current + 1 } : i));
    await supabase.from('startup_ideas').update({ upvotes: current + 1 }).eq('id', id);
  }

  const filtered = useMemo(() => {
    let list = activeTab === 'trending' ? [...ideas].sort((a, b) => b.upvotes - a.upvotes) : ideas;
    if (search.trim()) list = list.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'All') list = list.filter(i => i.category === filterCategory);
    if (filterDifficulty !== 'All') list = list.filter(i => i.difficulty === parseInt(filterDifficulty));
    if (filterMarket !== 'All') list = list.filter(i => i.market_potential === filterMarket);
    return list;
  }, [ideas, search, filterCategory, filterDifficulty, filterMarket, activeTab]);

  const stats = useMemo(() => {
    if (!ideas.length) return { total: 0, topCategory: 'N/A', avgDifficulty: '0.0' };
    const catCount: Record<string, number> = {};
    let diffSum = 0;
    ideas.forEach(i => { catCount[i.category] = (catCount[i.category] || 0) + 1; diffSum += i.difficulty; });
    return { total: ideas.length, topCategory: Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A', avgDifficulty: (diffSum / ideas.length).toFixed(1) };
  }, [ideas]);

  const trending = useMemo(() => [...ideas].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3), [ideas]);

  // --- Theme classes ---
  const t = {
    page:     dark ? 'bg-zinc-950 text-white'       : 'bg-gray-50 text-zinc-900',
    header:   dark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-gray-200',
    card:     dark ? 'bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/40' : 'bg-white border-gray-200 hover:border-indigo-400/60 shadow-sm',
    input:    dark ? 'bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-indigo-500/50 focus:border-indigo-500/50' : 'bg-white border-gray-300 text-zinc-900 placeholder:text-zinc-400 focus:ring-indigo-400/50 focus:border-indigo-400/50',
    select:   dark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600' : 'bg-white border-gray-300 text-zinc-700 hover:border-gray-400',
    statCard: dark ? 'bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/30' : 'bg-white border-gray-200 hover:border-indigo-400/40 shadow-sm',
    modalBg:  dark ? 'bg-zinc-900 border-zinc-700'  : 'bg-white border-gray-200 shadow-2xl',
    modalInput: dark ? 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus:ring-indigo-500/50 focus:border-indigo-500/50' : 'bg-gray-50 border-gray-300 text-zinc-900 placeholder:text-zinc-400 focus:ring-indigo-400/50 focus:border-indigo-400/50',
    cardBorder: dark ? 'border-zinc-800' : 'border-gray-200',
    subText:  dark ? 'text-zinc-400'    : 'text-zinc-500',
    tinierText: dark ? 'text-zinc-600'  : 'text-zinc-400',
    toggleBtn: dark ? 'bg-zinc-800 hover:bg-zinc-700 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-indigo-600',
    upvoteBtn: dark ? 'text-zinc-400 hover:text-indigo-400 bg-zinc-800 hover:bg-indigo-500/10 border-zinc-700 hover:border-indigo-500/50' : 'text-zinc-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 border-gray-200 hover:border-indigo-300',
    tabActive: 'bg-indigo-600 text-white',
    tabInactive: dark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900',
    tabContainer: dark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200',
    trendingBox: dark ? 'bg-gradient-to-r from-orange-500/5 to-red-500/5 border-orange-500/20' : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200',
    trendCard: dark ? 'bg-zinc-900/70 border-zinc-700 hover:border-orange-500/50' : 'bg-white border-gray-200 hover:border-orange-400 shadow-sm',
    emptyState: dark ? 'text-zinc-500' : 'text-zinc-400',
    skeletonCard: dark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-200 shadow-sm',
  };

  const inputClass = `w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all ${t.modalInput}`;
  const textareaClass = `w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all resize-none ${t.modalInput}`;
  const selectModalClass = `w-full border rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 transition-all cursor-pointer ${t.modalInput}`;

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500/30 transition-colors duration-300 ${t.page}`}>
      {/* Header */}
      <header className={`border-b backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300 ${t.header}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">💡 IdeaVault</h1>
            <p className={`text-xs hidden md:block ${t.subText}`}>Startup Idea Validator Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDark(!dark)}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2.5 rounded-xl font-medium transition-all active:scale-95 ${t.toggleBtn}`}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)] text-sm"
            >
              <PlusIcon /> Submit Idea
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">

        {/* Stats Panel */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Ideas', value: stats.total, icon: '📊' },
            { label: 'Top Category', value: stats.topCategory, icon: '🏆' },
            { label: 'Avg Difficulty', value: stats.avgDifficulty + ' / 5', icon: '⚙️' },
          ].map((s, i) => (
            <div key={i} className={`border rounded-2xl p-4 md:p-6 flex flex-col gap-1 transition-colors duration-300 ${t.statCard}`}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl md:text-3xl font-black mt-1">{s.value}</span>
              <span className={`text-xs md:text-sm font-medium ${t.subText}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Trending Section */}
        {trending.length > 0 && (
          <div className={`border rounded-2xl p-5 md:p-6 transition-colors duration-300 ${t.trendingBox}`}>
            <h2 className="flex items-center gap-2 text-orange-500 font-bold text-base mb-4">
              <FlameIcon /> Trending Ideas
            </h2>
            <div className="flex flex-wrap gap-3">
              {trending.map(tr => (
                <div key={tr.id} className={`flex items-center gap-2 border rounded-xl px-4 py-2 transition-all ${t.trendCard}`}>
                  <span className="font-semibold text-sm truncate max-w-[160px]">{tr.title}</span>
                  <span className="text-orange-500 text-xs font-bold flex items-center gap-1"><UpvoteIcon />{tr.upvotes}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${t.subText}`}><SearchIcon /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ideas by title, description, or category..."
              className={`w-full border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 transition-all ${t.input}`}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {[
              { value: filterCategory, onChange: setFilterCategory, opts: ['All Categories', ...CATEGORIES], allVal: 'All' },
            ].map((f, i) => (
              <select key={i} value={f.value} onChange={e => f.onChange(e.target.value)} className={`border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 cursor-pointer transition-colors ${t.select}`}>
                {f.opts.map(o => <option key={o} value={o === 'All Categories' ? 'All' : o}>{o}</option>)}
              </select>
            ))}
            <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className={`border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 cursor-pointer transition-colors ${t.select}`}>
              <option value="All">All Difficulties</option>
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}
            </select>
            <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className={`border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 cursor-pointer transition-colors ${t.select}`}>
              <option value="All">All Market Potentials</option>
              {MARKET_OPTIONS.map(m => <option key={m}>{m}</option>)}
            </select>
            {(filterCategory !== 'All' || filterDifficulty !== 'All' || filterMarket !== 'All' || search) && (
              <button onClick={() => { setFilterCategory('All'); setFilterDifficulty('All'); setFilterMarket('All'); setSearch(''); }} className={`text-xs flex items-center gap-1 transition-colors ${t.subText} hover:text-red-400`}>
                <XIcon /> Clear
              </button>
            )}
            <div className={`ml-auto flex border rounded-xl p-1 transition-colors ${t.tabContainer}`}>
              {(['all', 'trending'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? t.tabActive : t.tabInactive}`}>
                  {tab === 'trending' ? '🔥 Trending' : 'All Ideas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <div key={i} className={`border rounded-2xl p-6 h-52 animate-pulse ${t.skeletonCard}`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-24 ${t.emptyState}`}>
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">No ideas found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or submit a new idea!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(idea => (
              <div key={idea.id} className={`group border rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${t.card}`}
                style={{ animation: 'fadeInUp 0.4s ease-out both' }}
              >
                <div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{idea.category}</span>
                  <h3 className="text-lg font-bold mt-0.5 line-clamp-2 leading-snug">{idea.title}</h3>
                </div>
                <p className={`text-sm line-clamp-3 flex-1 ${t.subText}`}>{idea.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DIFFICULTY_COLORS[idea.difficulty]}`}>
                    ⚙️ {idea.difficulty} – {DIFFICULTY_LABELS[idea.difficulty]}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${MARKET_COLORS[idea.market_potential]}`}>
                    📈 {idea.market_potential}
                  </span>
                </div>
                <div className={`flex items-center justify-between border-t pt-4 ${t.cardBorder}`}>
                  <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                    <StarIcon />
                    <span>{popularityScore(idea)} pts</span>
                  </div>
                  <button onClick={() => handleUpvote(idea.id, idea.upvotes)} className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${t.upvoteBtn}`}>
                    <UpvoteIcon /> {idea.upvotes > 0 ? idea.upvotes : 'Upvote'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Submit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`relative border rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ${t.modalBg}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">Submit a Startup Idea</h2>
              <button onClick={() => setShowForm(false)} className={`transition-colors ${t.subText} hover:text-red-400`}><XIcon /></button>
            </div>
            {success && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 text-sm font-medium text-center">{success}</div>}
            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm font-medium">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Startup Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI-Powered Calorie Tracker" className={inputClass} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Short Description *</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does your startup do?" rows={2} className={textareaClass} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Problem Statement *</label>
                <textarea value={form.problem_statement} onChange={e => setForm({ ...form, problem_statement: e.target.value })} placeholder="What problem does it solve?" rows={2} className={textareaClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={selectModalClass}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: parseInt(e.target.value) })} className={selectModalClass}>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${t.subText}`}>Market</label>
                  <select value={form.market_potential} onChange={e => setForm({ ...form, market_potential: e.target.value as MarketPotential })} className={selectModalClass}>
                    {MARKET_OPTIONS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3.5 transition-all active:scale-95 disabled:opacity-50 mt-2">
                {submitting ? 'Submitting...' : '🚀 Submit Idea'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
