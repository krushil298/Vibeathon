import { useState, useEffect } from 'react';
import { supabase } from './supabase';

type Link = {
  id: string;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
};

export default function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Basic catch-all routing for shortcodes
    const path = window.location.pathname.replace('/', '');
    if (path && path.length > 0) {
      handleRedirect(path);
    } else {
      fetchLinks();
    }
  }, []);

  async function fetchLinks() {
    const { data, error } = await supabase
      .from('links')
      .select('*')
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
      await supabase
        .from('links')
        .update({ clicks: data.clicks + 1 })
        .eq('id', data.id);
      window.location.href = data.original_url;
    } else {
      setRedirecting(false);
      alert('Short link not found.');
      window.location.href = '/';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    // Auto-prepend https and perform basic URL validation
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
    // Generate simple 5-char code for speed
    const shortCode = Math.random().toString(36).substring(2, 7);

    const { error } = await supabase
      .from('links')
      .insert([
        { original_url: validUrl, short_code: shortCode }
      ]);

    setLoading(false);

    if (error) {
      alert('Error creating link');
    } else {
      setUrl('');
      fetchLinks();
    }
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <div className="animate-spin w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
        <h2 className="text-2xl font-bold tracking-wide animate-pulse text-indigo-400">Heading to your destination...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-indigo-400 to-purple-600 bg-clip-text text-transparent">
            VibeLink
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Lightning fast URL shortening with real-time analytics. Built for speed.
          </p>
        </div>

        {/* Action Panel */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your long URL here..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 shadow-inner"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl px-8 py-4 text-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center whitespace-nowrap shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            >
              {loading ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Shorten It ⚡️'
              )}
            </button>
          </form>
        </div>

        {/* Dashboard */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold tracking-tight">Your Links Dashboard</h2>
            <div className="text-sm px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full font-medium border border-indigo-500/20">
              Live Data
            </div>
          </div>

          <div className="grid gap-4">
            {links.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl">
                No links created yet. Paste a URL above to get started!
              </div>
            ) : (
              links.map((link) => (
                <div key={link.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row gap-6 md:items-center justify-between group hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <a
                        href={`/${link.short_code}`}
                        className="text-xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {window.location.origin}/{link.short_code}
                      </a>
                    </div>
                    <div className="text-sm text-zinc-500 truncate" title={link.original_url}>
                      {link.original_url}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-zinc-400 border-t border-zinc-800 md:border-t-0 pt-4 md:pt-0 shrink-0">
                    <div className="flex flex-col items-center md:items-end p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <div className="text-2xl font-black text-white">{link.clicks}</div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Clicks</div>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${link.short_code}`);
                        alert('Link copied to clipboard! 📋');
                      }}
                      className="p-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors md:ml-2 active:scale-95"
                      title="Copy Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </button>
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
