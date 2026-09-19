"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Puzzle,
  ImagePlus,
  RotateCcw,
  Trophy,
  Sparkles,
  X,
  Zap,
  Eye,
  Heart,
  HelpCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PieceEdges {
  top: number; // 0 = flat (outer border), +1 = tab outward, -1 = blank inward
  right: number;
  bottom: number;
  left: number;
}

interface PieceData {
  id: number;
  row: number;
  col: number;
  edges: PieceEdges;
  x: number; // top-left coordinate of the piece cell (excluding tab offset)
  y: number;
  isLocked: boolean;
}

interface PuzzleGameProps {
  userRole: "owner" | "partner";
  onSendGameMove: (payload: {
    action: string;
    data: Record<string, unknown>;
  }) => void;
  lastRemoteMove: {
    action: string;
    data: Record<string, unknown>;
  } | null;
  onCloseGame: () => void;
}

/* ------------------------------------------------------------------ */
/*  Audio Chimes (Web Audio API)                                       */
/* ------------------------------------------------------------------ */

function playSnapChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Ignore autoplay restriction
  }
}

function playVictoryChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.1 + 0.28
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.28);
    });
  } catch {
    // Ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Constants & Presets                                                */
/* ------------------------------------------------------------------ */

const DIFFICULTIES = [
  { label: "Easy", cols: 3, rows: 3 },
  { label: "Medium", cols: 4, rows: 4 },
  { label: "Hard", cols: 5, rows: 5 },
];

const PRESETS = [
  {
    id: "classic_blocks",
    label: "🧩 Jigsaw Blocks",
    description: "Vibrant puzzle pattern",
    colors: [
      "#E63946",
      "#F4A261",
      "#E76F51",
      "#2A9D8F",
      "#264653",
      "#E9C46A",
      "#D81159",
      "#8F2D56",
      "#218380",
      "#73D2DE",
      "#FFBC42",
      "#457B9D",
    ],
  },
  {
    id: "sunset",
    label: "🌅 Sunset Romance",
    description: "Warm gradient sunset",
    colors: ["#ff6b6b", "#ee5a24", "#f0932b", "#ffbe76", "#fd79a8"],
  },
  {
    id: "aurora",
    label: "🌌 Cosmic Aurora",
    description: "Dreamy stars and glow",
    colors: ["#6c5ce7", "#a29bfe", "#00cec9", "#55efc4", "#0984e3"],
  },
  {
    id: "rose",
    label: "🌹 Cherry Blossom",
    description: "Soft romantic pinks",
    colors: ["#e84393", "#fd79a8", "#fab1a0", "#ffeaa7", "#d63031"],
  },
  {
    id: "ocean",
    label: "🌊 Deep Lagoon",
    description: "Teal & sapphire depths",
    colors: ["#0c2461", "#0a3d62", "#3c6382", "#60a3bc", "#82ccdd"],
  },
];

/* ------------------------------------------------------------------ */
/*  Procedural Image Generation & Resizing                             */
/* ------------------------------------------------------------------ */

function generatePresetDataUrl(presetId: string, size = 420): string {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  if (presetId === "classic_blocks") {
    // Colorful mosaic blocks inspired by the classic jigsaw puzzle palette
    const preset = PRESETS[0];
    const gridN = 6;
    const s = size / gridN;
    let colorIdx = 0;
    for (let r = 0; r < gridN; r++) {
      for (let col = 0; col < gridN; col++) {
        ctx.fillStyle = preset.colors[colorIdx % preset.colors.length];
        ctx.fillRect(col * s, r * s, s, s);
        // Highlight accent
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(col * s, r * s, s, 3);
        ctx.fillRect(col * s, r * s, 3, s);
        // Subtle shadow
        ctx.fillStyle = "rgba(0,0,0,0.14)";
        ctx.fillRect(col * s, (r + 1) * s - 3, s, 3);
        ctx.fillRect((col + 1) * s - 3, r * s, 3, s);
        colorIdx++;
      }
    }
  } else {
    // Multi-stop gradient with glowing overlay
    const p = PRESETS.find((x) => x.id === presetId) || PRESETS[1];
    const g = ctx.createLinearGradient(0, 0, size, size);
    p.colors.forEach((col, i) =>
      g.addColorStop(i / (p.colors.length - 1), col)
    );
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Subtle soft vignette
    const rad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.2,
      size / 2,
      size / 2,
      size * 0.75
    );
    rad.addColorStop(0, "rgba(255,255,255,0.08)");
    rad.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, size, size);
  }

  return c.toDataURL("image/jpeg", 0.75);
}

function resizeImageToSquare(dataUrl: string, maxSize = 420): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = Math.min(img.width, img.height);
      c.width = maxSize;
      c.height = maxSize;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(
        img,
        (img.width - s) / 2,
        (img.height - s) / 2,
        s,
        s,
        0,
        0,
        maxSize,
        maxSize
      );
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = dataUrl;
  });
}

/* ------------------------------------------------------------------ */
/*  SVG Jigsaw Path Generators (Mathematical Interlocking Tabs)        */
/* ------------------------------------------------------------------ */

/**
 * Draws one edge of a jigsaw piece between (fx, fy) and (tx, ty).
 * `tab`: 0 = flat outer border, +1 = tab protruding outward, -1 = blank indenting inward.
 * Outward direction is the CW perpendicular of the from→to vector.
 */
function edgePath(
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  tab: number
): string {
  if (tab === 0) return `L ${tx.toFixed(2)} ${ty.toFixed(2)} `;

  const dx = tx - fx;
  const dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  // CW perpendicular
  const px = uy;
  const py = -ux;
  const t = len * 0.21 * tab; // depth of the tab/blank

  const pt = (u: number, pMult: number) =>
    `${(fx + ux * len * u + px * t * pMult).toFixed(2)} ${(
      fy +
      uy * len * u +
      py * t * pMult
    ).toFixed(2)}`;

  let d = "";
  // 1. Line to base of neck (u = 0.36)
  d += `L ${pt(0.36, 0)} `;
  // 2. Bezier: neck waist → head shoulder
  d += `C ${pt(0.37, 0)}, ${pt(0.35, 0.15)}, ${pt(0.32, 0.55)} `;
  // 3. Bezier: bulb head round apex
  d += `C ${pt(0.3, 0.9)}, ${pt(0.4, 1.08)}, ${pt(0.5, 1.08)} `;
  // 4. Bezier: apex → other head shoulder
  d += `C ${pt(0.6, 1.08)}, ${pt(0.7, 0.9)}, ${pt(0.68, 0.55)} `;
  // 5. Bezier: other shoulder → neck exit
  d += `C ${pt(0.65, 0.15)}, ${pt(0.63, 0)}, ${pt(0.64, 0)} `;
  // 6. Line to edge endpoint
  d += `L ${tx.toFixed(2)} ${ty.toFixed(2)} `;

  return d;
}

/**
 * Generates full closed SVG path for a jigsaw piece in clockwise order.
 * `ts` is the tab margin offset so coordinates stay positive within the viewBox.
 */
function jigsawPath(
  w: number,
  h: number,
  ts: number,
  edges: PieceEdges
): string {
  const x0 = ts;
  const y0 = ts;
  const x1 = ts + w;
  const y1 = ts + h;

  let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} `;
  d += edgePath(x0, y0, x1, y0, edges.top); // top edge:    left → right
  d += edgePath(x1, y0, x1, y1, edges.right); // right edge:  top → bottom
  d += edgePath(x1, y1, x0, y1, edges.bottom); // bottom edge: right → left
  d += edgePath(x0, y1, x0, y0, edges.left); // left edge:   bottom → top
  d += "Z";
  return d;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PuzzleGame({
  userRole: _userRole,
  onSendGameMove,
  lastRemoteMove,
  onCloseGame,
}: PuzzleGameProps) {
  /* ---- Setup state ---- */
  const [difficulty, setDifficulty] = useState(1); // 0=Easy(3x3), 1=Med(4x4), 2=Hard(5x5)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState("classic_blocks");
  const [showSetup, setShowSetup] = useState(true);

  /* ---- Active game state ---- */
  const [puzzleImage, setPuzzleImage] = useState("");
  const [pieces, setPieces] = useState<PieceData[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [showPeek, setShowPeek] = useState(false);
  const [ghostOpacity, setGhostOpacity] = useState(0.12);
  const [partnerNotice, setPartnerNotice] = useState<string | null>(null);

  /* ---- Layout measurements ---- */
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ w: 700, h: 480 });
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---- Dragging state ---- */
  const [draggingId, setDraggingId] = useState<number | null>(null);

  /* ---- Derived layout ---- */
  const { cols, rows } = DIFFICULTIES[difficulty];
  const boardSize = Math.min(areaSize.w * 0.58, areaSize.h * 0.84, 460);
  const pw = boardSize / cols;
  const ph = boardSize / rows;
  // ts: tab size offset to contain the protruding knobs safely without clipping
  const ts = Math.ceil(Math.max(pw, ph) * 0.28);
  const boardX = (areaSize.w - boardSize) / 2;
  const boardY = (areaSize.h - boardSize) / 2;
  const snapDist = Math.min(pw, ph) * 0.36;

  /* ---- Measure container on resize ---- */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setAreaSize({ w: r.width, h: r.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showSetup, isComplete]);

  /* ---- Initialize puzzle & scatter pieces outside the board ---- */
  const initPuzzle = useCallback(
    (img: string, diff: number, broadcast: boolean) => {
      const { cols: c, rows: r } = DIFFICULTIES[diff];

      // Generate consistent interlocking edge keys
      const hE: number[][] = [];
      for (let ri = 0; ri <= r; ri++) {
        hE[ri] = [];
        for (let ci = 0; ci < c; ci++) {
          hE[ri][ci] =
            ri === 0 || ri === r ? 0 : Math.random() > 0.5 ? 1 : -1;
        }
      }
      const vE: number[][] = [];
      for (let ri = 0; ri < r; ri++) {
        vE[ri] = [];
        for (let ci = 0; ci <= c; ci++) {
          vE[ri][ci] =
            ci === 0 || ci === c ? 0 : Math.random() > 0.5 ? 1 : -1;
        }
      }

      const el = areaRef.current;
      const aw = el?.clientWidth ?? 700;
      const ah = el?.clientHeight ?? 480;
      const curBoardSize = Math.min(aw * 0.58, ah * 0.84, 460);
      const curPw = curBoardSize / c;
      const curPh = curBoardSize / r;
      const curBoardX = (aw - curBoardSize) / 2;
      const curBoardY = (ah - curBoardSize) / 2;

      const isLandscape = aw >= ah * 1.15;
      const margin = 16;

      const newPieces: PieceData[] = [];
      let idx = 0;
      for (let ri = 0; ri < r; ri++) {
        for (let ci = 0; ci < c; ci++) {
          let px = 0;
          let py = 0;

          if (isLandscape && curBoardX > curPw + 20) {
            // Split pieces between left and right side trays
            const onLeft = idx % 2 === 0;
            if (onLeft) {
              const maxPx = Math.max(margin, curBoardX - curPw - margin);
              px = margin + Math.random() * (maxPx - margin);
            } else {
              const minPx = curBoardX + curBoardSize + margin;
              const maxPx = Math.max(minPx, aw - curPw - margin);
              px = minPx + Math.random() * (maxPx - minPx);
            }
            py =
              margin +
              Math.random() * Math.max(margin, ah - curPh - margin);
          } else {
            // Vertical / mobile layout: pieces sit in the lower tray
            const minPy = curBoardY + curBoardSize + margin;
            const maxPy = Math.max(minPy, ah - curPh - margin);
            py = minPy + Math.random() * (maxPy - minPy);
            px =
              margin +
              Math.random() * Math.max(margin, aw - curPw - margin);
          }

          newPieces.push({
            id: ri * c + ci,
            row: ri,
            col: ci,
            edges: {
              top: ri === 0 ? 0 : -hE[ri][ci],
              bottom: ri === r - 1 ? 0 : hE[ri + 1][ci],
              left: ci === 0 ? 0 : -vE[ri][ci],
              right: ci === c - 1 ? 0 : vE[ri][ci + 1],
            },
            x: px,
            y: py,
            isLocked: false,
          });
          idx++;
        }
      }

      setPuzzleImage(img);
      setPieces(newPieces);
      setIsComplete(false);
      setMoveCount(0);
      setShowSetup(false);

      if (broadcast) {
        onSendGameMove({
          action: "PUZZLE_INIT",
          data: {
            pieces: newPieces,
            difficulty: diff,
            presetId,
            puzzleImage: img,
          },
        });
      }
    },
    [presetId, onSendGameMove]
  );

  /* ---- Start Game button ---- */
  const startGame = useCallback(() => {
    let img: string;
    if (uploadedUrl) {
      img = uploadedUrl;
    } else {
      img = generatePresetDataUrl(presetId, 420);
    }
    initPuzzle(img, difficulty, true);
  }, [uploadedUrl, presetId, difficulty, initPuzzle]);

  /* ---- Photo Upload handler ---- */
  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const raw = ev.target?.result as string;
        const square = await resizeImageToSquare(raw, 420);
        setUploadedUrl(square);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  /* ---- Drag and Drop (Pointer Events on Window for Rock-Solid Tracking) ---- */
  const handlePointerDown = useCallback(
    (id: number, e: React.PointerEvent) => {
      const piece = pieces.find((p) => p.id === id);
      if (!piece || piece.isLocked) return;

      e.preventDefault();
      e.stopPropagation();

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const origX = piece.x;
      const origY = piece.y;

      setDraggingId(id);

      // Bring clicked piece to top of rendering order
      setPieces((prev) => {
        const rest = prev.filter((p) => p.id !== id);
        const target = prev.find((p) => p.id === id);
        return target ? [...rest, target] : prev;
      });

      const handlePointerMove = (moveEv: PointerEvent) => {
        const nx = origX + (moveEv.clientX - startClientX);
        const ny = origY + (moveEv.clientY - startClientY);
        setPieces((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, x: nx, y: ny } : item
          )
        );
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        setDraggingId(null);

        const endX = origX + (upEv.clientX - startClientX);
        const endY = origY + (upEv.clientY - startClientY);

        setPieces((prev) => {
          const updated = prev.map((item) => {
            if (item.id !== id || item.isLocked) return item;
            const targetX = boardX + item.col * pw;
            const targetY = boardY + item.row * ph;
            const dist = Math.hypot(endX - targetX, endY - targetY);

            if (dist < snapDist) {
              return { ...item, x: targetX, y: targetY, isLocked: true };
            }
            return { ...item, x: endX, y: endY };
          });

          const wasLocked = prev.find((item) => item.id === id)?.isLocked;
          const nowLocked = updated.find((item) => item.id === id)?.isLocked;

          if (!wasLocked && nowLocked) {
            playSnapChime();
            setMoveCount((m) => m + 1);
            const allSolved = updated.every((item) => item.isLocked);
            if (allSolved) {
              setIsComplete(true);
              playVictoryChime();
            }
            onSendGameMove({
              action: "PUZZLE_LOCK",
              data: {
                pieceId: id,
                moveCount: moveCount + 1,
                isComplete: allSolved,
              },
            });
          }
          return updated;
        });
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [pieces, boardX, boardY, pw, ph, snapDist, moveCount, onSendGameMove]
  );

  /* ---- Multiplayer Synchronization Events ---- */
  useEffect(() => {
    if (!lastRemoteMove) return;
    const { action, data } = lastRemoteMove;

    if (action === "PUZZLE_INIT") {
      setPuzzleImage(data.puzzleImage as string);
      setDifficulty(data.difficulty as number);
      setPresetId((data.presetId as string) || "classic_blocks");

      const remotePieces = data.pieces as PieceData[];
      const el = areaRef.current;
      const aw = el?.clientWidth ?? 700;
      const ah = el?.clientHeight ?? 480;
      const c = DIFFICULTIES[data.difficulty as number].cols;
      const r = DIFFICULTIES[data.difficulty as number].rows;
      const curBoardSize = Math.min(aw * 0.58, ah * 0.84, 460);
      const curPw = curBoardSize / c;
      const curPh = curBoardSize / r;
      const curBoardX = (aw - curBoardSize) / 2;
      const curBoardY = (ah - curBoardSize) / 2;
      const isLandscape = aw >= ah * 1.15;
      const margin = 16;

      let idx = 0;
      setPieces(
        remotePieces.map((p) => {
          let px = 0;
          let py = 0;
          if (isLandscape && curBoardX > curPw + 20) {
            const onLeft = idx % 2 === 0;
            if (onLeft) {
              const maxPx = Math.max(margin, curBoardX - curPw - margin);
              px = margin + Math.random() * (maxPx - margin);
            } else {
              const minPx = curBoardX + curBoardSize + margin;
              const maxPx = Math.max(minPx, aw - curPw - margin);
              px = minPx + Math.random() * (maxPx - minPx);
            }
            py =
              margin +
              Math.random() * Math.max(margin, ah - curPh - margin);
          } else {
            const minPy = curBoardY + curBoardSize + margin;
            const maxPy = Math.max(minPy, ah - curPh - margin);
            py = minPy + Math.random() * (maxPy - minPy);
            px =
              margin +
              Math.random() * Math.max(margin, aw - curPw - margin);
          }
          idx++;
          return {
            ...p,
            x: px,
            y: py,
            isLocked: false,
          };
        })
      );
      setIsComplete(false);
      setMoveCount(0);
      setShowSetup(false);
    } else if (action === "PUZZLE_LOCK") {
      const pid = data.pieceId as number;
      playSnapChime();
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pid
            ? {
                ...p,
                x: boardX + p.col * pw,
                y: boardY + p.row * ph,
                isLocked: true,
              }
            : p
        )
      );
      setMoveCount((data.moveCount as number) || moveCount + 1);
      setPartnerNotice("Partner placed a piece! ✨");
      setTimeout(() => setPartnerNotice(null), 2500);

      if (data.isComplete) {
        setIsComplete(true);
        playVictoryChime();
      }
    } else if (action === "PUZZLE_RESET") {
      setShowSetup(true);
      setPieces([]);
      setIsComplete(false);
      setMoveCount(0);
      setUploadedUrl(null);
    }
  }, [lastRemoteMove, boardX, boardY, pw, ph, moveCount]);

  /* ---- SVG Piece Path Cache ---- */
  const pieceClipPaths = useMemo(() => {
    const paths: Record<number, string> = {};
    pieces.forEach((p) => {
      paths[p.id] = jigsawPath(pw, ph, ts, p.edges);
    });
    return paths;
  }, [pieces, pw, ph, ts]);

  const lockedCount = pieces.filter((p) => p.isLocked).length;
  const progress = pieces.length
    ? Math.round((lockedCount / pieces.length) * 100)
    : 0;

  /* ================================================================ */
  /*  SCREEN 1: SETUP MODAL                                           */
  /* ================================================================ */
  if (showSetup) {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-[#0E0E15]/95 shadow-2xl p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/30">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Puzzle Together
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Real Jigsaw
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Solve interlocking jigsaw pieces together in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onCloseGame}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 overflow-y-auto gap-6 max-w-lg mx-auto w-full">
          {/* Picture Selector */}
          <div className="w-full">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <ImagePlus className="w-3.5 h-3.5 text-teal-400" />
              1. Choose Photo or Preset
            </h4>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Custom photo upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-teal-500/30 hover:border-teal-400/60 bg-white/[0.02] hover:bg-teal-600/10 transition-all flex items-center gap-4 mb-4 group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 group-hover:scale-105 transition-transform">
                <ImagePlus className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white block">
                  {uploadedUrl
                    ? "✅ Photo Selected (Click to change)"
                    : "Upload Your Photo (Couple selfie, memory…)"}
                </span>
                <span className="text-xs text-zinc-400 block truncate">
                  {uploadedUrl
                    ? "Optimized & ready to turn into a jigsaw puzzle"
                    : "Supports JPG, PNG, WebP — automatically cropped"}
                </span>
              </div>
            </button>

            {uploadedUrl ? (
              <div className="relative mb-4 rounded-2xl overflow-hidden border border-teal-500/40 shadow-xl max-h-44 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedUrl}
                  alt="Puzzle preview"
                  className="w-full h-44 object-cover"
                />
                <button
                  onClick={() => setUploadedUrl(null)}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs backdrop-blur-sm border border-white/20"
                >
                  Use Presets Instead
                </button>
              </div>
            ) : (
              <div>
                <div className="text-[11px] text-zinc-500 text-center mb-2.5">
                  — or choose from handcrafted presets —
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPresetId(p.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-1 flex flex-col items-center justify-center text-center ${
                        presetId === p.id
                          ? "border-teal-400 ring-2 ring-teal-500/40 shadow-lg scale-105"
                          : "border-white/10 hover:border-white/30 bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className="w-full h-full rounded-lg"
                        style={{
                          background:
                            p.id === "classic_blocks"
                              ? `conic-gradient(from 45deg, ${p.colors.slice(0, 6).join(", ")})`
                              : `linear-gradient(135deg, ${p.colors.slice(0, 3).join(", ")})`,
                        }}
                      />
                      <span className="absolute bottom-1 inset-x-0 text-[9px] text-white font-semibold drop-shadow-md truncate px-0.5">
                        {p.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Difficulty selection */}
          <div className="w-full">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              2. Select Difficulty
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              {DIFFICULTIES.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setDifficulty(i)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    difficulty === i
                      ? "bg-teal-600/30 border-teal-400 text-white shadow-lg shadow-teal-900/40 ring-1 ring-teal-400/50"
                      : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="text-sm font-bold text-white">{d.label}</div>
                  <div className="text-[11px] mt-0.5 text-teal-300/80 font-medium">
                    {d.cols}×{d.rows} ({d.cols * d.rows} pieces)
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Action */}
          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-teal-900/40 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Puzzle className="w-5 h-5" />
            Start Puzzle Together
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  SCREEN 2: VICTORY CELEBRATION                                   */
  /* ================================================================ */
  if (isComplete) {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col items-center justify-center bg-[#0E0E15]/95 shadow-2xl p-6 text-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-teal-500/20 border border-amber-400/40 flex items-center justify-center shadow-2xl shadow-amber-900/30">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <Sparkles className="w-6 h-6 text-teal-400 absolute -top-2 -right-2 animate-bounce" />
          <Heart className="w-5 h-5 text-rose-400 absolute -bottom-1 -left-2 fill-rose-500 animate-pulse" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
          Puzzle Completed! 🧩🎉
        </h2>
        <p className="text-sm text-zinc-300 mb-1">
          Solved as a team in{" "}
          <span className="text-teal-300 font-bold">{moveCount} moves</span>
        </p>
        <p className="text-xs text-zinc-400 mb-5">
          You two make the perfect match 💜
        </p>

        {/* Completed image card */}
        <div className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-2xl mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={puzzleImage}
            alt="Completed Puzzle"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => initPuzzle(puzzleImage, difficulty, true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-teal-900/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
          <button
            onClick={() => {
              setShowSetup(true);
              onSendGameMove({ action: "PUZZLE_RESET", data: {} });
            }}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 flex items-center gap-2 transition-all"
          >
            <ImagePlus className="w-4 h-4" />
            New Picture
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  SCREEN 3: ACTIVE JIGSAW TABLE                                    */
  /* ================================================================ */
  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-[#0E0E15]/95 shadow-2xl select-none">
      {/* Top Navbar */}
      <div className="px-5 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#12121A]/85 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
            <Puzzle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Puzzle Together</h3>
              {partnerNotice && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse">
                  {partnerNotice}
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400">
              {DIFFICULTIES[difficulty].label} • {cols}×{rows} (
              {cols * rows} pcs) • {moveCount} moves
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress gauge */}
          <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs flex items-center gap-2">
            <div className="w-16 sm:w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-zinc-300 font-semibold text-[11px]">
              {progress}%
            </span>
          </div>

          {/* Peek button */}
          <button
            onMouseEnter={() => setShowPeek(true)}
            onMouseLeave={() => setShowPeek(false)}
            onClick={() => setShowPeek((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              showPeek
                ? "bg-teal-500/20 border-teal-400 text-teal-300"
                : "glass-panel border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
            }`}
            title="Peek original photo"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peek</span>
          </button>

          {/* Ghost guide opacity toggle */}
          <button
            onClick={() =>
              setGhostOpacity((prev) =>
                prev === 0.12 ? 0.35 : prev === 0.35 ? 0 : 0.12
              )
            }
            className="px-2.5 py-1.5 rounded-xl glass-panel border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1 hover:bg-white/10 transition-all"
            title="Toggle guide opacity"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">
              Guide: {Math.round(ghostOpacity * 100)}%
            </span>
          </button>

          {/* Shuffle button */}
          <button
            onClick={() => initPuzzle(puzzleImage, difficulty, true)}
            className="px-2.5 py-1.5 rounded-xl glass-panel border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            title="Shuffle pieces"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>

          {/* New game */}
          <button
            onClick={() => {
              setShowSetup(true);
              onSendGameMove({ action: "PUZZLE_RESET", data: {} });
            }}
            className="px-2.5 py-1.5 rounded-xl glass-panel border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            title="Choose new picture"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* Close */}
          <button
            onClick={onCloseGame}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Peek Thumbnail */}
      {showPeek && (
        <div className="absolute top-14 right-5 z-40 p-2 rounded-2xl glass-panel border border-teal-500/40 bg-[#12121A]/95 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[11px] font-semibold text-teal-300 mb-1.5 px-1 flex items-center justify-between">
            <span>Reference Photo</span>
            <span className="text-zinc-500 text-[10px]">Hover to view</span>
          </div>
          <div className="w-44 h-44 rounded-xl overflow-hidden border border-white/10 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={puzzleImage}
              alt="Reference"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Main Jigsaw Work Table */}
      <div
        ref={areaRef}
        className="flex-1 relative overflow-hidden bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px]"
        style={{ touchAction: "none" }}
      >
        {/* Center Board Target Area with Subtle Guide */}
        <div
          className="absolute rounded-xl overflow-hidden pointer-events-none transition-all duration-300"
          style={{
            left: boardX,
            top: boardY,
            width: boardSize,
            height: boardSize,
          }}
        >
          {/* Ghost image for guidance */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={puzzleImage}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: ghostOpacity }}
            draggable={false}
          />

          {/* Board border */}
          <div className="absolute inset-0 border-2 border-dashed border-teal-500/20 rounded-xl" />

          {/* Grid lines */}
          {Array.from({ length: cols - 1 }, (_, i) => (
            <div
              key={`v${i}`}
              className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
              style={{ left: `${((i + 1) / cols) * 100}%` }}
            />
          ))}
          {Array.from({ length: rows - 1 }, (_, i) => (
            <div
              key={`h${i}`}
              className="absolute left-0 right-0 h-px bg-white/[0.06]"
              style={{ top: `${((i + 1) / rows) * 100}%` }}
            />
          ))}
        </div>

        {/* Real Jigsaw Pieces */}
        {pieces.map((piece) => {
          const tw = pw + ts * 2;
          const th = ph + ts * 2;
          const clip = pieceClipPaths[piece.id];
          const isDragging = draggingId === piece.id;

          // If locked, piece snaps strictly to the calculated board grid
          const currentLeft = piece.isLocked
            ? boardX + piece.col * pw - ts
            : piece.x - ts;
          const currentTop = piece.isLocked
            ? boardY + piece.row * ph - ts
            : piece.y - ts;

          return (
            <div
              key={piece.id}
              className={`absolute touch-none select-none ${
                piece.isLocked
                  ? "pointer-events-none"
                  : "cursor-grab active:cursor-grabbing"
              }`}
              style={{
                left: currentLeft,
                top: currentTop,
                width: tw,
                height: th,
                zIndex: isDragging ? 100 : piece.isLocked ? 10 : 30,
                transform: isDragging ? "scale(1.06)" : undefined,
                transition: piece.isLocked
                  ? "left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)"
                  : undefined,
                filter: isDragging
                  ? "drop-shadow(0 14px 28px rgba(0,0,0,0.75))"
                  : piece.isLocked
                  ? "drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
                  : "drop-shadow(0 4px 10px rgba(0,0,0,0.55))",
              }}
              onPointerDown={(e) => handlePointerDown(piece.id, e)}
            >
              <svg
                width={tw}
                height={th}
                viewBox={`0 0 ${tw} ${th}`}
                className="absolute inset-0 overflow-visible"
              >
                <defs>
                  <clipPath id={`jigsaw-clip-${piece.id}`}>
                    <path d={clip} />
                  </clipPath>
                </defs>

                {/* Clipped slice of the puzzle image */}
                <image
                  href={puzzleImage}
                  x={ts - piece.col * pw}
                  y={ts - piece.row * ph}
                  width={boardSize}
                  height={boardSize}
                  clipPath={`url(#jigsaw-clip-${piece.id})`}
                  preserveAspectRatio="none"
                />

                {/* Jigsaw interlocking piece boundary */}
                <path
                  d={clip}
                  fill="none"
                  stroke={
                    piece.isLocked
                      ? "rgba(52, 211, 153, 0.35)"
                      : "rgba(255, 255, 255, 0.45)"
                  }
                  strokeWidth={piece.isLocked ? 1.5 : 1.75}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-5 py-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400 bg-[#12121A]/85 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400/50 border border-teal-400" />
            Drag pieces onto the board
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50 border border-emerald-400" />
            Pieces snap & lock automatically
          </span>
        </div>
        <span className="text-zinc-300 font-semibold">
          {lockedCount} of {pieces.length} pieces locked
        </span>
      </div>
    </div>
  );
}
