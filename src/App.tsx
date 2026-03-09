import { useState, useEffect } from 'react';
import { supabase } from './supabase';

type User = {
  id: string;
  email: string;
};

type Link = {
  id: string;
  original_url: string;
  short_code: string;
  clicks: number;
  click_limit: number | null;
  is_active: boolean;
  created_at: string;
  last_accessed_at: string | null;
  user_id: string;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App State
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState('');
  const [clickLimit, setClickLimit] = useState('');
  const [loading, setLoading] = useState(false);

  // Edit State
  const [editLinkId, setEditLinkId] = useState<string | null>(null);
  const [editUrlText, setEditUrlText] = useState('');

  // Routing State
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState('');

  useEffect(() => {
    // Basic catch-all routing for shortcodes
    const path = window.location.pathname.replace('/', '');
    if (path && path.length > 0) {
      handleRedirect(path);
    } else {
      const storedUserId = localStorage.getItem('vibelink_user_id');
      const storedEmail = localStorage.getItem('vibelink_user_email');
      if (storedUserId) {
        setUser({ id: storedUserId, email: storedEmail || '' });
      }
    }
  }, []);

  useEffect(() => {
    if (user && !redirecting && !redirectError) {
      fetchLinks();
    }
  }, [user]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);

    if (!isLogin) {
      const { data, error } = await supabase
        .from('app_users')
        .insert([{ email: authEmail, password: authPassword }])
        .select()
        .single();

      if (error) {
        alert('Error registering: ' + error.message);
      } else if (data) {
        loginUser(data.id, data.email);
      }
    } else {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', authEmail)
        .eq('password', authPassword)
        .single();

      if (error || !data) {
        alert('Invalid email or password');
      } else {
        loginUser(data.id, data.email);
      }
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
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    if (data) setLinks(data);
  }

  async function handleRedirect(shortCode: string) {
    setRedirecting(true);
    const { data } = await supabase
      .from('links')
      .select('*')
      .eq('short_code', shortCode)
      .single();

    if (data) {
      if (!data.is_active) {
        setRedirecting(false);
        setRedirectError('This link is currently disabled or inactive.');
        return;
      }
      if (data.click_limit !== null && data.clicks >= data.click_limit) {
        setRedirecting(false);
        setRedirectError('This link has expired (click limit reached).');
        return;
      }

      await supabase
        .from('links')
        .update({
          clicks: data.clicks + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id);
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
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch (_) {
      alert('Please enter a valid URL.');
      return;
    }

    setLoading(true);
    const shortCode = Math.random().toString(36).substring(2, 7);

    const { error } = await supabase
      .from('links')
      .insert([
        {
          original_url: validUrl,
          short_code: shortCode,
          click_limit: clickLimit ? parseInt(clickLimit) : null,
          user_id: user.id
        }
      ]);

    setLoading(false);

    if (error) {
      alert('Error creating link');
    } else {
      setUrl('');
      setClickLimit('');
      fetchLinks();
    }
  }

  async function toggleLinkStatus(id: string, currentStatus: boolean) {
    await supabase.from('links').update({ is_active: !currentStatus }).eq('id', id);
    fetchLinks();
  }

  async function updateDestination(id: string) {
    let validUrl = editUrlText;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch (_) {
      alert('Invalid URL.');
      return;
    }

    await supabase.from('links').update({ original_url: validUrl }).eq('id', id);
    setEditLinkId(null);
    fetchLinks();
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <div className="animate-spin w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
        <h2 className="text-2xl font-bold tracking-wide animate-pulse text-indigo-400">Routing...</h2>
      </div>
    );
  }

  if (redirectError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="text-center p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-lg text-zinc-300 mb-8">{redirectError}</p>
          <a href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors font-bold shadow-lg shadow-indigo-500/20">Return Home</a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
        <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-5xl font-black text-center mb-2 bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">
            VibeLink
          </h1>
          <p className="text-center text-zinc-400 mb-8">Lightning fast link management.</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-600"
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-3 mt-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {authLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Register')}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Navbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-4 border border-zinc-800 rounded-2xl backdrop-blur-md">
          <h1 className="text-3xl tracking-tight font-black bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">
            VibeLink
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-400">{user.email}</span>
            <button onClick={logout} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all active:scale-95">
              Logout
            </button>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste long URL..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 text-sm md:text-base"
              required
            />
            <input
              type="number"
              value={clickLimit}
              onChange={(e) => setClickLimit(e.target.value)}
              placeholder="Max limit (opt)"
              className="w-full md:w-40 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 text-sm md:text-base"
              min="1"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-8 py-4 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shadow-[0_0_20px_rgba(79,70,229,0.3)] text-sm md:text-base"
            >
              {loading ? 'Creating...' : 'Shorten ⚡️'}
            </button>
          </form>
        </div>

        {/* Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold tracking-tight">Your Links Dashboard</h2>
          </div>

          <div className="grid gap-4">
            {links.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl">
                No links management active yet. Create your first link above.
              </div>
            ) : (
              links.map((link) => (
                <div key={link.id} className={`bg-zinc-900/30 border ${link.is_active ? 'border-zinc-800' : 'border-red-900/30 opacity-60'} p-5 md:p-6 rounded-2xl flex flex-col gap-5 transition-all`}>

                  {/* Top Header of Card */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/${link.short_code}`}
                          className={`text-xl font-bold transition-colors ${link.is_active ? 'text-indigo-400 hover:text-indigo-300' : 'text-zinc-500 line-through pointer-events-none'}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {window.location.origin}/{link.short_code}
                        </a>
                        {!link.is_active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Disabled</span>}
                        {link.click_limit !== null && link.clicks >= link.click_limit &&
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Expired</span>
                        }
                      </div>

                      {/* Destination UI - Toggles to Input */}
                      {editLinkId === link.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={editUrlText}
                            onChange={e => setEditUrlText(e.target.value)}
                            className="text-sm bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          <button onClick={() => updateDestination(link.id)} className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-bold">Save</button>
                          <button onClick={() => setEditLinkId(null)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-zinc-500 truncate mt-1">
                            {link.original_url}
                          </div>
                          <button
                            onClick={() => { setEditLinkId(link.id); setEditUrlText(link.original_url); }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 opacity-80"
                          >
                            ✎ Edit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 border-t border-zinc-800 md:border-t-0 pt-4 md:pt-0 shrink-0">
                      <div className="flex flex-col items-center p-2 bg-zinc-950/50 rounded-xl border border-zinc-800 min-w-[80px]">
                        <div className="text-xl font-black">{link.clicks} <span className="text-sm font-normal text-zinc-500">/ {link.click_limit ?? '∞'}</span></div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Clicks</div>
                      </div>

                      <button
                        onClick={() => toggleLinkStatus(link.id, link.is_active)}
                        className={`text-xs px-4 py-3 rounded-xl font-bold transition-all active:scale-95 ${link.is_active ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]'}`}
                      >
                        {link.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600 border-t border-zinc-800/50 pt-3">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-zinc-500">Created:</span> {formatDate(link.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-zinc-500">Last accessed:</span> {formatDate(link.last_accessed_at)}
                    </span>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
