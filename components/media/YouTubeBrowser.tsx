/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  Play,
  Clock,
  Eye,
  TrendingUp,
  Music,
  Film,
  Heart,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Flame,
  Sparkles,
  Radio,
} from "lucide-react";

// Invidious instances for YouTube search (free, no API key)
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://inv.tux.pizza",
  "https://invidious.privacyredirect.com",
];

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  author: string;
  authorId: string;
  lengthSeconds: number;
  viewCount: number;
  publishedText: string;
  videoThumbnails: { url: string; width: number; height: number; quality: string }[];
}

interface YouTubeBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoId: string, title: string) => void;
}

// Curated trending/romantic categories for couples
const BROWSE_CATEGORIES = [
  {
    id: "romantic",
    label: "Romantic Vibes",
    icon: Heart,
    query: "romantic playlist chill",
    color: "text-rose-400",
    bgColor: "from-rose-600/20 to-pink-900/30 border-rose-500/30",
  },
  {
    id: "lofi",
    label: "Lofi & Chill",
    icon: Music,
    query: "lofi hip hop chill beats",
    color: "text-purple-400",
    bgColor: "from-purple-600/20 to-violet-900/30 border-purple-500/30",
  },
  {
    id: "trending_music",
    label: "Trending Music",
    icon: TrendingUp,
    query: "trending music 2025",
    color: "text-amber-400",
    bgColor: "from-amber-600/20 to-orange-900/30 border-amber-500/30",
  },
  {
    id: "ambient",
    label: "Cozy Ambient",
    icon: Flame,
    query: "cozy ambient relaxing fireplace rain",
    color: "text-orange-400",
    bgColor: "from-orange-600/20 to-red-900/30 border-orange-500/30",
  },
  {
    id: "movies",
    label: "Movie Scenes",
    icon: Film,
    query: "iconic movie scenes compilation",
    color: "text-cyan-400",
    bgColor: "from-cyan-600/20 to-blue-900/30 border-cyan-500/30",
  },
  {
    id: "couple",
    label: "Couple Activities",
    icon: Sparkles,
    query: "couple activities long distance date ideas",
    color: "text-pink-400",
    bgColor: "from-pink-600/20 to-fuchsia-900/30 border-pink-500/30",
  },
];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "LIVE";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatViewCount(count: number): string {
  if (!count) return "";
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

function getBestThumbnail(thumbnails: YouTubeSearchResult["videoThumbnails"]): string {
  // Prefer medium quality for cards
  const medium = thumbnails.find((t) => t.quality === "medium");
  if (medium) return medium.url;
  const high = thumbnails.find((t) => t.quality === "high");
  if (high) return high.url;
  // Fallback to standard YouTube thumbnail
  return thumbnails[0]?.url || "";
}

export function YouTubeBrowser({ isOpen, onClose, onSelectVideo }: YouTubeBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const instanceIndexRef = useRef(0);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const searchYouTube = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setResults([]);

    // Try multiple Invidious instances for reliability
    for (let attempt = 0; attempt < INVIDIOUS_INSTANCES.length; attempt++) {
      const idx = (instanceIndexRef.current + attempt) % INVIDIOUS_INSTANCES.length;
      const instance = INVIDIOUS_INSTANCES[idx];

      try {
        const response = await fetch(
          `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`,
          { signal: AbortSignal.timeout(8000) }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const videos: YouTubeSearchResult[] = data
          .filter((item: Record<string, unknown>) => item.type === "video")
          .slice(0, 20)
          .map((item: Record<string, unknown>) => ({
            videoId: item.videoId as string,
            title: item.title as string,
            author: item.author as string,
            authorId: item.authorId as string,
            lengthSeconds: (item.lengthSeconds as number) || 0,
            viewCount: (item.viewCount as number) || 0,
            publishedText: (item.publishedText as string) || "",
            videoThumbnails: (item.videoThumbnails as YouTubeSearchResult["videoThumbnails"]) || [],
          }));

        if (videos.length > 0) {
          instanceIndexRef.current = idx; // Prefer this instance next time
          setResults(videos);
          setIsSearching(false);
          return;
        }
      } catch {
        // Try next instance
      }
    }

    // All instances failed — try fallback with a direct YouTube thumbnail approach
    setSearchError("Search temporarily unavailable. You can paste a YouTube URL directly.");
    setIsSearching(false);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setActiveCategory(null);
        searchYouTube(searchQuery.trim());
      }
    },
    [searchQuery, searchYouTube]
  );

  const handleCategoryClick = useCallback(
    (cat: (typeof BROWSE_CATEGORIES)[number]) => {
      setActiveCategory(cat.id);
      setSearchQuery(cat.query);
      searchYouTube(cat.query);
    },
    [searchYouTube]
  );

  const handleSelectVideo = useCallback(
    (video: YouTubeSearchResult) => {
      onSelectVideo(video.videoId, video.title);
      onClose();
    },
    [onSelectVideo, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg">
      <div className="relative w-full max-w-6xl h-[92vh] rounded-3xl bg-[#0D0A1A] border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* HEADER */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#110E22]/90 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600/30 to-rose-600/30 border border-red-500/30 flex items-center justify-center">
              <Play className="w-4 h-4 text-red-400 fill-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">YouTube Browser</h2>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Search &amp; play together in real-time</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] bg-[#0F0C1E]/80 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for songs, videos, playlists..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-red-900/30"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {/* BROWSE CATEGORIES (show before first search) */}
          {!hasSearched && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Browse Together
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {BROWSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat)}
                      className={`group p-5 rounded-2xl bg-gradient-to-br ${cat.bgColor} border text-left transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
                    >
                      <Icon className={`w-6 h-6 ${cat.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <div className="text-sm font-semibold text-white">{cat.label}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">Tap to explore</div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Romantic Picks */}
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Quick Picks for Couples
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: "L_LUpnjgPso", title: "Cozy Fireplace with Soft Guitar", tag: "Warm Ambiance" },
                  { id: "7OGiK9Xn_r4", title: "Rainy Night in Tokyo — Walking Tour", tag: "Romantic Walk" },
                  { id: "5qap5aO4i9A", title: "Lofi Hip Hop Radio — Beats to Relax", tag: "Cozy Study" },
                  { id: "lTRiuFIWV54", title: "Jazz in Paris — Slow Jazz Cafe", tag: "Café Date" },
                  { id: "rUxyKA_-grg", title: "Northern Lights 4K — Arctic Aurora", tag: "Scenic" },
                  { id: "1ZYbU82GVz4", title: "Soft Piano Music — Relaxing Sleep", tag: "Sleep Together" },
                ].map((pick) => (
                  <button
                    key={pick.id}
                    onClick={() => {
                      onSelectVideo(pick.id, pick.title);
                      onClose();
                    }}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-purple-500/30 transition-all text-left"
                  >
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                      <img
                        src={`https://i.ytimg.com/vi/${pick.id}/mqdefault.jpg`}
                        alt={pick.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white line-clamp-2 group-hover:text-purple-200">
                        {pick.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{pick.tag}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH RESULTS */}
          {hasSearched && (
            <div>
              {/* Back to browse */}
              <button
                onClick={() => {
                  setHasSearched(false);
                  setResults([]);
                  setSearchQuery("");
                  setActiveCategory(null);
                }}
                className="mb-4 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Browse</span>
              </button>

              {/* Active category pill */}
              {activeCategory && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-xs font-medium text-purple-300">
                    {BROWSE_CATEGORIES.find((c) => c.id === activeCategory)?.label}
                  </span>
                </div>
              )}

              {/* Loading state */}
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                  <p className="text-sm text-zinc-400">Searching YouTube...</p>
                </div>
              )}

              {/* Error state */}
              {searchError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4">
                    <ExternalLink className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm text-zinc-400 max-w-sm">{searchError}</p>
                </div>
              )}

              {/* Results Grid */}
              {!isSearching && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {results.map((video) => (
                    <button
                      key={video.videoId}
                      onClick={() => handleSelectVideo(video)}
                      className="group text-left rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                        <img
                          src={
                            video.videoThumbnails.length > 0
                              ? getBestThumbnail(video.videoThumbnails)
                              : `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`
                          }
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-semibold text-white backdrop-blur-sm">
                          {formatDuration(video.lengthSeconds)}
                        </div>

                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg shadow-purple-900/50 group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3.5">
                        <h4 className="text-[13px] font-medium text-white line-clamp-2 leading-snug group-hover:text-purple-200 transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1.5 truncate">{video.author}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                          {video.viewCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatViewCount(video.viewCount)}
                            </span>
                          )}
                          {video.publishedText && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {video.publishedText}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {!isSearching && !searchError && hasSearched && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="w-10 h-10 text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400">No results found</p>
                  <p className="text-xs text-zinc-500 mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/[0.06] bg-[#0F0C1E]/80 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
            Selected videos play synchronized for both of you
          </span>
          <span>Powered by Invidious</span>
        </div>
      </div>
    </div>
  );
}
