"use client";

import { useState, useEffect } from "react";
import { Heart, Sparkles, RefreshCw, Trophy, ArrowRight, MessageCircleHeart, Shuffle, X } from "lucide-react";

export type GameType = "heart_tac_toe" | "connect_four" | "deep_talk";

interface CoupleGamesProps {
  gameType: GameType;
  userRole: "owner" | "partner";
  onSendGameMove: (payload: { action: string; data: Record<string, unknown> }) => void;
  lastRemoteMove: { action: string; data: Record<string, unknown> } | null;
  onCloseGame: () => void;
}

// 20 Curated intimate questions for long-distance couples
const DEEP_QUESTIONS = [
  "What is your favorite memory of us together so far?",
  "If we could teleport anywhere in the world right this second, where would we go?",
  "What was the exact moment you realized you had feelings for me?",
  "What is one little thing I do that always makes you smile without fail?",
  "What is a dream you have for our future together that you haven't talked about much?",
  "What song immediately makes you think of me whenever it plays?",
  "If our relationship was a movie, what genre would it be and what's the title?",
  "What is something you appreciate about how we handle long distance?",
  "What's your favorite photo of us and why?",
  "What is the first thing you want to do the next time we see each other?",
  "What is a habit or quirk of mine that you find secretly adorable?",
  "How have you changed as a person since we met?",
  "What is your idea of a perfect lazy Sunday together?",
  "What is the nicest thing anyone has ever said to you?",
  "If we could spend an entire month anywhere with no responsibilities, where are we living?",
  "What is something new you'd love for us to try together?",
  "What makes you feel most loved and appreciated?",
  "What was your first impression of me versus what you think of me now?",
  "What is something you're proud of yourself for lately?",
  "If you could relive one day from our relationship, which day would you choose?",
];

export function CoupleGames({
  gameType,
  userRole,
  onSendGameMove,
  lastRemoteMove,
  onCloseGame,
}: CoupleGamesProps) {
  // -------------------------------------------------------------
  // 1. HEART-TAC-TOE STATE & LOGIC
  // -------------------------------------------------------------
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"owner" | "partner">("owner");
  const [winner, setWinner] = useState<string | null>(null);

  // My symbol: Host = Rose Heart 💖, Partner = Violet Sparkle ✨
  const mySymbol = userRole === "owner" ? "💖" : "✨";
  const isMyTurn = turn === userRole;

  // Check winner
  function checkWinner(squares: (string | null)[]): string | null {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],             // diagonals
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every((sq) => sq !== null)) return "tie";
    return null;
  }

  function handleCellClick(index: number) {
    if (!isMyTurn || board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    const nextTurn = turn === "owner" ? "partner" : "owner";
    const win = checkWinner(newBoard);

    setBoard(newBoard);
    setTurn(nextTurn);
    if (win) setWinner(win);

    onSendGameMove({
      action: "TAC_TOE_MOVE",
      data: { board: newBoard, turn: nextTurn, winner: win },
    });
  }

  function resetTac() {
    setBoard(Array(9).fill(null));
    setTurn("owner");
    setWinner(null);
    onSendGameMove({
      action: "TAC_TOE_RESET",
      data: {},
    });
  }

  // -------------------------------------------------------------
  // 2. CONNECT FOUR STATE & LOGIC (7 cols x 6 rows)
  // -------------------------------------------------------------
  const [c4Board, setC4Board] = useState<(string | null)[][]>(
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
  const [c4Turn, setC4Turn] = useState<"owner" | "partner">("owner");
  const [c4Winner, setC4Winner] = useState<string | null>(null);

  const isC4MyTurn = c4Turn === userRole;

  function checkC4Win(grid: (string | null)[][]): string | null {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const val = grid[r][c];
        if (!val) continue;

        // Horizontal
        if (c + 3 < 7 && val === grid[r][c + 1] && val === grid[r][c + 2] && val === grid[r][c + 3]) {
          return val;
        }
        // Vertical
        if (r + 3 < 6 && val === grid[r + 1][c] && val === grid[r + 2][c] && val === grid[r + 3][c]) {
          return val;
        }
        // Diagonal down-right
        if (r + 3 < 6 && c + 3 < 7 && val === grid[r + 1][c + 1] && val === grid[r + 2][c + 2] && val === grid[r + 3][c + 3]) {
          return val;
        }
        // Diagonal up-right
        if (r - 3 >= 0 && c + 3 < 7 && val === grid[r - 1][c + 1] && val === grid[r - 2][c + 2] && val === grid[r - 3][c + 3]) {
          return val;
        }
      }
    }

    if (grid[0].every((col) => col !== null)) return "tie";
    return null;
  }

  function handleDropDisc(colIndex: number) {
    if (!isC4MyTurn || c4Winner) return;

    let targetRow = -1;
    for (let r = 5; r >= 0; r--) {
      if (!c4Board[r][colIndex]) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return;

    const newGrid = c4Board.map((row) => [...row]);
    newGrid[targetRow][colIndex] = mySymbol;
    const nextTurn = c4Turn === "owner" ? "partner" : "owner";
    const win = checkC4Win(newGrid);

    setC4Board(newGrid);
    setC4Turn(nextTurn);
    if (win) setC4Winner(win);

    onSendGameMove({
      action: "C4_MOVE",
      data: { board: newGrid, turn: nextTurn, winner: win },
    });
  }

  function resetC4() {
    const empty = Array(6).fill(null).map(() => Array(7).fill(null));
    setC4Board(empty);
    setC4Turn("owner");
    setC4Winner(null);
    onSendGameMove({
      action: "C4_RESET",
      data: {},
    });
  }

  // -------------------------------------------------------------
  // 3. DEEP TALK QUESTIONS STATE
  // -------------------------------------------------------------
  const [questionIndex, setQuestionIndex] = useState(0);

  function nextQuestion() {
    const next = (questionIndex + 1) % DEEP_QUESTIONS.length;
    setQuestionIndex(next);
    onSendGameMove({
      action: "QUESTION_CHANGE",
      data: { index: next },
    });
  }

  function shuffleQuestion() {
    const rand = Math.floor(Math.random() * DEEP_QUESTIONS.length);
    setQuestionIndex(rand);
    onSendGameMove({
      action: "QUESTION_CHANGE",
      data: { index: rand },
    });
  }

  // -------------------------------------------------------------
  // LISTEN TO REMOTE INCOMING MOVES
  // -------------------------------------------------------------
  useEffect(() => {
    if (!lastRemoteMove) return;

    const timer = setTimeout(() => {
      const { action, data } = lastRemoteMove;

      if (action === "TAC_TOE_MOVE" && data.board) {
        setBoard(data.board as (string | null)[]);
        setTurn(data.turn as "owner" | "partner");
        if (data.winner) setWinner(data.winner as string);
      } else if (action === "TAC_TOE_RESET") {
        setBoard(Array(9).fill(null));
        setTurn("owner");
        setWinner(null);
      } else if (action === "C4_MOVE" && data.board) {
        setC4Board(data.board as (string | null)[][]);
        setC4Turn(data.turn as "owner" | "partner");
        if (data.winner) setC4Winner(data.winner as string);
      } else if (action === "C4_RESET") {
        setC4Board(Array(6).fill(null).map(() => Array(7).fill(null)));
        setC4Turn("owner");
        setC4Winner(null);
      } else if (action === "QUESTION_CHANGE" && typeof data.index === "number") {
        setQuestionIndex(data.index);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [lastRemoteMove]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col bg-[#0E0E15]/95 shadow-2xl p-6">
      {/* Game Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
            {gameType === "heart_tac_toe" && <Heart className="w-5 h-5 fill-white" />}
            {gameType === "connect_four" && <Trophy className="w-5 h-5" />}
            {gameType === "deep_talk" && <MessageCircleHeart className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {gameType === "heart_tac_toe" && "Heart-Tac-Toe"}
              {gameType === "connect_four" && "Four in a Row"}
              {gameType === "deep_talk" && "Midnight Pillow Talk"}
            </h3>
            <p className="text-xs text-zinc-400">Synchronized Real-Time Couple Activity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gameType === "heart_tac_toe" && (
            <button
              onClick={resetTac}
              className="px-3.5 py-1.5 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Game</span>
            </button>
          )}

          {gameType === "connect_four" && (
            <button
              onClick={resetC4}
              className="px-3.5 py-1.5 rounded-xl glass-panel text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Board</span>
            </button>
          )}

          {gameType === "deep_talk" && (
            <button
              onClick={shuffleQuestion}
              className="px-3.5 py-1.5 rounded-xl glass-panel text-xs text-purple-300 hover:text-white flex items-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>
          )}

          <button
            onClick={onCloseGame}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Exit Game"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GAME BODY */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 overflow-y-auto">
        {/* 1. HEART-TAC-TOE */}
        {gameType === "heart_tac_toe" && (
          <div className="flex flex-col items-center gap-5">
            {/* Status Turn Pill */}
            <div className="px-4 py-1.5 rounded-full glass-panel text-xs font-medium flex items-center gap-2">
              {winner ? (
                <span className="text-rose-400 font-semibold">
                  {winner === "tie" ? "It's a Cozy Tie! 🤝" : `${winner} Wins The Game! 🎉`}
                </span>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className={isMyTurn ? "text-purple-300 font-semibold" : "text-zinc-400"}>
                    {isMyTurn ? `Your Turn (${mySymbol})` : "Waiting for partner..."}
                  </span>
                </>
              )}
            </div>

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-3xl bg-white/[0.03] border border-white/10">
              {board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isMyTurn || cell !== null || !!winner}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl transition-all duration-200 ${
                    cell
                      ? "bg-white/10 shadow-inner"
                      : isMyTurn && !winner
                      ? "bg-white/[0.04] hover:bg-purple-600/20 hover:border-purple-500/40 border border-white/10 cursor-pointer"
                      : "bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {cell}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. CONNECT FOUR */}
        {gameType === "connect_four" && (
          <div className="flex flex-col items-center gap-4">
            <div className="px-4 py-1.5 rounded-full glass-panel text-xs font-medium flex items-center gap-2">
              {c4Winner ? (
                <span className="text-rose-400 font-semibold">
                  {c4Winner === "tie" ? "Stalemate Tie! 🤝" : `${c4Winner} Connected 4 and Won! 🎉`}
                </span>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className={isC4MyTurn ? "text-purple-300 font-semibold" : "text-zinc-400"}>
                    {isC4MyTurn ? `Your Turn (${mySymbol}) — Click any column` : "Waiting for partner..."}
                  </span>
                </>
              )}
            </div>

            {/* 7 Columns Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-3 rounded-3xl bg-blue-950/30 border border-blue-500/20 shadow-2xl">
              {Array.from({ length: 7 }).map((_, col) => (
                <button
                  key={col}
                  onClick={() => handleDropDisc(col)}
                  disabled={!isC4MyTurn || !!c4Winner}
                  className="flex flex-col gap-1.5 sm:gap-2 p-1 rounded-xl hover:bg-white/[0.05] transition-colors"
                >
                  {Array.from({ length: 6 }).map((_, row) => {
                    const val = c4Board[row][col];
                    return (
                      <div
                        key={row}
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-lg sm:text-xl transition-all ${
                          val
                            ? "bg-white/10 shadow-md"
                            : "bg-black/60 border border-white/10"
                        }`}
                      >
                        {val}
                      </div>
                    );
                  })}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. DEEP TALK QUESTIONS */}
        {gameType === "deep_talk" && (
          <div className="flex flex-col items-center max-w-xl text-center px-4">
            <span className="px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium mb-6">
              Question {questionIndex + 1} of {DEEP_QUESTIONS.length}
            </span>

            <div className="p-8 sm:p-10 rounded-3xl glass-panel border border-purple-500/20 glow-purple shadow-2xl relative w-full mb-8">
              <Sparkles className="w-6 h-6 text-purple-400 absolute top-4 left-4 opacity-50" />
              <Heart className="w-6 h-6 text-rose-400 absolute bottom-4 right-4 opacity-50 fill-rose-500/20" />
              <h2 className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
                &ldquo;{DEEP_QUESTIONS[questionIndex]}&rdquo;
              </h2>
            </div>

            <button
              onClick={nextQuestion}
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium text-sm shadow-xl shadow-purple-900/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span>Next Intimate Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
