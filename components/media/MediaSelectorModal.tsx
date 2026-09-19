"use client";

import { useState, useMemo, useRef } from "react";
import {
  X,
  Search,
  Link as LinkIcon,
  MonitorUp,
  FolderUp,
  Sparkles,
  Gamepad2,
  Compass,
  Globe,
  ExternalLink,
  Play,
  UploadCloud,
  Radio,
} from "lucide-react";
import { GameType } from "../games/CoupleGames";
import { YouTubeBrowser } from "./YouTubeBrowser";

export type MediaItemCategory = "all" | "youtube" | "upload" | "games" | "web";

export interface MediaItem {
  id: string;
  title: string;
  category: MediaItemCategory;
  tag?: string;
  isNew?: boolean;
  isPopular?: boolean;
  type: "youtube_browser" | "youtube" | "local_upload" | "game" | "direct_url";
  youtubeId?: string;
  gameType?: GameType;
  colorClass: string;
  description: string;
  logoText?: string;
}

interface MediaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectYouTube: (videoId: string, title: string) => void;
  onSelectLocalMedia?: (file: File) => void;
  onSelectGame: (gameType: GameType, title: string) => void;
  onTriggerScreenShare: () => void;
}

const CATALOG_ITEMS: MediaItem[] = [
  // 1. YOUTUBE (opens embedded live search & browse)
  {
    id: "youtube_main",
    title: "YouTube",
    category: "youtube",
    tag: "Search & Browse",
    isPopular: true,
    type: "youtube_browser",
    colorClass: "from-red-600/25 to-red-950/40 border-red-500/40 hover:border-red-500/70",
    logoText: "▶ YouTube",
    description: "Search millions of songs, videos, and playlists — browse and stream together in synchronized HD.",
  },
  // 2. LOCAL DEVICE MEDIA UPLOAD
  {
    id: "upload_local",
    title: "Upload from Device",
    category: "upload",
    tag: "Local Media",
    isNew: true,
    isPopular: true,
    type: "local_upload",
    colorClass: "from-purple-600/25 to-indigo-950/40 border-purple-500/40 hover:border-purple-500/70",
    logoText: "📁 Device Media",
    description: "Pick any video (MP4, WebM, MOV, MKV) or audio (MP3, WAV) from your computer to play in synchronized cinema mode.",
  },
  // 3. CURATED COZY COUPLE PICKS (YouTube)
  {
    id: "ambient_fireplace",
    title: "Cozy Fireplace with Soft Guitar",
    category: "youtube",
    tag: "Warm Ambiance",
    type: "youtube",
    youtubeId: "L_LUpnjgPso",
    colorClass: "from-amber-700/20 to-orange-950/40 border-amber-500/30 hover:border-amber-500/60",
    logoText: "🔥 Cozy Fireplace",
    description: "Warm crackling fireplace ambiance paired with gentle fingerpicked acoustic guitar.",
  },
  {
    id: "ambient_tokyo_rain",
    title: "Rainy Night in Tokyo",
    category: "youtube",
    tag: "Romantic Walk",
    type: "youtube",
    youtubeId: "ufskJSgaLfI",
    colorClass: "from-cyan-800/20 to-blue-950/40 border-cyan-500/30 hover:border-cyan-500/60",
    logoText: "🌧️ Tokyo Rain",
    description: "4K neon night walk through Shinjuku with gentle binaural rain sounds.",
  },
  {
    id: "ambient_lofi",
    title: "Lofi Hip Hop Radio",
    category: "youtube",
    tag: "Study & Relax",
    type: "youtube",
    youtubeId: "5qap5aO4i9A",
    colorClass: "from-violet-800/20 to-purple-950/40 border-violet-500/30 hover:border-violet-500/60",
    logoText: "🎧 Lofi Radio",
    description: "Iconic chill beats to study, chat, or fall asleep to.",
  },
  {
    id: "ambient_aurora",
    title: "Northern Lights 4K",
    category: "youtube",
    tag: "Scenic Wonder",
    type: "youtube",
    youtubeId: "rUxyKA_-grg",
    colorClass: "from-emerald-800/20 to-teal-950/40 border-emerald-500/30 hover:border-emerald-500/60",
    logoText: "✨ Aurora Borealis",
    description: "Mesmerizing 4K real-time footage of Arctic northern lights dancing across the sky.",
  },
  // 4. COUPLE GAMES
  {
    id: "game_heart_tac_toe",
    title: "Heart-Tac-Toe",
    category: "games",
    tag: "Couple Game",
    type: "game",
    gameType: "heart_tac_toe",
    colorClass: "from-rose-600/25 to-pink-950/40 border-rose-500/30 hover:border-rose-500/60",
    logoText: "💖 Heart Tic-Tac-Toe",
    description: "Intimate turn-based Tic-Tac-Toe. Play Hearts vs Sparkles with your partner.",
  },
  {
    id: "game_connect_four",
    title: "Four in a Row",
    category: "games",
    tag: "Couple Game",
    type: "game",
    gameType: "connect_four",
    colorClass: "from-blue-600/25 to-indigo-950/40 border-blue-500/30 hover:border-blue-500/60",
    logoText: "🔵 Four Colors",
    description: "Classic Connect 4 arcade. Drop colored tokens and connect four to win.",
  },
  {
    id: "game_deep_talk",
    title: "Midnight Pillow Talk",
    category: "games",
    tag: "Deep Questions",
    isPopular: true,
    type: "game",
    gameType: "deep_talk",
    colorClass: "from-purple-600/25 to-violet-950/40 border-purple-500/30 hover:border-purple-500/60",
    logoText: "✨ Deep Talk",
    description: "Curated romantic, fun, and vulnerable questions to spark late-night conversations.",
  },
  {
    id: "game_puzzle",
    title: "Puzzle Together",
    category: "games",
    tag: "Couple Game",
    isNew: true,
    type: "game",
    gameType: "puzzle",
    colorClass: "from-teal-600/25 to-emerald-950/40 border-teal-500/30 hover:border-teal-500/60",
    logoText: "🧩 Puzzle Together",
    description: "Solve jigsaw puzzles together in real-time. Upload couple photos or pick a preset to turn into a puzzle.",
  },
];

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelectYouTube,
  onSelectLocalMedia,
  onSelectGame,
  onTriggerScreenShare,
}: MediaSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<MediaItemCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [youtubeBrowserOpen, setYoutubeBrowserOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract YouTube ID helper
  function extractYouTubeId(url: string): string | null {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  function handleCustomUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = extractYouTubeId(customUrl);
    if (id) {
      onSelectYouTube(id, "Custom Shared Video");
      setCustomUrl("");
      onClose();
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0 && onSelectLocalMedia) {
      onSelectLocalMedia(files[0]);
      onClose();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onSelectLocalMedia) {
      onSelectLocalMedia(e.dataTransfer.files[0]);
      onClose();
    }
  }

  // Filter items based on Category and Search Query
  const filteredItems = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      // Category filter
      if (activeCategory === "youtube" && item.category !== "youtube") return false;
      if (activeCategory === "upload" && item.category !== "upload") return false;
      if (activeCategory === "games" && item.category !== "games") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tag?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-5xl h-[88vh] rounded-3xl bg-[#140F26] border border-purple-500/25 shadow-2xl glow-purple flex flex-col overflow-hidden text-white">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#191330]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Select Media &amp; Activities</h2>
              <p className="text-[11px] text-zinc-400">Watch YouTube or play videos directly from your device</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TOOLBAR: ACTION ICONS + FILTER PILLS + SEARCH */}
        <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#120D22]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick Action Buttons (Left) */}
          <div className="flex items-center gap-2">
            {/* Quick Upload from Device */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload Video or Audio from Device"
              className="px-3 py-2 rounded-2xl bg-purple-600/25 border border-purple-500/40 hover:bg-purple-600 hover:text-white text-purple-200 flex items-center gap-2 text-xs font-semibold transition-all shadow-sm"
            >
              <FolderUp className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Media</span>
            </button>

            {/* Quick YouTube Search */}
            <button
              onClick={() => setYoutubeBrowserOpen(true)}
              title="Search & Browse YouTube"
              className="px-3 py-2 rounded-2xl bg-red-600/20 border border-red-500/30 hover:bg-red-600 hover:text-white text-red-300 flex items-center gap-2 text-xs font-semibold transition-all shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">YouTube</span>
            </button>

            {/* Direct URL */}
            <button
              onClick={() => setActiveCategory("web")}
              title="Paste Direct Video URL"
              className={`w-9 h-9 rounded-2xl border transition-all flex items-center justify-center shadow-sm ${
                activeCategory === "web"
                  ? "bg-purple-600 text-white border-purple-400"
                  : "bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            {/* Screen Share */}
            <button
              onClick={() => {
                onClose();
                onTriggerScreenShare();
              }}
              title="Screen Share Tab / Window"
              className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
            >
              <MonitorUp className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "youtube", label: "YouTube" },
              { id: "upload", label: "Local Media" },
              { id: "games", label: "Games" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveCategory(pill.id as MediaItemCategory)}
                className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                  activeCategory === pill.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search Input (Right) */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter media..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* MODAL MAIN CONTENT: SIDEBAR + GRID */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-44 sm:w-52 border-r border-white/[0.08] p-3 flex flex-col gap-1.5 bg-[#100C1F]/60 shrink-0">
            {[
              { id: "all", label: "All Media", icon: Sparkles },
              { id: "youtube", label: "YouTube", icon: Play },
              { id: "upload", label: "Local Device", icon: FolderUp },
              { id: "games", label: "Couple Games", icon: Gamepad2 },
              { id: "web", label: "Direct URL", icon: Globe },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as MediaItemCategory)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all text-left ${
                    isActive
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <div className="mt-auto p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold mb-1">
                <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Synchronized Hub</span>
              </div>
              <span>Everything you select is mirrored to your partner in real-time.</span>
            </div>
          </div>

          {/* MAIN GRID AREA */}
          <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#130E26] to-[#0D091A]">
            {/* DIRECT URL VIEW */}
            {activeCategory === "web" ? (
              <div className="max-w-xl mx-auto py-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Direct URL or Web Stream</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Paste any public YouTube video link or stream URL to watch synchronously with your partner.
                  </p>
                </div>

                <form onSubmit={handleCustomUrlSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 transition-all font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!customUrl.trim()}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
                  >
                    <span>Launch Synchronized Video</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : activeCategory === "upload" ? (
              /* DEDICATED LOCAL UPLOAD VIEW */
              <div className="max-w-xl mx-auto py-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                    isDraggingOver
                      ? "border-purple-400 bg-purple-600/20 scale-[1.02]"
                      : "border-purple-500/30 bg-white/[0.02] hover:border-purple-400/60 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-xl shadow-purple-900/30">
                    <UploadCloud className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Upload Media from Device</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                      Click to browse or drop any video (MP4, WebM, MOV, MKV) or audio file to play in synchronized cinema mode.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {["MP4", "WebM", "MOV", "MKV", "MP3", "WAV"].map((fmt) => (
                      <span
                        key={fmt}
                        className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono text-purple-300"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-3 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all shadow-lg shadow-purple-900/40"
                  >
                    Browse Local Files
                  </button>
                </div>
              </div>
            ) : (
              /* REGULAR CARDS GRID */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.id === "youtube_main") {
                        setYoutubeBrowserOpen(true);
                      } else if (item.id === "upload_local") {
                        fileInputRef.current?.click();
                      } else if (item.type === "youtube" && item.youtubeId) {
                        onSelectYouTube(item.youtubeId, item.title);
                        onClose();
                      } else if (item.type === "game" && item.gameType) {
                        onSelectGame(item.gameType, item.title);
                        onClose();
                      }
                    }}
                    className={`group relative rounded-3xl p-5 border bg-gradient-to-b ${item.colorClass} cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between min-h-[170px] overflow-hidden`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/50 text-[10px] uppercase font-semibold text-purple-300 tracking-wider">
                        {item.tag}
                      </span>
                      {item.isNew && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-md shadow-rose-900/50">
                          NEW
                        </span>
                      )}
                      {item.isPopular && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-md shadow-purple-900/50">
                          POPULAR
                        </span>
                      )}
                    </div>

                    {/* Logo / Title */}
                    <div className="my-3 z-10">
                      {item.logoText ? (
                        <div className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:scale-105 transition-transform origin-left">
                          {item.logoText}
                        </div>
                      ) : (
                        <div className="text-base font-bold text-white group-hover:text-purple-200">
                          {item.title}
                        </div>
                      )}
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Action Hint */}
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-400 group-hover:text-white transition-colors z-10">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {item.id === "upload_local"
                          ? "Select File"
                          : item.id === "youtube_main"
                          ? "Open Browser"
                          : "Launch"}
                      </span>
                    </div>

                    {/* Subtle Hover Glow Effect */}
                    <div className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* YouTube Browser Overlay */}
        <YouTubeBrowser
          isOpen={youtubeBrowserOpen}
          onClose={() => setYoutubeBrowserOpen(false)}
          onSelectVideo={(videoId, title) => {
            onSelectYouTube(videoId, title);
            setYoutubeBrowserOpen(false);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
