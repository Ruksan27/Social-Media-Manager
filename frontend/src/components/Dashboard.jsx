import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LogOut, MonitorPlay, Video, Camera, Briefcase, Send, Sparkles,
  Link2, CheckCircle2, Upload, Clock, Trash2, Pencil, X, Check,
  CalendarDays, AlertCircle, Loader2, Film, LayoutList, Users
} from 'lucide-react';

const API = 'http://localhost:3000/api';

// ── Platform config ────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'YOUTUBE_SHORTS',  name: 'YouTube Shorts',   color: 'text-red-500',   bg: 'bg-red-500/10',   border: 'border-red-500/30' },
  { id: 'YOUTUBE_LONG',    name: 'YouTube Long-Form', color: 'text-red-600',   bg: 'bg-red-600/10',   border: 'border-red-600/30' },
  { id: 'TIKTOK',          name: 'TikTok',            color: 'text-white',     bg: 'bg-slate-700/60', border: 'border-slate-600/30' },
  { id: 'INSTA_REELS',     name: 'Instagram Reels',   color: 'text-pink-500',  bg: 'bg-pink-500/10',  border: 'border-pink-500/30' },
  { id: 'FB_REELS',        name: 'Facebook Reels',    color: 'text-blue-500',  bg: 'bg-blue-500/10',  border: 'border-blue-500/30' },
  { id: 'THREADS',         name: 'Threads',           color: 'text-slate-200', bg: 'bg-slate-700/60', border: 'border-slate-600/30' },
  { id: 'LINKEDIN',        name: 'LinkedIn',          color: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/30' },
];

const PLATFORM_ICON = {
  YOUTUBE_SHORTS: <Video className="w-5 h-5" />,
  YOUTUBE_LONG:   <MonitorPlay className="w-5 h-5" />,
  TIKTOK:         <span className="font-bold text-base leading-none">t</span>,
  INSTA_REELS:    <Camera className="w-5 h-5" />,
  FB_REELS:       <span className="font-bold text-base">f</span>,
  THREADS:        <span className="font-bold text-base">@</span>,
  LINKEDIN:       <Briefcase className="w-5 h-5" />,
};

const STATUS_BADGE = {
  PENDING:    { label: 'Scheduled',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  PROCESSING: { label: 'Uploading',  cls: 'bg-blue-500/15  text-blue-400  border-blue-500/30' },
  SUCCESS:    { label: 'Live',       cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
  FAILED:     { label: 'Failed',     cls: 'bg-red-500/15   text-red-400   border-red-500/30' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toDatetimeLocal = (d) => new Date(d).toISOString().slice(0, 16);
const platformLabel = (id) => PLATFORMS.find(p => p.id === id)?.name ?? id;
const platformCfg   = (id) => PLATFORMS.find(p => p.id === id) ?? PLATFORMS[0];

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { activeProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('create');                // create | schedule | accounts
  const [linkedSessions, setLinkedSessions] = useState([]); // array of platform ids
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // ── Create-post state ──────────────────────────────────────────────────────
  const [videoFile, setVideoFile]       = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [dragOver, setDragOver]         = useState(false);
  const [selectedPlats, setSelectedPlats] = useState([]);
  const [metadata, setMetadata] = useState({}); // Stores per-platform title/desc/schedule
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createError, setCreateError]   = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const fileInputRef = useRef();

  // ── Edit-post state ────────────────────────────────────────────────────────
  const [editId, setEditId]           = useState(null);
  const [editTitle, setEditTitle]     = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editDate, setEditDate]       = useState('');
  const [savingEdit, setSavingEdit]   = useState(false);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeProfile?.id) {
      fetchSessions();
      fetchPosts();
    }
  }, [activeProfile]);

  const fetchSessions = async () => {
    try {
      const r = await axios.get(`${API}/sessions/${activeProfile.id}`);
      setLinkedSessions(r.data.map(s => s.platform));
    } catch { /* ignore */ }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const r = await axios.get(`${API}/posts/${activeProfile.id}`);
      setPosts(r.data);
    } catch { /* ignore */ }
    finally { setLoadingPosts(false); }
  };

  // ── Video file handling ────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setCreateError('');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Toggle platform selection ──────────────────────────────────────────────
  const togglePlatform = (id) => {
    if (!linkedSessions.includes(id)) return;
    setSelectedPlats(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // ── Submit post ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setCreateError(''); setCreateSuccess('');
    if (!videoFile)           return setCreateError('Please select a video file.');
    if (!selectedPlats.length) return setCreateError('Select at least one platform.');
    
    // Validate that every selected platform has a schedule date
    for (const pid of selectedPlats) {
      const data = metadata[pid];
      if (!data?.scheduleAt) return setCreateError(`Set a schedule date & time for ${platformLabel(pid)}.`);
      if (new Date(data.scheduleAt) <= new Date()) return setCreateError(`Schedule time for ${platformLabel(pid)} must be in the future.`);
    }

    setUploading(true); setUploadProgress(0);

    try {
      // 1. Get Cloudinary signed upload params
      const { data: sigData } = await axios.get(`${API}/upload/signature`);

      // 2. Upload to Cloudinary directly (client-side)
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('signature', sigData.signature);
      formData.append('timestamp', sigData.timestamp);
      formData.append('api_key', sigData.apiKey);
      formData.append('folder', 'auto_uploader_videos');
      formData.append('resource_type', 'video');

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`,
        formData,
        { onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)) }
      );
      const cloudinaryUrl = cloudRes.data.secure_url;

      // 3. Prepare platforms array for the new API format
      const platformsData = selectedPlats.map(pid => ({
        platform: pid,
        title: metadata[pid]?.title || '',
        description: metadata[pid]?.desc || '',
        scheduledAt: metadata[pid]?.scheduleAt,
      }));

      // 4. Save post to backend DB
      await axios.post(`${API}/posts`, {
        profileId: activeProfile.id,
        cloudinaryUrl,
        platformsData,
      });

      // 5. Reset form
      setCreateSuccess('🎉 Posts scheduled successfully!');
      removeVideo();
      setSelectedPlats([]); setMetadata({});
      fetchPosts();
      setTimeout(() => { setCreateSuccess(''); setTab('schedule'); }, 1800);

    } catch (err) {
      setCreateError(err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  // ── Copy to all platforms ──────────────────────────────────────────────────
  const copyToAll = (sourcePid) => {
    const sourceData = metadata[sourcePid] || {};
    const newMeta = { ...metadata };
    selectedPlats.forEach(pid => {
      if (pid !== sourcePid) {
        newMeta[pid] = {
          ...newMeta[pid],
          title: sourceData.title || '',
          desc: sourceData.desc || '',
          scheduleAt: sourceData.scheduleAt || ''
        };
      }
    });
    setMetadata(newMeta);
  };

  // ── Link platform ──────────────────────────────────────────────────────────
  const handleLink = async (pid) => {
    try {
      await axios.get(`${API}/sessions/link/${activeProfile.id}/${pid}`);
      alert(`Browser opened! Log in to ${platformLabel(pid)}, then return here. Session saves in 3 minutes.`);
      setTimeout(fetchSessions, 60000);
    } catch { alert('Could not open browser. Make sure backend is running.'); }
  };

  // ── Edit post ──────────────────────────────────────────────────────────────
  const startEdit = (post) => {
    setEditId(post.id);
    setEditTitle(post.title || '');
    setEditDesc(post.description || '');
    setEditDate(toDatetimeLocal(post.scheduledAt));
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await axios.patch(`${API}/posts/${editId}`, { title: editTitle, description: editDesc, scheduledAt: editDate });
      setEditId(null);
      fetchPosts();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally { setSavingEdit(false); }
  };

  const cancelEdit = () => setEditId(null);

  // ── Delete post ────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await axios.delete(`${API}/posts/${id}`);
      fetchPosts();
    } catch { alert('Failed to delete post.'); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c18] text-slate-200 font-['Outfit'] relative overflow-hidden">
      {/* Background glows */}
      <div className="fixed top-[-15%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-indigo-900/8 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-900/8 blur-[140px] pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#080c18]/80 border-b border-slate-800/60 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Nexus</span>
            </div>
            <nav className="flex gap-1">
              {[
                { id: 'create',   label: 'Create Post',      Icon: Film },
                { id: 'schedule', label: 'Schedule',         Icon: LayoutList },
                { id: 'accounts', label: 'Linked Accounts',  Icon: Users },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tab === id
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </nav>
          </div>
          {/* Profile + Logout */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-400">Profile:</span>
              <span className="text-xs font-semibold text-indigo-300">{activeProfile?.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* ══════════════════ TAB: CREATE POST ══════════════════ */}
        {tab === 'create' && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Left: Platform selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" /> Target Platforms
                </h2>
                <div className="space-y-2">
                  {PLATFORMS.map(p => {
                    const isLinked   = linkedSessions.includes(p.id);
                    const isSelected = selectedPlats.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        disabled={!isLinked}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                          !isLinked
                            ? 'opacity-35 cursor-not-allowed bg-slate-950/30 border-slate-800/50'
                            : isSelected
                              ? `${p.bg} ${p.border} border shadow-md`
                              : 'bg-slate-800/20 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/10' : 'bg-slate-800/80'} ${p.color}`}>
                          {PLATFORM_ICON[p.id]}
                        </div>
                        <span className={`text-sm font-medium flex-1 text-left ${isSelected ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                        {!isLinked && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">Unlinked</span>}
                        {isLinked && isSelected && <CheckCircle2 className={`w-4 h-4 ${p.color}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Upload + form */}
            <div className="lg:col-span-8 space-y-5">

              {/* Video drop zone */}
              <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" /> Upload Video
                </h2>
                {videoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700/50">
                    <video src={videoPreview} controls className="w-full max-h-60 object-contain bg-slate-950" />
                    <button
                      onClick={removeVideo}
                      className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-400/10 transition-all border border-slate-700/50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-slate-900/70 text-xs text-slate-400 truncate">{videoFile?.name}</div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 py-14 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                      dragOver ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center">
                      <Video className="w-7 h-7 text-indigo-400 opacity-70" />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-300 font-medium">Drag & drop your video here</p>
                      <p className="text-slate-500 text-sm mt-1">or click to browse — MP4, MOV, AVI, etc.</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
              </div>

              {/* Post Details */}
              {selectedPlats.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                  <LayoutList className="w-8 h-8 mb-3 opacity-50" />
                  Select one or more target platforms to configure post details.
                </div>
              ) : (
                selectedPlats.map(pid => {
                  const p = platformCfg(pid);
                  const data = metadata[pid] || {};
                  return (
                    <div key={pid} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className={`text-base font-semibold flex items-center gap-2 ${p.color}`}>
                          {PLATFORM_ICON[pid]} {p.name} Details
                        </h2>
                        {selectedPlats.length > 1 && (
                          <button 
                            onClick={() => copyToAll(pid)}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-all"
                            title="Copy this title, description and time to all other selected platforms"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Apply to All
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">Title <span className="text-slate-600">(optional)</span></label>
                        <input
                          type="text"
                          value={data.title || ''}
                          onChange={e => setMetadata(prev => ({...prev, [pid]: {...prev[pid], title: e.target.value}}))}
                          placeholder={`Enter title for ${p.name}...`}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">Description / Hashtags <span className="text-slate-600">(optional)</span></label>
                        <textarea
                          value={data.desc || ''}
                          onChange={e => setMetadata(prev => ({...prev, [pid]: {...prev[pid], desc: e.target.value}}))}
                          rows="3"
                          placeholder={`Caption and hashtags for ${p.name}...`}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Schedule Date & Time</label>
                        <input
                          type="datetime-local"
                          value={data.scheduleAt || ''}
                          onChange={e => setMetadata(prev => ({...prev, [pid]: {...prev[pid], scheduleAt: e.target.value}}))}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-sm [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Error / Success */}
              {createError && (
                <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{createError}
                </div>
              )}
              {createSuccess && (
                <div className="flex items-center gap-2 p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />{createSuccess}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to Cloudinary...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3.5 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Schedule Posts'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: SCHEDULE ══════════════════ */}
        {tab === 'schedule' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-indigo-400" /> Scheduled Posts
              </h2>
              <button onClick={fetchPosts} className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5">
                <Loader2 className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-24 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading posts...
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800/60 rounded-2xl text-slate-500">
                <CalendarDays className="w-12 h-12 mb-4 opacity-30" />
                <p className="font-medium text-slate-400">No posts scheduled yet</p>
                <p className="text-sm mt-1">Go to Create Post tab to add your first post.</p>
                <button onClick={() => setTab('create')} className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all">
                  Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => {
                  const cfg  = platformCfg(post.platform);
                  const s    = STATUS_BADGE[post.status] ?? STATUS_BADGE.PENDING;
                  const editing = editId === post.id;
                  return (
                    <div key={post.id} className={`bg-slate-900/50 backdrop-blur-md border rounded-2xl p-5 transition-all duration-300 ${editing ? 'border-indigo-500/40' : 'border-slate-800/60 hover:border-slate-700/60'}`}>
                      {editing ? (
                        /* ── Edit mode ── */
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}>{PLATFORM_ICON[post.platform]}</div>
                            <span className="text-sm font-medium text-slate-300">{platformLabel(post.platform)}</span>
                            <span className="ml-auto text-xs text-indigo-400">Editing...</span>
                          </div>
                          <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Title"
                            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            rows="2"
                            placeholder="Description"
                            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                          />
                          <input
                            type="datetime-local"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:dark]"
                          />
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveEdit} disabled={savingEdit} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                            </button>
                            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── View mode ── */
                        <div className="flex items-start gap-4">
                          {/* Platform icon */}
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {PLATFORM_ICON[post.platform]}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-100 truncate">{post.title || <span className="text-slate-500 italic">No title</span>}</span>
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${s.cls}`}>{s.label}</span>
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{platformLabel(post.platform)}</span>
                            </div>
                            {post.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{post.description}</p>}
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3" /> {fmtDate(post.scheduledAt)}
                            </div>
                            {post.status === 'FAILED' && post.errorMessage && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                                <AlertCircle className="w-3 h-3" /> {post.errorMessage}
                              </div>
                            )}
                          </div>
                          {/* Video thumb */}
                          {post.cloudinaryUrl && (
                            <video src={post.cloudinaryUrl} className="w-20 h-14 rounded-xl object-cover border border-slate-700/50 shrink-0" muted />
                          )}
                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            {post.status === 'PENDING' && (
                              <button onClick={() => startEdit(post)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB: LINKED ACCOUNTS ══════════════════ */}
        {tab === 'accounts' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-8 max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Linked Social Accounts</h2>
                <p className="text-slate-400 text-sm">Connect your accounts to enable automated posting.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {PLATFORMS.map(p => {
                  const isLinked = linkedSessions.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${isLinked ? `${p.bg} ${p.border}` : 'bg-slate-950/30 border-slate-800/60'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLinked ? 'bg-white/10' : 'bg-slate-800/80'} ${p.color} shrink-0`}>
                        {PLATFORM_ICON[p.id]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 text-sm">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isLinked ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                          <p className={`text-xs ${isLinked ? 'text-green-400' : 'text-slate-500'}`}>{isLinked ? 'Connected' : 'Not Connected'}</p>
                        </div>
                      </div>
                      {isLinked ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      ) : (
                        <button
                          onClick={() => handleLink(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition-all duration-300 border border-slate-700 hover:border-indigo-500 shrink-0"
                        >
                          <Link2 className="w-3.5 h-3.5" /> Connect
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
