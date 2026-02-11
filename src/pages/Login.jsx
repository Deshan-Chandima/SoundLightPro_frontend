import React, { useState } from 'react';
import { LogIn, Package, ShieldCheck } from 'lucide-react';

const Login = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const sqlMode = localStorage.getItem('rental_sql_mode') !== 'false';

    try {
      if (sqlMode) {
        const { api } = await import('../services/apiService');
        const data = await api.login({ username, password });
        if (data.token) {
          localStorage.setItem('rental_auth_token', data.token);
        }
        onLogin(data);
      } else {
        // Fallback for Local Storage mode (still insecure but functional for local use)
        // Default admin
        if (username === 'akil' && password === 'eternals') {
          onLogin({
            id: 'admin-default',
            name: 'Akil',
            username: 'akil',
            email: 'admin@system.com',
            phone: '0000000000',
            role: 'admin'
          });
          return;
        }

        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
          onLogin(user);
        } else {
          setError('Invalid username or password');
        }
      }
    } catch (err) {
      console.error('Login Error:', err);
      console.error('Login Error:', err);
      setError(err.message || 'Login failed. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05051a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Vivid Mesh Gradients */}
      <div className="absolute -top-24 -left-24 w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[150px]"></div>
      <div className="absolute -bottom-24 -right-24 w-[40rem] h-[40rem] bg-rose-600/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse animation-delay-2000"></div>
      <div className="absolute top-1/4 right-1/4 w-[30rem] h-[30rem] bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-bounce duration-[10s]"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 animate-in slide-in-from-top duration-700">
          <div className="inline-flex items-center justify-center p-5 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-[2.5rem] mb-6 shadow-[0_0_50px_rgba(79,70,229,0.5)] border border-white/20">
            <Package className="w-14 h-14 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">SoundLight <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Pro</span></h1>
          <p className="text-indigo-300 mt-3 font-black uppercase tracking-[0.3em] text-xs opacity-70">Enterprise Rental Suite</p>
        </div>

        <div className="bg-white/95 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden p-8 sm:p-12 border border-white backdrop-blur-xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={120} className="text-indigo-900" />
          </div>
          <div className="flex items-center gap-5 mb-12 relative z-10">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Secure Access</h2>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Authentication Required</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:font-normal"
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:font-normal"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-2xl flex items-center gap-3 animate-shake">
                <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></div>
                <span className="font-bold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <LogIn className="w-6 h-6" />
              )}
              {loading ? 'Authenticating...' : 'Launch Dashboard'}
            </button>
          </form>
        </div>

        <p className="text-center text-indigo-400 text-sm mt-10 font-bold opacity-60">
          &copy; {new Date().getFullYear()} SoundLight Pro Enterprise
        </p>
      </div>
    </div>
  );
};

export default Login;

