import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, MonitorPlay, Youtube, Instagram, Linkedin, Send, Sparkles, Link2, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

const ICONS = {
  YOUTUBE_SHORTS: <Youtube className="w-5 h-5 text-red-500" />,
  YOUTUBE_LONG: <MonitorPlay className="w-5 h-5 text-red-600" />,
  TIKTOK: <span className="font-bold text-lg leading-none">t</span>,
  INSTA_REELS: <Instagram className="w-5 h-5 text-pink-500" />,
  FB_REELS: <span className="font-bold text-blue-600">f</span>,
  THREADS: <span className="font-bold text-gray-800">@</span>,
  LINKEDIN: <Linkedin className="w-5 h-5 text-blue-500" />
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
      // Alert the user
      alert(`Opening a browser to login to ${platformId}. Please log in on the new window, then return here.`);
      await axios.get(`${API_BASE}/sessions/link/${activeProfile.id}/${platformId}`);
      // Re-fetch after a timeout assuming they logged in
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
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 mr-8">
                Nexus
              </h1>
            </div>
            
            <nav className="flex gap-4">
              <button 
                onClick={() => setActiveTab('post')}
                className={`font-medium pb-1 border-b-2 transition-colors ${activeTab === 'post' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Create Post
              </button>
              <button 
                onClick={() => setActiveTab('accounts')}
                className={`font-medium pb-1 border-b-2 transition-colors ${activeTab === 'accounts' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              >
                Linked Accounts
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm font-medium">
              <span className="text-slate-400 mr-2">Profile:</span>
              <span className="text-indigo-400">{activeProfile?.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        {activeTab === 'post' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Network Selection */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-600"></div>
                <h2 className="text-lg font-semibold mb-4 text-white">Target Networks</h2>
                <div className="flex flex-col gap-3">
                  {platformsList.map(p => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    const isLinked = linkedSessions.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => isLinked && handlePlatformToggle(p.id)}
                        disabled={!isLinked}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                          !isLinked ? 'opacity-50 cursor-not-allowed bg-slate-800/20 border-slate-800' :
                          isSelected 
                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                            : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white' : 'bg-slate-700'
                        }`}>
                          {ICONS[p.id]}
                        </div>
                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {p.name}
                        </span>
                        {!isLinked && <span className="ml-auto text-xs text-slate-500">Unlinked</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Metadata Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPlatforms.length === 0 ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-2xl bg-slate-900/20 text-slate-500">
                  <Send className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a linked network to configure metadata.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {selectedPlatforms.map(platformId => {
                    const platform = platformsList.find(p => p.id === platformId);
                    return (
                      <div key={platformId} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl group hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                            {ICONS[platformId]}
                          </div>
                          <h3 className="font-semibold text-lg text-white">
                            Configure for {platform.name}
                          </h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], title: e.target.value}}))}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Description</label>
                            <textarea 
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                              rows="3"
                              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], desc: e.target.value}}))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-end pt-4">
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2">
                      Schedule All
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Linked Social Accounts</h2>
            <p className="text-slate-400 mb-8">Connect your social media platforms so Nexus can automate your postings.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {platformsList.map(p => {
                const isLinked = linkedSessions.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        {ICONS[p.id]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200">{p.name}</h3>
                        <p className={`text-xs ${isLinked ? 'text-green-400' : 'text-slate-500'}`}>
                          {isLinked ? 'Connected' : 'Not Connected'}
                        </p>
                      </div>
                    </div>
                    {isLinked ? (
                      <button className="p-2 text-green-400 bg-green-400/10 rounded-lg" disabled>
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleLinkPlatform(p.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
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
        )}
      </main>
    </div>
  );
}
