import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Loader2, Sparkles, Key, ArrowRight } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Name and password are required');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const endpoint = isRegistering ? '/profiles/register' : '/profiles/login';
      const res = await axios.post(`${API_BASE}${endpoint}`, { name, password });
      
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-4 relative overflow-hidden font-['Outfit']">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/30 blur-[120px] mix-blend-screen pointer-events-none animate-blob animation-delay-2000"></div>
      <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-blue-500/20 blur-[100px] mix-blend-screen pointer-events-none animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full relative z-10 backdrop-blur-2xl bg-slate-900/40 border border-slate-700/50 p-10 rounded-3xl shadow-2xl transition-all duration-500 hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)] transform transition-transform hover:scale-110 duration-300">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-violet-300 tracking-tight">
            {isRegistering ? 'Create Profile' : 'Welcome Back'}
          </h1>
          <p className="text-slate-400 mt-3 text-lg">
            {isRegistering ? 'Join the next generation of creators' : 'Sign in to manage your empire'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="group">
            <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within:text-indigo-400">Profile Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-inner"
                placeholder="e.g. Gaming Channel"
              />
            </div>
          </div>
          <div className="group">
            <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within:text-indigo-400">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-inner"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center mt-8 group cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <span className="flex items-center text-lg">
                {isRegistering ? 'Register Now' : 'Sign In'}
                <ArrowRight className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors duration-300 cursor-pointer"
          >
            {isRegistering ? (
              <span>Already have a profile? <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">Login instead</span></span>
            ) : (
              <span>Don't have a profile? <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">Register here</span></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
