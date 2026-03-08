import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="max-w-xl w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
          Vibeathon Ready 🚀
        </h1>
        <p className="text-zinc-400 text-lg">
          Your boilerplate is initialized and deployed! Start building your MVP here.
        </p>
      </div>
    </div>
  );
}
