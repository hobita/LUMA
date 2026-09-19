"use client";

import { useState, useMemo } from "react";
import {
  X,
  Search,
  Tv,
  Link as LinkIcon,
  MonitorUp,
  FolderUp,
  Sparkles,
  Gamepad2,
  Film,
  Compass,
  Flame,
  Globe,
  ExternalLink,
  Play,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { GameType } from "../games/CoupleGames";

export type MediaItemCategory = "streaming" | "games" | "activities" | "web";

export interface MediaItem {
  id: string;
  title: string;
  category: MediaItemCategory;
  tag?: string;
  isNew?: boolean;
  isPopular?: boolean;
  type: "youtube" | "game" | "screenshare_guide" | "direct_url";
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
  onSelectGame: (gameType: GameType, title: string) => void;
  onTriggerScreenShare: () => void;
}

const CATALOG_ITEMS: MediaItem[] = [
  // 1. YOUTUBE
  {
    id: "youtube_main",
    title: "YouTube",
    category: "streaming",
    tag: "Video Catalog",
    isPopular: true,
    type: "youtube",
    youtubeId: "L_LUpnjgPso",
    colorClass: "from-red-600/20 to-red-900/30 border-red-500/30 hover:border-red-500/60",
    logoText: "YouTube",
    description: "Watch any YouTube video or livestream together with real-time playback sync.",
  },
  // 2. COUPLE GAMES
  {
    id: "game_heart_tac_toe",
    title: "Heart-Tac-Toe",
    category: "games",
    tag: "Couple Game",
    isNew: true,
    type: "game",
    gameType: "heart_tac_toe",
    colorClass: "from-rose-600/25 to-pink-900/30 border-rose-500/30 hover:border-rose-500/60",
    logoText: "💖 Heart Tic-Tac-Toe",
    description: "Intimate turn-based Tic-Tac-Toe. Play Hearts vs Sparkles with your partner.",
  },
  {
    id: "game_connect_four",
    title: "Four in a Row",
    category: "games",
    tag: "Couple Game",
    isNew: true,
    type: "game",
    gameType: "connect_four",
    colorClass: "from-blue-600/25 to-indigo-900/30 border-blue-500/30 hover:border-blue-500/60",
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
    colorClass: "from-purple-600/25 to-violet-900/30 border-purple-500/30 hover:border-purple-500/60",
    logoText: "✨ Deep Talk",
    description: "Curated romantic, fun, and vulnerable questions to spark late-night conversations.",
  },
  // 3. STREAMING SERVICES (Screen share launchers)
  {
    id: "stream_netflix",
    title: "Netflix",
    category: "streaming",
    tag: "Screen Shareable",
    type: "screenshare_guide",
    colorClass: "from-red-950/40 to-black border-red-600/30 hover:border-red-600/60",
    logoText: "NETFLIX",
    description: "Stream your favorite movies & series together via low-latency screen sharing with audio.",
  },
  {
    id: "stream_disney",
    title: "Disney+",
    category: "streaming",
    tag: "Screen Shareable",
    type: "screenshare_guide",
    colorClass: "from-blue-950/40 to-sky-950/30 border-blue-600/30 hover:border-blue-600/60",
    logoText: "Disney+",
    description: "Watch Disney, Marvel, Pixar and Star Wars favorites synchronously.",
  },
  {
    id: "stream_max",
    title: "Max",
    category: "streaming",
    tag: "Screen Shareable",
    type: "screenshare_guide",
    colorClass: "from-indigo-950/40 to-black border-indigo-500/30 hover:border-indigo-500/60",
    logoText: "max",
    description: "Stream HBO Originals, blockbusters, and Warner Bros classics.",
  },
  {
    id: "stream_spotify",
    title: "Spotify",
    category: "streaming",
    tag: "Music Audio",
    type: "screenshare_guide",
    colorClass: "from-emerald-950/40 to-black border-emerald-500/30 hover:border-emerald-500/60",
    logoText: "Spotify",
    description: "Listen to your couple playlists and podcasts together with tab audio sharing.",
  },
  {
    id: "stream_crunchyroll",
    title: "Crunchyroll",
    category: "streaming",
    tag: "Anime",
    type: "screenshare_guide",
    colorClass: "from-amber-950/40 to-orange-950/30 border-orange-500/30 hover:border-orange-500/60",
    logoText: "crunchyroll",
    description: "Watch trending seasonal anime episodes together in HD.",
  },
  // 4. COZY AMBIENT ACTIVITIES
  {
    id: "ambient_fireplace",
    title: "Cozy Fireplace with Soft Guitar",
    category: "activities",
    tag: "Warm Ambiance",
    type: "youtube",
    youtubeId: "L_LUpnjgPso",
    colorClass: "from-amber-700/20 to-orange-900/30 border-amber-500/30 hover:border-amber-500/60",
    logoText: "🔥 Cozy Fireplace",
    description: "Warm crackling fireplace ambiance paired with gentle fingerpicked acoustic guitar.",
  },
  {
    id: "ambient_tokyo_rain",
    title: "Rainy Night in Tokyo",
    category: "activities",
    tag: "Romantic Walk",
    type: "youtube",
    youtubeId: "7OGiK9Xn_r4",
    colorClass: "from-cyan-800/20 to-blue-900/30 border-cyan-500/30 hover:border-cyan-500/60",
    logoText: "🌧️ Tokyo Rain",
    description: "4K neon night walk through Shinjuku with gentle binaural rain sounds.",
  },
  {
    id: "ambient_lofi",
    title: "Lofi Hip Hop Radio",
    category: "activities",
    tag: "Study & Relax",
    type: "youtube",
    youtubeId: "5qap5aO4i9A",
    colorClass: "from-violet-800/20 to-purple-900/30 border-violet-500/30 hover:border-violet-500/60",
    logoText: "🎧 Lofi Radio",
    description: "Iconic chill beats to study, chat, or fall asleep to.",
  },
];

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelectYouTube,
  onSelectGame,
  onTriggerScreenShare,
}: MediaSelectorModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("discover");
  const [filterPill, setFilterPill] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [screenSharePromptService, setScreenSharePromptService] = useState<string | null>(null);

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

  // Filter items based on Category, Filter Pill, and Search Query
  const filteredItems = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => {
      // Category filter
      if (activeCategory === "streaming" && item.category !== "streaming") return false;
      if (activeCategory === "games" && item.category !== "games") return false;
      if (activeCategory === "activities" && item.category !== "activities") return false;

      // Pill filter
      if (filterPill === "video_catalogs" && item.type !== "youtube") return false;
      if (filterPill === "couple_apps" && item.category !== "games") return false;
      if (filterPill === "screen_share" && item.type !== "screenshare_guide") return false;

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
  }, [activeCategory, filterPill, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Kosmi-Style Deep Royal Purple Container */}
      <div className="relative w-full max-w-5xl h-[88vh] rounded-3xl bg-[#140F26] border border-purple-500/25 shadow-2xl glow-purple flex flex-col overflow-hidden text-white">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#191330]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Select Media</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TOOLBAR: QUICK ICONS + SEARCH + PILLS */}
        <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#120D22]/90 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Action Buttons (Left) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onTriggerScreenShare();
              }}
              title="Quick Screen Share"
              className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 hover:bg-purple-600/30 hover:border-purple-500/40 text-purple-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
            >
              <MonitorUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveCategory("web")}
              title="Paste Direct Web / Video Link"
              className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm ${
                activeCategory === "web"
                  ? "bg-purple-600 text-white border-purple-400"
                  : "bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onClose();
                onTriggerScreenShare();
              }}
              title="Share File / Window"
              className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 hover:bg-purple-600/30 hover:border-purple-500/40 text-zinc-300 hover:text-white flex items-center justify-center transition-all shadow-sm"
            >
              <FolderUp className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "video_catalogs", label: "Video Catalogs" },
              { id: "couple_apps", label: "Couple Games" },
              { id: "screen_share", label: "Screen Shareable" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterPill(pill.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                  filterPill === pill.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                    : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search Input (Right) */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps and media content"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* MODAL MAIN CONTENT: SIDEBAR + GRID */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-44 sm:w-52 border-r border-white/[0.08] p-3 flex flex-col gap-1 bg-[#100C1F]/60 shrink-0">
            {[
              { id: "discover", label: "Discover", icon: Sparkles },
              { id: "streaming", label: "Streaming", icon: Film },
              { id: "games", label: "Games", icon: Gamepad2 },
              { id: "activities", label: "Activities", icon: Flame },
              { id: "web", label: "Web Search", icon: Globe },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setScreenSharePromptService(null);
                  }}
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
            ) : screenSharePromptService ? (
              /* SCREEN SHARE LAUNCHER PROMPT */
              <div className="max-w-lg mx-auto py-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-xl shadow-purple-900/40">
                  <Tv className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Watch {screenSharePromptService} Together</h3>
                <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  To stream copyrighted content like {screenSharePromptService} with highest video & audio quality,
                  share your browser tab directly.
                </p>

                <div className="my-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-left text-xs space-y-2">
                  <div className="flex items-start gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Open {screenSharePromptService} in a separate browser tab</span>
                  </div>
                  <div className="flex items-start gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Click <strong>&quot;Share Tab & Audio&quot;</strong> below and check <strong>&quot;Also share tab audio&quot;</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setScreenSharePromptService(null)}
                    className="px-5 py-2.5 rounded-xl glass-panel text-xs text-zinc-400 hover:text-white"
                  >
                    Back to Catalog
                  </button>
                  <button
                    onClick={() => {
                      setScreenSharePromptService(null);
                      onClose();
                      onTriggerScreenShare();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 flex items-center gap-2"
                  >
                    <MonitorUp className="w-4 h-4" />
                    <span>Start Screen Share</span>
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
                      if (item.type === "youtube" && item.youtubeId) {
                        onSelectYouTube(item.youtubeId, item.title);
                        onClose();
                      } else if (item.type === "game" && item.gameType) {
                        onSelectGame(item.gameType, item.title);
                        onClose();
                      } else if (item.type === "screenshare_guide") {
                        setScreenSharePromptService(item.title);
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
                      <span>Launch Activity</span>
                    </div>

                    {/* Subtle Hover Glow Effect */}
                    <div className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
