// src/components/Dashboard.jsx
import React, { useState } from 'react';

export default function Dashboard() {
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [metadata, setMetadata] = useState({});

  const platformsList = [
    { id: 'YOUTUBE_SHORTS', name: 'YouTube Shorts' },
    { id: 'YOUTUBE_LONG', name: 'YouTube Long-Form' },
    { id: 'TIKTOK', name: 'TikTok' },
    { id: 'INSTA_REELS', name: 'Instagram Reels' },
    { id: 'FB_REELS', name: 'Facebook Reels' },
    { id: 'THREADS', name: 'Threads' },
    { id: 'LINKEDIN', name: 'LinkedIn' }
  ];

  const handlePlatformToggle = (id) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Multi-Platform Video Scheduler</h1>
        
        {/* Profile Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Select Content Profile</label>
          <select className="w-full border p-2 rounded" onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">-- Select Channel Profile --</option>
            <option value="prof-1">Coding Tutorials Channel</option>
            <option value="prof-2">Personal Vlogs / Clips</option>
          </select>
        </div>

        {/* Platforms Visual Matrix */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Target Networks</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platformsList.map(p => (
              <div 
                key={p.id}
                onClick={() => handlePlatformToggle(p.id)}
                className={`p-3 border rounded text-center cursor-pointer font-medium transition ${
                  selectedPlatforms.includes(p.id) ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-gray-600'
                }`}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Metadata Fields */}
        {selectedPlatforms.map(platformId => (
          <div key={platformId} className="mb-4 p-4 border rounded bg-gray-50">
            <h3 className="font-bold text-gray-700 mb-2">Metadata for {platformId.replace('_', ' ')}</h3>
            <input 
              type="text" 
              placeholder="Custom Title..." 
              className="w-full border p-2 rounded mb-2"
              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], title: e.target.value}}))}
            />
            <textarea 
              placeholder="Custom Description / Hashtags..." 
              className="w-full border p-2 rounded"
              rows="3"
              onChange={(e) => setMetadata(prev => ({...prev, [platformId]: {...prev[platformId], desc: e.target.value}}))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
