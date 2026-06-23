// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api';
import {
  LogOut, MonitorPlay, Video, Camera, Briefcase, Send, Sparkles,
  Link2, CheckCircle2, Upload, Clock, Trash2, Pencil, X, Check,
  CalendarDays, AlertCircle, Loader2, Film, LayoutList, Users,
  MessageCircle, UserCheck, UserPlus, ChevronDown, Search
} from 'lucide-react';

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

const ENGAGEMENT_PLATFORMS = PLATFORMS.filter(p => ['INSTA_REELS', 'TIKTOK'].includes(p.id));

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

const fmtDate = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toDatetimeLocal = (d) => new Date(d).toISOString().slice(0, 16);
const platformLabel = (id) => PLATFORMS.find(p => p.id === id)?.name ?? id;
const platformCfg   = (id) => PLATFORMS.find(p => p.id === id) ?? PLATFORMS[0];

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { activeProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('create');
  // linkedSessions stores full objects: { platform, updatedAt }
  const [linkedSessions, setLinkedSessions] = useState([]);
  const [linkingPid, setLinkingPid]   = useState(null);  // platform currently being linked
  const [linkNotice, setLinkNotice]   = useState('');    // in-UI status message
  const [showProfile, setShowProfile] = useState(false); // profile dropdown
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // ── Create-post state ──────────────────────────────────────────────────────
  const [videoFile, setVideoFile]       = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [dragOver, setDragOver]         = useState(false);
  const [selectedPlats, setSelectedPlats] = useState([]);
  const [metadata, setMetadata] = useState({});
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

  // ── Engagement state ───────────────────────────────────────────────────────
  const [engPlatform, setEngPlatform]       = useState('INSTA_REELS');
  const [engPostUrl, setEngPostUrl]         = useState('');
  const [engComment, setEngComment]         = useState('');
  const [engUsername, setEngUsername]       = useState('');
  const [engLoading, setEngLoading]         = useState(false);
  const [engResult, setEngResult]           = useState(null);
  const [engError, setEngError]             = useState('');
  const [engMode, setEngMode]               = useState('comment'); // comment | check | follow | auto-dm
  const [engKeyword, setEngKeyword]         = useState('');
  const [engReplyText, setEngReplyText]     = useState('');

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeProfile?.id) {
      fetchSessions();
      fetchPosts();
    }
  }, [activeProfile]);

  const fetchSessions = async () => {
    try {
      const r = await api.get(`/sessions/${activeProfile.id}`);
      // Keep full objects so we can show updatedAt per platform
      setLinkedSessions(r.data); // [{ platform, updatedAt }, ...]
    } catch { /* ignore */ }
  };

  // Helper: is a platform connected?
  const isLinked = (pid) => linkedSessions.some(s => s.platform === pid);
  const sessionFor = (pid) => linkedSessions.find(s => s.platform === pid);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const r = await api.get(`/posts/${activeProfile.id}`);
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

  const togglePlatform = (id) => {
    if (!isLinked(id)) return;
    setSelectedPlats(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // ── Submit post ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setCreateError(''); setCreateSuccess('');
    if (!videoFile)            return setCreateError('Please select a video file.');
    if (!selectedPlats.length) return setCreateError('Select at least one platform.');

    for (const pid of selectedPlats) {
      const data = metadata[pid];
      if (!data?.scheduleAt) return setCreateError(`Set a schedule date & time for ${platformLabel(pid)}.`);
      if (new Date(data.scheduleAt) <= new Date()) return setCreateError(`Schedule time for ${platformLabel(pid)} must be in the future.`);
    }

    setUploading(true); setUploadProgress(0);

    try {
      // 1. Get Cloudinary signed upload params
      const { data: sigData } = await api.get('/upload/signature');

      // 2. Upload directly to Cloudinary using RAW axios (not api instance)
      //    The api instance has withCredentials:true which causes CORS
      //    preflight failures with Cloudinary — that's the "network error at 50%"
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('signature', sigData.signature);
      formData.append('timestamp', sigData.timestamp);
      formData.append('api_key', sigData.apiKey);
      formData.append('folder', 'auto_uploader_videos');

      const cloudinaryUrl_endpoint = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`;

      // Retry upload up to 3 times with exponential backoff
      let cloudRes = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          cloudRes = await axios.post(cloudinaryUrl_endpoint, formData, {
            timeout: 0,                // no client-side timeout for large videos
            withCredentials: false,     // CRITICAL: Cloudinary doesn't accept credentials
            maxContentLength: Infinity, // allow large files
            maxBodyLength: Infinity,    // allow large files
            onUploadProgress: (e) => {
              if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
            },
          });
          break; // success — exit retry loop
        } catch (err) {
          lastErr = err;
          if (err.response) throw err; // Cloudinary returned a real error (4xx/5xx), don't retry
          if (attempt < 3) {
            const delay = 1000 * Math.pow(2, attempt);
            console.warn(`⏳ Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
            setUploadProgress(0);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      if (!cloudRes) throw lastErr || new Error('Upload failed after retries.');

      const cloudinaryUrl = cloudRes.data.secure_url;

      // 3. Save post to backend
      const platformsData = selectedPlats.map(pid => ({
        platform: pid,
        title: metadata[pid]?.title || '',
        description: metadata[pid]?.desc || '',
        scheduledAt: metadata[pid]?.scheduleAt,
      }));

      await api.post('/posts', { profileId: activeProfile.id, cloudinaryUrl, platformsData });

      setCreateSuccess('🎉 Posts scheduled successfully!');
      removeVideo();
      setSelectedPlats([]); setMetadata({});
      fetchPosts();
      setTimeout(() => { setCreateSuccess(''); setTab('schedule'); }, 1800);

    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Upload failed.';
      setCreateError(msg);
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  const copyToAll = (sourcePid) => {
    const sourceData = metadata[sourcePid] || {};
    const newMeta = { ...metadata };
    selectedPlats.forEach(pid => {
      if (pid !== sourcePid) {
        newMeta[pid] = { ...newMeta[pid], title: sourceData.title || '', desc: sourceData.desc || '', scheduleAt: sourceData.scheduleAt || '' };
      }
    });
    setMetadata(newMeta);
  };

  const handleLink = async (pid) => {
    try {
      setLinkingPid(pid);
      setLinkNotice(`🌐 Browser opened for ${platformLabel(pid)}. Log in — we'll detect it automatically and save your session.`);
      await api.get(`/sessions/link/${activeProfile.id}/${pid}`);

      // Poll every 10s — backend now detects login quickly so session saves faster
      const poll = setInterval(async () => {
        await fetchSessions();
        setLinkedSessions(prev => {
          if (prev.some(s => s.platform === pid)) {
            clearInterval(poll);
            setLinkingPid(null);
            setLinkNotice('✅ Login detected & session saved!');
            setTimeout(() => setLinkNotice(''), 3000);
          }
          return prev;
        });
      }, 10000);

      // Hard stop after 4 minutes regardless
      setTimeout(() => {
        clearInterval(poll);
        setLinkingPid(null);
        if (linkNotice.includes('Browser opened')) {
          setLinkNotice('');
        }
        fetchSessions();
      }, 4 * 60 * 1000);

    } catch {
      setLinkingPid(null);
      setLinkNotice('❌ Could not open browser. Make sure the backend is running.');
      setTimeout(() => setLinkNotice(''), 4000);
    }
  };

  const handleDisconnect = async (pid) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platformLabel(pid)} account?`)) return;
    try {
      setLinkNotice(`Disconnecting ${platformLabel(pid)}...`);
      await api.delete(`/sessions/${activeProfile.id}/${pid}`);
      setLinkNotice(`✅ Disconnected ${platformLabel(pid)} successfully.`);
      setTimeout(() => setLinkNotice(''), 3000);
      fetchSessions();
    } catch {
      setLinkNotice('❌ Failed to disconnect account.');
      setTimeout(() => setLinkNotice(''), 3000);
    }
  };

  const startEdit = (post) => {
    setEditId(post.id);
    setEditTitle(post.title || '');
    setEditDesc(post.description || '');
    setEditDate(toDatetimeLocal(post.scheduledAt));
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await api.patch(`/posts/${editId}`, { title: editTitle, description: editDesc, scheduledAt: editDate });
      setEditId(null);
      fetchPosts();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally { setSavingEdit(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      fetchPosts();
    } catch { alert('Failed to delete post.'); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Engagement handlers ────────────────────────────────────────────────────
  const handleEngagementSubmit = async () => {
    setEngError(''); setEngResult(null); setEngLoading(true);
    try {
      if (engMode === 'comment') {
        if (!engPostUrl.trim() || !engComment.trim()) {
          setEngError('Post URL and comment text are required.'); setEngLoading(false); return;
        }
        await api.post('/engagement/comment', { platform: engPlatform, postUrl: engPostUrl.trim(), commentText: engComment.trim() });
        setEngResult({ type: 'comment', message: '✅ Comment automation started! Check your backend logs.' });
        setEngPostUrl(''); setEngComment('');

      } else if (engMode === 'check') {
        if (!engUsername.trim()) { setEngError('Username is required.'); setEngLoading(false); return; }
        const res = await api.post('/engagement/check-follow', { platform: engPlatform, targetUsername: engUsername.trim() });
        setEngResult({ type: 'check', ...res.data });

      } else if (engMode === 'follow') {
        if (!engUsername.trim()) { setEngError('Username is required.'); setEngLoading(false); return; }
        const res = await api.post('/engagement/follow', { platform: engPlatform, targetUsername: engUsername.trim() });
        setEngResult({ type: 'follow', ...res.data });
      } else if (engMode === 'auto-dm') {
        if (!engPostUrl.trim() || !engKeyword.trim() || !engReplyText.trim()) {
          setEngError('Post URL, trigger keyword, and reply message are required.'); setEngLoading(false); return;
        }
        await api.post('/engagement/auto-dm', {
          platform: engPlatform,
          postUrl: engPostUrl.trim(),
          keyword: engKeyword.trim(),
          messageText: engReplyText.trim()
        });
        setEngResult({ type: 'auto-dm', message: '🚀 Auto-DM Comment Responder started in the background! Watch the backend logs.' });
        setEngPostUrl(''); setEngKeyword(''); setEngReplyText('');
      }
    } catch (err) {
      setEngError(err.response?.data?.error || err.message || 'Action failed.');
    } finally {
      setEngLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c18] text-slate-200 relative overflow-hidden">
      {/* Background glows */}
      <div className="fixed top-[-15%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-indigo-900/8 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[50vw] h-[50vw] rounded-full bg-violet-900/8 blur-[140px] pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#080c18]/80 border-b border-slate-800/60 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Nexus</span>
            </div>
            <nav className="flex gap-1">
              {[
                { id: 'create',     label: 'Create Post',     Icon: Film },
                { id: 'schedule',   label: 'Schedule',        Icon: LayoutList },
                { id: 'accounts',   label: 'Linked Accounts', Icon: Users },
                { id: 'engagement', label: 'Engagement',      Icon: MessageCircle },
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
          <div className="flex items-center gap-3 relative">
            {/* ── Profile info card ─────────────────────────────── */}
            <div className="relative">
              <button
                onClick={() => setShowProfile(v => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-700/50 hover:border-indigo-500/40 hover:bg-slate-800 transition-all duration-200 group"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-indigo-300 leading-tight">{activeProfile?.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight font-mono">{activeProfile?.id?.slice(0,12)}…</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown panel */}
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-800/60 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg">
                        <span className="text-white font-bold text-base">{activeProfile?.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">{activeProfile?.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-[11px] text-green-400">Active session</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile ID */}
                  <div className="px-5 py-3 border-b border-slate-800/40">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Profile ID</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(activeProfile?.id || ''); }}
                      className="flex items-center gap-2 w-full group/id hover:bg-slate-800/60 rounded-lg px-2 py-1.5 -mx-2 transition-all"
                      title="Click to copy"
                    >
                      <code className="text-xs text-indigo-300 font-mono flex-1 text-left break-all">{activeProfile?.id}</code>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-600 group-hover/id:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>

                  {/* Linked platforms summary */}
                  <div className="px-5 py-3 border-b border-slate-800/40">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Linked Platforms</p>
                      <span className="text-[11px] font-semibold text-indigo-300">{linkedSessions.length} / {PLATFORMS.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {PLATFORMS.map(p => {
                        const sess = sessionFor(p.id);
                        const linked = !!sess;
                        return (
                          <div key={p.id} className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${linked ? p.bg + ' ' + p.color : 'bg-slate-800 text-slate-600'}`}>
                              {PLATFORM_ICON[p.id]}
                            </div>
                            <span className={`text-xs flex-1 ${linked ? 'text-slate-300' : 'text-slate-600'}`}>{p.name}</span>
                            {linked ? (
                              <span className="text-[10px] text-green-400 font-medium truncate max-w-[100px]">{sess.username || '✓ Connected'}</span>
                            ) : (
                              <span className="text-[10px] text-slate-600">— Not linked</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 flex gap-2">
                    <button
                      onClick={() => { setTab('accounts'); setShowProfile(false); }}
                      className="flex-1 text-xs text-center py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all"
                    >
                      Manage Accounts
                    </button>
                    <button
                      onClick={() => { handleLogout(); setShowProfile(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keep standalone logout button too */}
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
                    const linked     = isLinked(p.id);
                    const isSelected = selectedPlats.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        disabled={!linked}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                          !linked
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
                        {!linked && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">Unlinked</span>}
                        {linked && isSelected && <CheckCircle2 className={`w-4 h-4 ${p.color}`} />}
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

              {uploading && (
                <div className="space-y-3 p-4 bg-slate-900/60 border border-indigo-500/20 rounded-xl">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-indigo-300 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Cloudinary...
                    </span>
                    <span className="text-white font-bold tabular-nums">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${uploadProgress}%`,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #8b5cf6, #6366f1)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {videoFile && `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`}
                    {uploadProgress > 0 && uploadProgress < 100 && ' — please keep this tab open'}
                  </p>
                </div>
              )}

              <style>{`
                @keyframes shimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>

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
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg} ${cfg.color}`}>{PLATFORM_ICON[post.platform]}</div>
                            <span className="text-sm font-medium text-slate-300">{platformLabel(post.platform)}</span>
                            <span className="ml-auto text-xs text-indigo-400">Editing...</span>
                          </div>
                          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows="2" placeholder="Description" className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" />
                          <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:dark]" />
                          <div className="flex gap-2 pt-1">
                            <button onClick={saveEdit} disabled={savingEdit} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                            </button>
                            <button onClick={() => setEditId(null)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {PLATFORM_ICON[post.platform]}
                          </div>
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
                          {post.cloudinaryUrl && (
                            <video src={post.cloudinaryUrl} className="w-20 h-14 rounded-xl object-cover border border-slate-700/50 shrink-0" muted />
                          )}
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
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Linked Social Accounts</h2>
                <p className="text-slate-400 text-sm">Connect your accounts to enable automated posting.</p>
              </div>

              {/* ── Profile badge ────────────────────────────────────────── */}
              <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl max-w-sm mx-auto">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs text-slate-400">Active profile:</span>
                <span className="text-sm font-semibold text-indigo-300">{activeProfile?.name}</span>
                <span className="text-[10px] text-slate-600 ml-1">({activeProfile?.id?.slice(0,8)}…)</span>
              </div>

              {/* ── In-UI link notice (replaces alert) ───────────────────── */}
              {linkNotice && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
                  <Loader2 className={`w-4 h-4 shrink-0 mt-0.5 ${linkingPid ? 'animate-spin' : ''}`} />
                  <span>{linkNotice}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {PLATFORMS.map(p => {
                  const linked   = isLinked(p.id);
                  const session  = sessionFor(p.id);
                  const linking  = linkingPid === p.id;
                  return (
                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                      linking ? 'border-amber-500/40 bg-amber-500/5'
                      : linked ? `${p.bg} ${p.border}`
                      : 'bg-slate-950/30 border-slate-800/60'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        linking ? 'bg-amber-500/10' : linked ? 'bg-white/10' : 'bg-slate-800/80'
                      } ${p.color} shrink-0`}>
                        {linking ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : PLATFORM_ICON[p.id]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 text-sm">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            linking ? 'bg-amber-400 animate-pulse'
                            : linked ? 'bg-green-400 animate-pulse'
                            : 'bg-slate-600'
                          }`} />
                          <p className={`text-xs ${
                            linking ? 'text-amber-400'
                            : linked ? 'text-green-400'
                            : 'text-slate-500'
                          }`}>
                            {linking ? 'Linking… (log in to the browser window)'
                            : linked ? `Connected as: ${session?.username || 'Account'}`
                            : 'Not Connected'}
                          </p>
                        </div>
                        {/* Show when session was last linked */}
                        {linked && session?.updatedAt && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Last linked: {new Date(session.updatedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      {linked ? (
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                          <button
                            onClick={() => handleDisconnect(p.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-md transition-all shrink-0"
                            title="Disconnect Account"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : linking ? (
                        <span className="text-[10px] text-amber-400 font-medium px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 shrink-0">Waiting…</span>
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

        {/* ══════════════════ TAB: ENGAGEMENT ══════════════════ */}
        {tab === 'engagement' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Engagement Automation</h2>
              <p className="text-slate-400 text-sm">Auto-comment, check follower status, and auto-follow on Instagram & TikTok.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Use responsibly — excessive automation may violate platform Terms of Service.
              </div>
            </div>

            {/* Platform selector */}
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Platform</label>
                <div className="flex gap-2">
                  {ENGAGEMENT_PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setEngPlatform(p.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        engPlatform === p.id
                          ? `${p.bg} ${p.border} ${p.color} border`
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className={p.color}>{PLATFORM_ICON[p.id]}</span> {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action mode tabs */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Action</label>
                <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800/60">
                  {[
                    { id: 'comment', label: 'Comment',      Icon: MessageCircle },
                    { id: 'check',   label: 'Check Follow', Icon: Search },
                    { id: 'follow',  label: 'Auto-Follow',  Icon: UserPlus },
                    { id: 'auto-dm', label: 'Auto-DM Responder', Icon: Sparkles },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => { setEngMode(id); setEngResult(null); setEngError(''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        engMode === id
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment mode */}
              {engMode === 'comment' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Post URL</label>
                    <input
                      type="url"
                      value={engPostUrl}
                      onChange={e => setEngPostUrl(e.target.value)}
                      placeholder={engPlatform === 'INSTA_REELS' ? 'https://www.instagram.com/p/...' : 'https://www.tiktok.com/@user/video/...'}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Comment Text</label>
                    <textarea
                      value={engComment}
                      onChange={e => setEngComment(e.target.value)}
                      rows="3"
                      placeholder="Great content! Keep it up 🔥"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Auto-DM Responder Mode */}
              {engMode === 'auto-dm' && (
                <div className="space-y-3">
                  {engPlatform !== 'INSTA_REELS' ? (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs">
                      Auto-DM comment responder is currently only supported on Instagram. Please select "Instagram Reels" platform above.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">Post / Reel URL</label>
                        <input
                          type="url"
                          value={engPostUrl}
                          onChange={e => setEngPostUrl(e.target.value)}
                          placeholder="https://www.instagram.com/reel/..."
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">Trigger Keyword (Comment)</label>
                        <input
                          type="text"
                          value={engKeyword}
                          onChange={e => setEngKeyword(e.target.value)}
                          placeholder="e.g. SEND IT TO ME"
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">Reply Message (DM)</label>
                        <textarea
                          value={engReplyText}
                          onChange={e => setEngReplyText(e.target.value)}
                          rows="3"
                          placeholder="Hey! Here is the resource link: https://yourlink.com"
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Check / Follow mode */}
              {(engMode === 'check' || engMode === 'follow') && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Target Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                    <input
                      type="text"
                      value={engUsername}
                      onChange={e => setEngUsername(e.target.value.replace('@', ''))}
                      placeholder="username"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm"
                    />
                  </div>
                  {engMode === 'check' && (
                    <p className="text-xs text-slate-500 mt-2">Checks if this user follows you back. Opens a browser session with your saved cookies.</p>
                  )}
                  {engMode === 'follow' && (
                    <p className="text-xs text-amber-500/80 mt-2">⚠️ Will automatically click Follow on this user's profile if not already following.</p>
                  )}
                </div>
              )}

              {/* Error */}
              {engError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {engError}
                </div>
              )}

              {/* Result */}
              {engResult && (
                <div className="p-4 bg-slate-950/60 border border-slate-700/60 rounded-xl space-y-2">
                  {(engResult.type === 'comment' || engResult.type === 'auto-dm') && (
                    <p className="text-green-400 text-sm font-medium">{engResult.message}</p>
                  )}
                  {engResult.type === 'check' && (
                    <div className="flex items-center gap-3">
                      {engResult.isFollowing ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-green-400 text-sm font-medium">@{engResult.targetUsername} follows you ✅</p>
                            <p className="text-slate-500 text-xs">They are following your account.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-5 h-5 text-amber-400" />
                          <div>
                            <p className="text-amber-400 text-sm font-medium">@{engResult.targetUsername} does NOT follow you</p>
                            <button
                              onClick={() => { setEngMode('follow'); setEngUsername(engResult.targetUsername); setEngResult(null); }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline mt-0.5"
                            >
                              → Switch to Auto-Follow
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {engResult.type === 'follow' && (
                    <div className="flex items-center gap-3">
                      {engResult.alreadyFollowing ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-slate-400" />
                          <p className="text-slate-400 text-sm">Already following @{engResult.targetUsername}</p>
                        </>
                      ) : engResult.followed ? (
                        <>
                          <UserPlus className="w-5 h-5 text-green-400" />
                          <p className="text-green-400 text-sm font-medium">Successfully followed @{engResult.targetUsername} ✅</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <p className="text-red-400 text-sm">Follow action may have failed for @{engResult.targetUsername}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleEngagementSubmit}
                disabled={engLoading || (engMode === 'auto-dm' && engPlatform !== 'INSTA_REELS')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 transition-all"
              >
                {engLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  engMode === 'comment' ? <><MessageCircle className="w-4 h-4" /> Post Comment</> :
                  engMode === 'check'   ? <><Search className="w-4 h-4" /> Check Follower</> :
                  engMode === 'auto-dm' ? <><Sparkles className="w-4 h-4" /> Start Auto-DM Responder</> :
                  <><UserPlus className="w-4 h-4" /> Auto-Follow</>
                }
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
