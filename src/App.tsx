import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// --- Types & Constants ---
type User = { id: string; email: string; };
type Link = { id: string; original_url: string; short_code: string; clicks: number; click_limit: number | null; is_active: boolean; created_at: string; last_accessed_at: string | null; user_id: string; };
type ChatMessage = { role: 'user' | 'assistant'; content: string; };

const KNOWLEDGE_BASE = [
  { topic: "Company Overview", text: "TapNex is an event technology platform that provides NFC-based payment systems and event infrastructure for events such as college fests, concerts, exhibitions, and conferences. TapNex enables cashless transactions at events using NFC cards or wristbands. Attendees can recharge their cards and use them to make payments at stalls or outlets during the event. The system helps organizers manage payments, access control, ticketing, and event operations efficiently." },
  { topic: "NFC Payment System", text: "TapNex allows attendees to make payments using NFC cards or wristbands. Users simply tap their card at a payment device installed at event stalls to complete a transaction instantly. This system eliminates the need for cash transactions at the event." },
  { topic: "Card Recharge System", text: "Users must recharge their NFC cards before making purchases. Recharge is done at top-up counters located inside the event venue. Supported recharge methods include: Cash, UPI. Once recharged, the card balance can be used for purchases across all participating outlets." },
  { topic: "Event Technology Services", text: "In addition to payments, TapNex provides several event management tools, including: Ticketing systems, Entry and exit management, Stall management, Volunteer management, Payment analytics for organizers. These tools help organizers manage events efficiently." },
  { topic: "Sponsor Branding", text: "TapNex provides branding opportunities for event sponsors. Examples include: Sponsor-branded recharge counters, Sponsor-branded NFC cards. For example, a recharge counter may be branded as: 'Zomato Recharge Zone'. This helps sponsors gain visibility during events." },
  { topic: "Refund Policy", text: "TapNex NFC cards do not allow refunds or balance transfers after the event ends. Any unused balance remaining on the card cannot be withdrawn or transferred after the event." },
  { topic: "Event Usage Example", text: "At a typical event: 1. Attendees receive an NFC card or wristband. 2. They recharge their card at a recharge counter. 3. They tap their card at stalls to make purchases. 4. Vendors receive payments through the TapNex system. This enables faster and cashless transactions across the event." }
];

// --- RAG Retrieval Logic ---
function retrieveContext(query: string) {
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 2);
  if (queryWords.length === 0) return KNOWLEDGE_BASE.map(k => k.text).join('\n---\n');

  const scoredDocs = KNOWLEDGE_BASE.map(doc => {
    let score = 0;
    const docDesc = doc.text.toLowerCase();
    queryWords.forEach(word => { if (docDesc.includes(word)) score += 1; });
    return { ...doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  const topChunks = scoredDocs.slice(0, 3).filter(s => s.score > 0);

  // If nothing directly matched, fallback to the full KB so LLM can read and decline properly
  if (topChunks.length === 0) return KNOWLEDGE_BASE.map(k => k.text).join('\n---\n');
  return topChunks.map(c => c.text).join('\n---\n');
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState('');
  const [clickLimit, setClickLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [editLinkId, setEditLinkId] = useState<string | null>(null);
  const [editUrlText, setEditUrlText] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState('');

  // Floating Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = window.location.pathname.replace('/', '');
    if (path && path.length > 0) {
      handleRedirect(path);
    } else {
      const storedUserId = localStorage.getItem('vibelink_user_id');
      const storedEmail = localStorage.getItem('vibelink_user_email');
      if (storedUserId) setUser({ id: storedUserId, email: storedEmail || '' });
    }
  }, []);

  useEffect(() => {
    if (user && !redirecting && !redirectError) fetchLinks();
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    if (!isLogin) {
      const { data, error } = await supabase.from('app_users').insert([{ email: authEmail, password: authPassword }]).select().single();
      if (error) alert('Error registering: ' + error.message);
      else if (data) loginUser(data.id, data.email);
    } else {
      const { data, error } = await supabase.from('app_users').select('*').eq('email', authEmail).eq('password', authPassword).single();
      if (error || !data) alert('Invalid email or password');
      else loginUser(data.id, data.email);
    }
    setAuthLoading(false);
  }

  function loginUser(id: string, email: string) {
    localStorage.setItem('vibelink_user_id', id);
    localStorage.setItem('vibelink_user_email', email);
    setUser({ id, email });
  }

  function logout() {
    localStorage.removeItem('vibelink_user_id');
    localStorage.removeItem('vibelink_user_email');
    setUser(null);
    setLinks([]);
    setAuthEmail('');
    setAuthPassword('');
  }

  async function fetchLinks() {
    if (!user) return;
    const { data, error } = await supabase.from('links').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) console.error(error);
    if (data) setLinks(data);
  }

  async function handleRedirect(shortCode: string) {
    setRedirecting(true);
    const { data } = await supabase.from('links').select('*').eq('short_code', shortCode).single();
    if (data) {
      if (!data.is_active) return (setRedirecting(false), setRedirectError('This link is currently disabled or inactive.'));
      if (data.click_limit !== null && data.clicks >= data.click_limit) return (setRedirecting(false), setRedirectError('This link has expired (click limit reached).'));
      await supabase.from('links').update({ clicks: data.clicks + 1, last_accessed_at: new Date().toISOString() }).eq('id', data.id);
      window.location.href = data.original_url;
    } else {
      setRedirecting(false);
      setRedirectError('Short link not found.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !user) return;
    let validUrl = url;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) validUrl = 'https://' + validUrl;
    try { new URL(validUrl); } catch (_) { return alert('Please enter a valid URL.'); }

    setLoading(true);
    const shortCode = Math.random().toString(36).substring(2, 7);
    const { error } = await supabase.from('links').insert([{ original_url: validUrl, short_code: shortCode, click_limit: clickLimit ? parseInt(clickLimit) : null, user_id: user.id }]);
    setLoading(false);

    if (error) alert('Error creating link');
    else { setUrl(''); setClickLimit(''); fetchLinks(); }
  }

  async function toggleLinkStatus(id: string, currentStatus: boolean) {
    await supabase.from('links').update({ is_active: !currentStatus }).eq('id', id);
    fetchLinks();
  }

  async function updateDestination(id: string) {
    let validUrl = editUrlText;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) validUrl = 'https://' + validUrl;
    try { new URL(validUrl); } catch (_) { return alert('Invalid URL.'); }
    await supabase.from('links').update({ original_url: validUrl }).eq('id', id);
    setEditLinkId(null);
    fetchLinks();
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // AI Chat Handler
  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const retrievedContext = retrieveContext(userMessage);

      // Build strictly enforced prompt
      const systemPrompt = `You are an AI customer support agent for TapNex. 
You MUST use ONLY the following knowledge base context to answer the user's questions. 

Context:
${retrievedContext}

CRITICAL RULE: If the user asks ANY question not explicitly covered in the context above (e.g. general knowledge, other companies, off-topic subjects like France, AI, Elon Musk), you MUST respond EXACTLY with this string: "I'm sorry, I couldn't find that information in the TapNex documentation." Do NOT invent or extrapolate answers.`;

      // Free blazing-fast llm invocation
      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        })
      });

      const textOutput = await res.text();
      setMessages(prev => [...prev, { role: 'assistant', content: textOutput }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred fetching the response." }]);
    }
    setChatLoading(false);
  }

  if (redirecting) return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
      <div className="animate-spin w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
      <h2 className="text-2xl font-bold animate-pulse text-indigo-400">Routing...</h2>
    </div>
  );

  if (redirectError) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans">
      <div className="text-center p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-lg text-zinc-300 mb-8">{redirectError}</p>
        <a href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors font-bold shadow-lg shadow-indigo-500/20">Return Home</a>
      </div>
    </div>
  );

  const authScreen = (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl animate-in fade-in">
        <h1 className="text-5xl font-black text-center mb-2 bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">VibeLink</h1>
        <p className="text-center text-zinc-400 mb-8">Lightning fast link management.</p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-600" />
          <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-600" />
          <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3 mt-2 transition-all active:scale-95 disabled:opacity-50">
            {authLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>
        <p className="mt-6 text-center text-zinc-400 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">{isLogin ? 'Register here' : 'Login here'}</button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {!user ? authScreen : (
        <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded-2xl backdrop-blur-md">
            <h1 className="text-3xl tracking-tight font-black bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">VibeLink</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-zinc-400 truncate max-w-[150px]">{user.email}</span>
              <button onClick={logout} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all active:scale-95">Logout</button>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste long URL..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm md:text-base" required />
              <input type="number" value={clickLimit} onChange={(e) => setClickLimit(e.target.value)} placeholder="Max limit (opt)" className="w-full md:w-40 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm md:text-base" min="1" />
              <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-8 py-4 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm md:text-base">{loading ? 'Creating...' : 'Shorten ⚡️'}</button>
            </form>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight px-2">Your Links Dashboard</h2>
            <div className="grid gap-4">
              {links.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl">No links active.</div>
              ) : links.map((link) => (
                <div key={link.id} className={`bg-zinc-900/30 border ${link.is_active ? 'border-zinc-800' : 'border-red-900/30 bg-red-900/5'} p-5 md:p-6 rounded-2xl flex flex-col gap-5 transition-all`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <a href={`/${link.short_code}`} className={`text-xl font-bold ${link.is_active ? 'text-indigo-400 hover:text-indigo-300' : 'text-zinc-500 line-through pointer-events-none'}`} target="_blank" rel="noreferrer">{window.location.origin}/{link.short_code}</a>
                        {!link.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Disabled</span>}
                        {link.click_limit !== null && link.clicks >= link.click_limit && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Expired</span>}
                      </div>
                      {editLinkId === link.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input type="text" value={editUrlText} onChange={e => setEditUrlText(e.target.value)} className="text-sm bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:border-indigo-500" autoFocus />
                          <button onClick={() => updateDestination(link.id)} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-bold">Save</button>
                          <button onClick={() => setEditLinkId(null)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-zinc-500 truncate mt-1">{link.original_url}</div>
                          <button onClick={() => { setEditLinkId(link.id); setEditUrlText(link.original_url); }} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 opacity-80">✎ Edit</button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 border-t border-zinc-800 md:border-t-0 pt-4 md:pt-0 shrink-0">
                      <div className="flex flex-col items-center p-2 bg-zinc-950/50 rounded-xl border border-zinc-800 min-w-[80px]">
                        <div className="text-xl font-black">{link.clicks} <span className="text-sm font-normal text-zinc-500">/ {link.click_limit ?? '∞'}</span></div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Clicks</div>
                      </div>
                      <button onClick={() => toggleLinkStatus(link.id, link.is_active)} className={`text-xs px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${link.is_active ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]'}`}>
                        {link.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600 border-t border-zinc-800/50 pt-3">
                    <span className="flex items-center gap-1"><span className="font-medium text-zinc-500">Created:</span> {formatDate(link.created_at)}</span>
                    <span className="flex items-center gap-1"><span className="font-medium text-zinc-500">Last accessed:</span> {formatDate(link.last_accessed_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAPNEX AI SUPPORT WIDGET --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

        {chatOpen && (
          <div className="mb-4 w-[340px] h-[450px] bg-zinc-900 border border-zinc-700 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
              <div className="font-bold flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                TapNex AI Agent
              </div>
              <button onClick={() => setChatOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/80">
              <div className="bg-zinc-800 text-zinc-200 p-3 rounded-2xl rounded-tl-sm text-sm border border-zinc-700/50 shadow-sm float-left clear-both max-w-[85%]">
                Hi! What would you like to know about TapNex and our event technology?
              </div>

              {messages.map((m, idx) => (
                <div key={idx} className={`p-3 rounded-2xl text-sm clear-both max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm float-right' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/50 float-left'}`}>
                  {m.content}
                </div>
              ))}

              {chatLoading && (
                <div className="bg-zinc-800 text-zinc-200 p-3 rounded-2xl rounded-tl-sm text-sm border border-zinc-700/50 float-left clear-both animate-pulse">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1 clear-both" />
            </div>

            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about TapNex..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
              <button type="submit" disabled={chatLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center shrink-0">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all active:scale-95 flex items-center justify-center hover:-translate-y-1 group"
        >
          {chatOpen ? (
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>

    </div>
  );
}
