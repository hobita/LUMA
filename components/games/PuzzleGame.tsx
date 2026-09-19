"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Puzzle,
  ImagePlus,
  RotateCcw,
  Trophy,
  Sparkles,
  X,
  ChevronDown,
  Zap,
} from "lucide-react";

// ----- Types -----
interface PuzzlePiece {
  id: number;        // Original index in the grid (correct position)
  currentPos: number; // Current position in the grid
  isLocked: boolean;  // True if snapped into correct position
}

interface PuzzleGameProps {
  userRole: "owner" | "partner";
  onSendGameMove: (payload: { action: string; data: Record<string, unknown> }) => void;
  lastRemoteMove: { action: string; data: Record<string, unknown> } | null;
  onCloseGame: () => void;
}

// Difficulty presets
const DIFFICULTIES = [
  { label: "Easy", cols: 3, rows: 3, pieces: 9 },
  { label: "Medium", cols: 4, rows: 4, pieces: 16 },
  { label: "Hard", cols: 5, rows: 5, pieces: 25 },
] as const;

// Default preset images (gradient-based, no external URLs needed)
const PRESET_IMAGES = [
  { id: "sunset", label: "🌅 Sunset Gradient", gradient: "linear-gradient(135deg, #ff6b6b, #ee5a24, #f0932b, #ffbe76)" },
  { id: "ocean", label: "🌊 Ocean Dreams", gradient: "linear-gradient(135deg, #0c2461, #0a3d62, #3c6382, #60a3bc)" },
  { id: "aurora", label: "🌌 Aurora Night", gradient: "linear-gradient(135deg, #6c5ce7, #a29bfe, #00cec9, #55efc4)" },
  { id: "rose", label: "🌹 Rose Garden", gradient: "linear-gradient(135deg, #e84393, #fd79a8, #fab1a0, #ffeaa7)" },
  { id: "forest", label: "🌲 Deep Forest", gradient: "linear-gradient(135deg, #2d3436, #636e72, #00b894, #55efc4)" },
];

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PuzzleGame({
  userRole,
  onSendGameMove,
  lastRemoteMove,
  onCloseGame,
}: PuzzleGameProps) {
  // ----- State -----
  const [difficulty, setDifficulty] = useState(0); // index into DIFFICULTIES
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string>("sunset");
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [showSetup, setShowSetup] = useState(true);
  const [diffMenuOpen, setDiffMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { cols, rows } = DIFFICULTIES[difficulty];
  const totalPieces = cols * rows;

  // The image source: uploaded photo or gradient
  const puzzleImage = useMemo(() => {
    if (imageUrl) return { type: "image" as const, src: imageUrl };
    const preset = PRESET_IMAGES.find((p) => p.id === presetId);
    return { type: "gradient" as const, src: preset?.gradient || PRESET_IMAGES[0].gradient };
  }, [imageUrl, presetId]);

  // ----- Init puzzle -----
  const initPuzzle = useCallback(
    (broadcast = true) => {
      const initial: PuzzlePiece[] = Array.from({ length: totalPieces }, (_, i) => ({
        id: i,
        currentPos: i,
        isLocked: false,
      }));

      // Shuffle positions
      const positions = shuffleArray(Array.from({ length: totalPieces }, (_, i) => i));
      const shuffled = initial.map((piece, idx) => ({
        ...piece,
        currentPos: positions[idx],
        isLocked: piece.id === positions[idx],
      }));

      setPieces(shuffled);
      setIsComplete(false);
      setMoveCount(0);
      setSelectedPiece(null);
      setShowSetup(false);

      if (broadcast) {
        onSendGameMove({
          action: "PUZZLE_INIT",
          data: {
            pieces: shuffled,
            difficulty,
            presetId,
            imageUrl: imageUrl || "",
          },
        });
      }
    },
    [totalPieces, difficulty, presetId, imageUrl, onSendGameMove]
  );

  // ----- Handle piece click (swap logic) -----
  const handlePieceClick = useCallback(
    (clickedPos: number) => {
      if (isComplete) return;

      const clickedPiece = pieces.find((p) => p.currentPos === clickedPos);
      if (!clickedPiece || clickedPiece.isLocked) return;

      if (selectedPiece === null) {
        setSelectedPiece(clickedPos);
        return;
      }

      if (selectedPiece === clickedPos) {
        setSelectedPiece(null);
        return;
      }

      // Swap the two pieces
      const otherPiece = pieces.find((p) => p.currentPos === selectedPiece);
      if (!otherPiece || otherPiece.isLocked) {
        setSelectedPiece(clickedPos);
        return;
      }

      const newPieces = pieces.map((p) => {
        if (p.id === clickedPiece.id) {
          const newPos = selectedPiece;
          return { ...p, currentPos: newPos, isLocked: p.id === newPos };
        }
        if (p.id === otherPiece.id) {
          const newPos = clickedPos;
          return { ...p, currentPos: newPos, isLocked: p.id === newPos };
        }
        return p;
      });

      const newMoveCount = moveCount + 1;
      const allLocked = newPieces.every((p) => p.isLocked);

      setPieces(newPieces);
      setSelectedPiece(null);
      setMoveCount(newMoveCount);
      if (allLocked) setIsComplete(true);

      onSendGameMove({
        action: "PUZZLE_SWAP",
        data: {
          pieces: newPieces,
          moveCount: newMoveCount,
          isComplete: allLocked,
        },
      });
    },
    [pieces, selectedPiece, isComplete, moveCount, onSendGameMove]
  );

  // ----- Handle uploaded photo -----
  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // ----- Listen to remote moves -----
  useEffect(() => {
    if (!lastRemoteMove) return;
    const { action, data } = lastRemoteMove;

    if (action === "PUZZLE_INIT") {
      setPieces(data.pieces as PuzzlePiece[]);
      setDifficulty(data.difficulty as number);
      setPresetId(data.presetId as string);
      const remoteImg = data.imageUrl as string;
      setImageUrl(remoteImg || null);
      setIsComplete(false);
      setMoveCount(0);
      setSelectedPiece(null);
      setShowSetup(false);
    } else if (action === "PUZZLE_SWAP") {
      setPieces(data.pieces as PuzzlePiece[]);
      setMoveCount(data.moveCount as number);
      if (data.isComplete) setIsComplete(true);
      setSelectedPiece(null);
    } else if (action === "PUZZLE_RESET") {
      setShowSetup(true);
      setPieces([]);
      setIsComplete(false);
      setMoveCount(0);
      setSelectedPiece(null);
    }
  }, [lastRemoteMove]);

  // ----- Render piece content -----
  const renderPieceContent = useCallback(
    (piece: PuzzlePiece, cellWidth: number, cellHeight: number) => {
      const origCol = piece.id % cols;
      const origRow = Math.floor(piece.id / cols);
      const bgPosX = origCol * cellWidth;
      const bgPosY = origRow * cellHeight;

      if (puzzleImage.type === "image") {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${puzzleImage.src})`,
              backgroundSize: `${cols * 100}% ${rows * 100}%`,
              backgroundPosition: `${(origCol / (cols - 1)) * 100}% ${(origRow / (rows - 1)) * 100}%`,
            }}
          />
        );
      }

      // Gradient: render the gradient as a large background and clip to the piece
      return (
        <div
          className="w-full h-full"
          style={{
            background: puzzleImage.src,
            backgroundSize: `${cols * cellWidth}px ${rows * cellHeight}px`,
            backgroundPosition: `-${bgPosX}px -${bgPosY}px`,
          }}
        />
      );
    },
    [cols, rows, puzzleImage]
  );

  // ----- Setup Screen -----
  if (showSetup) {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-[#0E0E15]/95 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Puzzle Together</h3>
              <p className="text-xs text-zinc-400">Set up your couple puzzle</p>
            </div>
          </div>
          <button
            onClick={onCloseGame}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Setup Body */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto gap-8 max-w-lg mx-auto w-full">
          {/* Image Selection */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-purple-400" />
              Choose Your Puzzle Image
            </h4>

            {/* Upload Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-400/60 bg-white/[0.02] hover:bg-purple-600/10 transition-all flex items-center gap-4 mb-4"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                <ImagePlus className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-white block">
                  {imageUrl ? "✅ Photo Selected — Click to Change" : "Upload Your Own Photo"}
                </span>
                <span className="text-xs text-zinc-400">
                  Use a couple selfie, a memory, or any picture you love
                </span>
              </div>
            </button>

            {/* Preview uploaded image */}
            {imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-purple-500/30 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Puzzle preview" className="w-full h-40 object-cover" />
              </div>
            )}

            {/* Or preset gradients */}
            {!imageUrl && (
              <>
                <div className="text-xs text-zinc-500 text-center mb-3">— or choose a preset —</div>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_IMAGES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPresetId(p.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                        presetId === p.id
                          ? "border-purple-400 ring-2 ring-purple-500/50 shadow-lg shadow-purple-900/30"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="w-full h-full" style={{ background: p.gradient }} />
                      <span className="absolute bottom-0.5 left-0 right-0 text-[9px] text-white font-medium text-center drop-shadow-lg">
                        {p.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Difficulty Selection */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Select Difficulty
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d, idx) => (
                <button
                  key={d.label}
                  onClick={() => setDifficulty(idx)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    difficulty === idx
                      ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/30"
                      : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="text-sm font-bold">{d.label}</div>
                  <div className="text-[11px] mt-0.5 opacity-70">{d.cols}×{d.rows} ({d.pieces} pieces)</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => initPuzzle(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-semibold text-sm shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Puzzle className="w-5 h-5" />
            <span>Start Puzzle Together</span>
          </button>
        </div>
      </div>
    );
  }

  // ----- Puzzle Board -----
  const lockedCount = pieces.filter((p) => p.isLocked).length;
  const progress = totalPieces > 0 ? Math.round((lockedCount / totalPieces) * 100) : 0;

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-[#0E0E15]/95 shadow-2xl">
      {/* Game Header */}
      <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#12121A]/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
            <Puzzle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Puzzle Together</h3>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>{DIFFICULTIES[difficulty].label} • {cols}×{rows}</span>
              <span className="text-zinc-600">|</span>
              <span>{moveCount} moves</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress Pill */}
          <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-zinc-300 font-medium">{progress}%</span>
          </div>

          {/* Difficulty Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDiffMenuOpen(!diffMenuOpen)}
              className="px-3 py-1.5 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <span>{DIFFICULTIES[difficulty].label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {diffMenuOpen && (
              <div className="absolute top-full right-0 mt-1 py-1 rounded-xl bg-[#1A1628] border border-white/10 shadow-2xl z-50 min-w-[120px]">
                {DIFFICULTIES.map((d, idx) => (
                  <button
                    key={d.label}
                    onClick={() => {
                      setDifficulty(idx);
                      setDiffMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-white/[0.06] transition-colors ${
                      difficulty === idx ? "text-purple-400 font-semibold" : "text-zinc-300"
                    }`}
                  >
                    {d.label} ({d.cols}×{d.rows})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={() => initPuzzle(true)}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>

          {/* New Image */}
          <button
            onClick={() => {
              setShowSetup(true);
              onSendGameMove({ action: "PUZZLE_RESET", data: {} });
            }}
            className="px-3 py-1.5 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Image</span>
          </button>

          <button
            onClick={onCloseGame}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Puzzle Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" ref={containerRef}>
        {isComplete ? (
          /* Completion celebration */
          <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-50 duration-500">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600/30 to-rose-600/30 border border-purple-500/40 flex items-center justify-center glow-rose shadow-2xl">
                <Trophy className="w-12 h-12 text-amber-400" />
              </div>
              <Sparkles className="w-6 h-6 text-purple-400 absolute -top-2 -right-2 animate-spin" />
              <Sparkles className="w-4 h-4 text-rose-400 absolute -bottom-1 -left-1 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Puzzle Complete! 🎉</h2>
            <p className="text-sm text-zinc-400 mb-1">
              You solved it together in <span className="text-purple-300 font-semibold">{moveCount} moves</span>!
            </p>
            <p className="text-xs text-zinc-500 mb-6">Teamwork makes the dream work 💜</p>

            {/* Show completed image */}
            <div className="w-64 h-64 rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl mb-6">
              {puzzleImage.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={puzzleImage.src} alt="Completed puzzle" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: puzzleImage.src }} />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => initPuzzle(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-sm font-medium shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <button
                onClick={() => {
                  setShowSetup(true);
                  onSendGameMove({ action: "PUZZLE_RESET", data: {} });
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 flex items-center gap-2 transition-all"
              >
                <ImagePlus className="w-4 h-4" />
                New Image
              </button>
            </div>
          </div>
        ) : (
          /* Active puzzle grid */
          <div
            className="grid gap-1.5 sm:gap-2 w-full max-w-[min(100%,60vh)] aspect-square"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {Array.from({ length: totalPieces }, (_, pos) => {
              const piece = pieces.find((p) => p.currentPos === pos);
              if (!piece) return <div key={pos} />;

              const isSelected = selectedPiece === pos;
              const isCorrect = piece.isLocked;

              return (
                <button
                  key={pos}
                  onClick={() => handlePieceClick(pos)}
                  disabled={isCorrect}
                  className={`relative rounded-lg sm:rounded-xl overflow-hidden transition-all duration-200 border-2 ${
                    isCorrect
                      ? "border-emerald-500/50 shadow-md shadow-emerald-900/30 cursor-default ring-1 ring-emerald-400/30"
                      : isSelected
                      ? "border-purple-400 shadow-lg shadow-purple-900/50 scale-[1.06] z-10 ring-2 ring-purple-500/60"
                      : "border-white/10 hover:border-purple-400/50 hover:scale-[1.03] cursor-pointer hover:shadow-lg"
                  }`}
                >
                  {/* Piece image slice */}
                  <div className="w-full h-full aspect-square">
                    {puzzleImage.type === "image" ? (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${puzzleImage.src})`,
                          backgroundSize: `${cols * 100}% ${rows * 100}%`,
                          backgroundPosition: `${cols > 1 ? ((piece.id % cols) / (cols - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(piece.id / cols) / (rows - 1)) * 100 : 0}%`,
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: puzzleImage.src,
                          backgroundSize: `${cols * 100}% ${rows * 100}%`,
                          backgroundPosition: `${cols > 1 ? ((piece.id % cols) / (cols - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(piece.id / cols) / (rows - 1)) * 100 : 0}%`,
                        }}
                      />
                    )}
                  </div>

                  {/* Piece number badge */}
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shadow-sm ${
                      isCorrect
                        ? "bg-emerald-500 text-white"
                        : "bg-black/60 text-white/70 backdrop-blur-sm"
                    }`}
                  >
                    {piece.id + 1}
                  </span>

                  {/* Lock checkmark */}
                  {isCorrect && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                      <span className="text-lg">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom instructions */}
      {!isComplete && (
        <div className="px-5 py-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-500 bg-[#12121A]/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/40" />
              Click two pieces to swap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
              Correct = locked in place
            </span>
          </div>
          <span className="text-zinc-400 font-medium">
            {lockedCount}/{totalPieces} solved
          </span>
        </div>
      )}
    </div>
  );
}
