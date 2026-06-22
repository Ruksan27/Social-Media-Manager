import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, MonitorPlay, Video, Camera, Briefcase, Send, Sparkles, Link2, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

const ICONS = {
  YOUTUBE_SHORTS: <Video className="w-5 h-5 text-red-500" />,
  YOUTUBE_LONG: <MonitorPlay className="w-5 h-5 text-red-600" />,
  TIKTOK: <span className="font-bold text-lg leading-none">t</span>,
  INSTA_REELS: <Camera className="w-5 h-5 text-pink-500" />,
  FB_REELS: <span className="font-bold text-blue-600">f</span>,
  THREADS: <span className="font-bold text-gray-800">@</span>,
  LINKEDIN: <Briefcase className="w-5 h-5 text-blue-500" />
};

export default function Dashboard() {
  const { activeProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [linkedSessions, setLinkedSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('post'); // 'post' or 'accounts'

  const platformsList = [
    { id: 'YOUTUBE_SHORTS', name: 'YouTube Shorts' },
    { id: 'YOUTUBE_LONG', name: 'YouTube Long-Form' },
    { id: 'TIKTOK', name: 'TikTok' },
    { id: 'INSTA_REELS', name: 'Instagram Reels' },
    { id: 'FB_REELS', name: 'Facebook Reels' },
    { id: 'THREADS', name: 'Threads' },
    { id: 'LINKEDIN', name: 'LinkedIn' }
  ];

  useEffect(() => {
    if (activeProfile?.id) {
      fetchLinkedSessions();
    }
  }, [activeProfile]);

  const fetchLinkedSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/${activeProfile.id}`);
      setLinkedSessions(res.data.map(s => s.platform));
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const handleLinkPlatform = async (platformId) => {
    try {
      alert(`Opening a browser to login to ${platformId}. Please log in on the new window, then return here.`);
      await axios.get(`${API_BASE}/sessions/link/${activeProfile.id}/${platformId}`);
      setTimeout(fetchLinkedSessions, 30000);
    } catch (err) {
      console.error('Error triggering link', err);
    }
  };

  const handlePlatformToggle = (id) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-['Outfit'] relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none"></div>

      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-900/60 border-b border-slate-800/50 px-6 py-4 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-indigo-300 transition-colors">
                Nexus
              </h1>
            </div>
            
            <nav className="flex gap-6 ml-4">
              <button 
                onClick={() => setActiveTab('post')}
                className={`relative py-2 font-medium transition-colors duration-300 ${activeTab === 'post' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create Post
                {activeTab === 'post' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`relative py-2 font-medium transition-colors duration-300 ${activeTab === 'accounts' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Linked Accounts
                {activeTab === 'accounts' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></span>
                )}
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-2 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-slate-400">Profile:</span>
              <span className="text-sm font-semibold text-indigo-300">{activeProfile?.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all duration-300 group"
              title="Logout"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-6 relative z-10">
        {activeTab === 'post' && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Target Networks Selection */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-400" />
                  Target Networks
                </h2>
                <div className="flex flex-col gap-3">
                  {platformsList.map(p => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    const isLinked = linkedSessions.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => isLinked && handlePlatformToggle(p.id)}
                        disabled={!isLinked}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 transform ${
                          !isLinked ? 'opacity-40 cursor-not-allowed bg-slate-950/50 border-slate-800' :
                          isSelected 
                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]' 
                            : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600 hover:scale-[1.01]'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner ${
                          isSelected ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-800/80'
                        }`}>
                          {ICONS[p.id]}
                        </div>
                        <span className={`font-medium text-left flex-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {p.name}
                        </span>
                        {!isLinked && <span className="text-xs font-medium px-2 py-1 bg-slate-800 rounded-md text-slate-500">Unlinked</span>}
                        {isLinked && isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Metadata Configuration */}
            <div className="lg:col-span-8 space-y-6">
              {selectedPlatforms.length === 0 ? (
                <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-3xl bg-slate-900/20 text-slate-500 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
                    <Send className="w-10 h-10 opacity-40" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-300 mb-2">No Networks Selected</h3>
                  <p className="text-slate-500">Select one or more linked networks from the left to configure your post.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedPlatforms.map(platformId => {
                    const platform = platformsList.find(p => p.id === platformId);
                    return (
                      <div key={platformId} className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl group hover:border-indigo-500/40 transition-all duration-500 animate-in slide-in-from-right-8">
                        <div className="flex items-center gap-4 mb-8 pb-5 border-b border-slate-800">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg">
                            {ICONS[platformId]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-xl text-white">
                              {platform.name}
                            </h3>
                            <p className="text-sm text-slate-400">Configure post metadata specifically for this platform.</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="group/input">
                            <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within/input:text-indigo-400">Post Title</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-5 py-3.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                              placeholder="Enter a catchy title..."
                              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], title: e.target.value}}))}
                            />
                          </div>
                          <div className="group/input">
                            <label className="block text-sm font-medium text-slate-400 mb-2 transition-colors group-focus-within/input:text-indigo-400">Description / Caption</label>
                            <textarea 
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-5 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all shadow-inner"
                              rows="4"
                              placeholder="Write your caption here... #hashtags"
                              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], desc: e.target.value}}))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-6 sticky bottom-6 z-20">
                    <button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium px-10 py-4 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:-translate-y-1 transition-all flex items-center gap-3 group cursor-pointer">
                      <span className="text-lg">Schedule All Posts</span>
                      <Send className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-10 shadow-2xl max-w-5xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Linked Social Accounts</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">Connect your social media profiles to Nexus to automate cross-platform posting seamlessly.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {platformsList.map(p => {
                  const isLinked = linkedSessions.includes(p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-5 bg-slate-950/40 border border-slate-800 rounded-2xl hover:border-slate-600 transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-slate-800/80 flex items-center justify-center shadow-inner group-hover:bg-slate-800 transition-colors">
                          {ICONS[p.id]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-slate-200">{p.name}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isLinked ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></div>
                            <p className={`text-sm ${isLinked ? 'text-green-400' : 'text-slate-500'}`}>
                              {isLinked ? 'Connected Active' : 'Not Connected'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {isLinked ? (
                        <div className="p-3 text-green-400 bg-green-400/10 rounded-xl border border-green-400/20">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleLinkPlatform(p.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-all duration-300 border border-slate-700 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                        >
                          <Link2 className="w-4 h-4" />
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
