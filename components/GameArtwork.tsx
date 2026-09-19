import React from 'react';
import { AppId } from '../types';

interface GameArtworkProps {
  id: AppId;
  color: string;
}

export const GameArtwork: React.FC<GameArtworkProps> = ({ id, color }) => {
  switch (id) {
    case 'tic-tac-toe':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Tic Tac Toe classic grid with red O and blue X */}
          <line x1="36" y1="12" x2="36" y2="88" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
          <line x1="64" y1="12" x2="64" y2="88" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
          <line x1="12" y1="36" x2="88" y2="36" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
          <line x1="12" y1="64" x2="88" y2="64" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
          {/* Blue X at top-left */}
          <line x1="18" y1="18" x2="30" y2="30" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          <line x1="30" y1="18" x2="18" y2="30" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          {/* Red O at center */}
          <circle cx="50" cy="50" r="8" fill="none" stroke="#f43f5e" strokeWidth="6" />
          {/* Blue X at bottom-right */}
          <line x1="70" y1="70" x2="82" y2="82" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          <line x1="82" y1="70" x2="70" y2="82" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case 'ultimate-tictactoe':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
          {/* Master grid */}
          <line x1="35" y1="8" x2="35" y2="92" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="65" y1="8" x2="65" y2="92" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="8" y1="35" x2="92" y2="35" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="8" y1="65" x2="92" y2="65" stroke="#fbbf24" strokeWidth="4.5" strokeLinecap="round" />
          {/* Mini subgrids */}
          <g stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
            <line x1="17" y1="12" x2="17" y2="31" /><line x1="26" y1="12" x2="26" y2="31" />
            <line x1="12" y1="18" x2="31" y2="18" /><line x1="12" y1="25" x2="31" y2="25" />
          </g>
          {/* Big Cross in center board */}
          <line x1="40" y1="40" x2="60" y2="60" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          <line x1="60" y1="40" x2="40" y2="60" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          {/* Big Circle in top-right board */}
          <circle cx="80" cy="22" r="9" fill="none" stroke="#f43f5e" strokeWidth="5" />
        </svg>
      );

    case 'snake':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Grassy grid checkered pattern */}
          <rect x="10" y="10" width="80" height="80" rx="12" fill="#14532d" />
          <rect x="10" y="10" width="40" height="40" fill="#166534" />
          <rect x="50" y="50" width="40" height="40" fill="#166534" />
          {/* Snake body */}
          <path d="M 22 75 L 22 45 Q 22 30 38 30 L 62 30 Q 75 30 75 42 L 75 58" fill="none" stroke="#4ade80" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          {/* Snake head */}
          <circle cx="75" cy="60" r="7.5" fill="#22c55e" />
          <circle cx="72" cy="62" r="2" fill="#000" />
          <circle cx="78" cy="62" r="2" fill="#000" />
          {/* Red Apple */}
          <circle cx="48" cy="66" r="7" fill="#ef4444" />
          <path d="M 48 59 Q 50 55 53 56" fill="none" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'brick-breaker':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Top colored arcade bricks */}
          <rect x="12" y="15" width="22" height="9" rx="2" fill="#ef4444" />
          <rect x="39" y="15" width="22" height="9" rx="2" fill="#ef4444" />
          <rect x="66" y="15" width="22" height="9" rx="2" fill="#ef4444" />
          <rect x="12" y="28" width="22" height="9" rx="2" fill="#f59e0b" />
          <rect x="39" y="28" width="22" height="9" rx="2" fill="#10b981" />
          <rect x="66" y="28" width="22" height="9" rx="2" fill="#3b82f6" />
          {/* Ball & trajectory */}
          <circle cx="48" cy="56" r="4.5" fill="#ffffff" />
          <line x1="38" y1="72" x2="47" y2="58" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="3,3" />
          {/* Paddle */}
          <rect x="25" y="78" width="50" height="9" rx="4.5" fill="#38bdf8" />
          <rect x="27" y="80" width="46" height="3" rx="1.5" fill="#ffffff" opacity="0.6" />
        </svg>
      );

    case 'game-2048':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          <rect x="10" y="10" width="80" height="80" rx="14" fill="#1e293b" />
          {/* 4 tiles */}
          <rect x="16" y="16" width="31" height="31" rx="6" fill="#f97316" />
          <text x="31.5" y="37" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="central">2</text>

          <rect x="53" y="16" width="31" height="31" rx="6" fill="#ec4899" />
          <text x="68.5" y="37" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="central">4</text>

          <rect x="16" y="53" width="31" height="31" rx="6" fill="#10b981" />
          <text x="31.5" y="74" fill="#fff" fontSize="15" fontWeight="900" textAnchor="middle" dominantBaseline="central">8</text>

          <rect x="53" y="53" width="31" height="31" rx="6" fill="#eab308" />
          <text x="68.5" y="74" fill="#000" fontSize="11" fontWeight="900" textAnchor="middle" dominantBaseline="central">2048</text>
        </svg>
      );

    case 'connect-4':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Blue board */}
          <rect x="10" y="15" width="80" height="70" rx="10" fill="#2563eb" />
          {/* Grid holes with chips */}
          <circle cx="25" cy="32" r="8" fill="#1e3a8a" />
          <circle cx="45" cy="32" r="8" fill="#ef4444" />
          <circle cx="65" cy="32" r="8" fill="#1e3a8a" />
          <circle cx="85" cy="32" r="8" fill="#eab308" />

          <circle cx="25" cy="52" r="8" fill="#ef4444" />
          <circle cx="45" cy="52" r="8" fill="#eab308" />
          <circle cx="65" cy="52" r="8" fill="#ef4444" />
          <circle cx="85" cy="52" r="8" fill="#1e3a8a" />

          <circle cx="25" cy="72" r="8" fill="#eab308" />
          <circle cx="45" cy="72" r="8" fill="#ef4444" />
          <circle cx="65" cy="72" r="8" fill="#ef4444" />
          <circle cx="85" cy="72" r="8" fill="#eab308" />
        </svg>
      );

    case 'checkers':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          <rect x="10" y="10" width="80" height="80" rx="10" fill="#3f3f46" />
          {/* Checkered pattern */}
          <rect x="10" y="10" width="20" height="20" fill="#71717a" />
          <rect x="50" y="10" width="20" height="20" fill="#71717a" />
          <rect x="30" y="30" width="20" height="20" fill="#71717a" />
          <rect x="70" y="30" width="20" height="20" fill="#71717a" />
          <rect x="10" y="50" width="20" height="20" fill="#71717a" />
          <rect x="50" y="50" width="20" height="20" fill="#71717a" />
          <rect x="30" y="70" width="20" height="20" fill="#71717a" />
          <rect x="70" y="70" width="20" height="20" fill="#71717a" />
          {/* Pieces */}
          <circle cx="20" cy="20" r="7" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
          <circle cx="60" cy="20" r="7" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
          <circle cx="40" cy="80" r="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="80" cy="80" r="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          {/* King Crown on one piece */}
          <circle cx="40" cy="40" r="7" fill="#ef4444" stroke="#fef08a" strokeWidth="2.5" />
        </svg>
      );

    case 'dots-and-boxes':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Captured boxes */}
          <rect x="25" y="25" width="25" height="25" fill="rgba(14, 165, 233, 0.35)" />
          <text x="37.5" y="38" fill="#38bdf8" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central">A</text>
          <rect x="50" y="25" width="25" height="25" fill="rgba(244, 63, 94, 0.35)" />
          <text x="62.5" y="38" fill="#fb7185" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central">B</text>
          {/* Lines */}
          <line x1="25" y1="25" x2="50" y2="25" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <line x1="25" y1="25" x2="25" y2="50" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <line x1="25" y1="50" x2="50" y2="50" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="25" x2="50" y2="50" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="25" x2="75" y2="25" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />
          <line x1="75" y1="25" x2="75" y2="50" stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />
          {/* 3x3 Dots */}
          {[25, 50, 75].map(x =>
            [25, 50, 75].map(y => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#ffffff" />
            ))
          )}
        </svg>
      );

    case 'fruit-merge':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Glass jar background */}
          <rect x="18" y="20" width="64" height="68" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          {/* Dropping fruits */}
          {/* Giant Watermelon */}
          <circle cx="42" cy="64" r="18" fill="#10b981" stroke="#047857" strokeWidth="2" />
          <path d="M 30 54 Q 42 66 54 54" stroke="#065f46" strokeWidth="2" fill="none" />
          <circle cx="42" cy="62" r="13" fill="#ef4444" />
          {/* Orange */}
          <circle cx="68" cy="68" r="11" fill="#f97316" />
          {/* Cherry */}
          <circle cx="48" cy="36" r="6.5" fill="#dc2626" />
          <circle cx="58" cy="38" r="6.5" fill="#dc2626" />
          <path d="M 48 36 Q 53 26 58 38" fill="none" stroke="#65a30d" strokeWidth="2" />
        </svg>
      );

    case 'mine':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Grid blocks */}
          <rect x="15" y="15" width="32" height="32" rx="4" fill="#334155" stroke="#475569" strokeWidth="2" />
          <text x="31" y="32" fill="#38bdf8" fontSize="20" fontWeight="900" textAnchor="middle" dominantBaseline="central">1</text>

          <rect x="53" y="15" width="32" height="32" rx="4" fill="#334155" stroke="#475569" strokeWidth="2" />
          <text x="69" y="32" fill="#22c55e" fontSize="20" fontWeight="900" textAnchor="middle" dominantBaseline="central">2</text>

          <rect x="15" y="53" width="32" height="32" rx="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
          {/* Red Flag */}
          <path d="M 27 61 L 39 67 L 27 73 Z" fill="#ffffff" />
          <line x1="27" y1="60" x2="27" y2="78" stroke="#ffffff" strokeWidth="2" />

          {/* Unopened with bomb */}
          <rect x="53" y="53" width="32" height="32" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          <circle cx="69" cy="69" r="8" fill="#ffffff" />
          <line x1="61" y1="69" x2="77" y2="69" stroke="#ffffff" strokeWidth="2" />
          <line x1="69" y1="61" x2="69" y2="77" stroke="#ffffff" strokeWidth="2" />
          <circle cx="67" cy="67" r="2" fill="#ef4444" />
        </svg>
      );

    case 'taco':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Taco shell */}
          <path d="M 15 65 Q 50 15 85 65 Z" fill="#f59e0b" />
          {/* Fillings */}
          <path d="M 22 62 Q 50 24 78 62" fill="#ef4444" />
          <path d="M 26 60 Q 50 30 74 60" fill="#22c55e" />
          <circle cx="42" cy="48" r="3.5" fill="#eab308" />
          <circle cx="58" cy="46" r="3.5" fill="#eab308" />
          {/* Keyboard keys below */}
          <rect x="18" y="74" width="16" height="12" rx="3" fill="#ffffff" />
          <text x="26" y="80" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="central">A</text>
          <rect x="42" y="74" width="16" height="12" rx="3" fill="#ffffff" />
          <text x="50" y="80" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="central">S</text>
          <rect x="66" y="74" width="16" height="12" rx="3" fill="#ffffff" />
          <text x="74" y="80" fill="#000" fontSize="8" fontWeight="bold" textAnchor="middle" dominantBaseline="central">D</text>
        </svg>
      );

    case 'wordle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* 3 Wordle letter boxes */}
          <rect x="12" y="32" width="22" height="26" rx="4" fill="#22c55e" />
          <text x="23" y="45" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="central">W</text>

          <rect x="39" y="32" width="22" height="26" rx="4" fill="#eab308" />
          <text x="50" y="45" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="central">I</text>

          <rect x="66" y="32" width="22" height="26" rx="4" fill="#3f3f46" />
          <text x="77" y="45" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="central">N</text>
        </svg>
      );

    case 'color-memory':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Artist Color Palette with Paint Blobs & Brush */}
          <path
            d="M 22 45 C 16 28 32 14 55 14 C 78 14 88 28 88 48 C 88 68 76 86 52 86 C 38 86 35 76 35 70 C 35 64 42 62 42 54 C 42 46 32 46 22 45 Z"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2.5"
          />
          {/* Thumb hole */}
          <circle cx="68" cy="68" r="6.5" fill="#0a0d14" stroke="#475569" strokeWidth="1.5" />
          {/* Vibrant Color Drops on palette */}
          <circle cx="34" cy="30" r="5.5" fill="#ec4899" />
          <circle cx="50" cy="24" r="5.5" fill="#38bdf8" />
          <circle cx="68" cy="30" r="5.5" fill="#eab308" />
          <circle cx="78" cy="46" r="5.5" fill="#22c55e" />
          {/* Paint Brush */}
          <line x1="18" y1="82" x2="44" y2="56" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 44 56 L 50 50 L 46 46 L 40 52 Z" fill="#d97706" />
          <path d="M 50 50 L 56 44 C 58 42 59 45 56 49 Z" fill="#ec4899" />
        </svg>
      );

    case 'simon':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Simon 4-quadrant circular disc */}
          <circle cx="50" cy="50" r="42" fill="#18181b" stroke="#27272a" strokeWidth="2" />
          {/* 4 Simon-says quadrant pads */}
          <path d="M 46 46 L 46 16 A 32 32 0 0 0 16 46 Z" fill="#22c55e" />
          <path d="M 54 46 L 84 46 A 32 32 0 0 0 54 16 Z" fill="#ef4444" />
          <path d="M 46 54 L 16 54 A 32 32 0 0 0 46 84 Z" fill="#eab308" />
          <path d="M 54 54 L 54 84 A 32 32 0 0 0 84 54 Z" fill="#3b82f6" />
          {/* Center console */}
          <circle cx="50" cy="50" r="14" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
          <circle cx="50" cy="50" r="6" fill="#fbbf24" />
        </svg>
      );

    case 'particle-physics':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Atom orbits and glowing nuclei */}
          <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="#38bdf8" strokeWidth="2.5" transform="rotate(30 50 50)" />
          <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="#f43f5e" strokeWidth="2.5" transform="rotate(-30 50 50)" />
          <circle cx="50" cy="50" r="8" fill="#fbbf24" />
          <circle cx="22" cy="40" r="4" fill="#38bdf8" />
          <circle cx="78" cy="60" r="4" fill="#f43f5e" />
        </svg>
      );

    case 'angle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Protractor arc & acute angle */}
          <path d="M 25 75 A 45 45 0 0 1 75 75" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeDasharray="3,3" />
          <line x1="20" y1="75" x2="80" y2="75" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <line x1="20" y1="75" x2="68" y2="30" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
          <path d="M 42 75 A 22 22 0 0 0 38 60" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <text x="48" y="62" fill="#fbbf24" fontSize="12" fontWeight="bold">45°</text>
        </svg>
      );

    case 'spelling-bee':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Bee body */}
          <ellipse cx="50" cy="54" rx="22" ry="17" fill="#fbbf24" />
          <path d="M 43 38 L 43 70" stroke="#000000" strokeWidth="5" />
          <path d="M 57 38 L 57 70" stroke="#000000" strokeWidth="5" />
          {/* Wings */}
          <ellipse cx="44" cy="30" rx="9" ry="14" fill="#e0f2fe" opacity="0.8" transform="rotate(-20 44 30)" />
          <ellipse cx="56" cy="30" rx="9" ry="14" fill="#e0f2fe" opacity="0.8" transform="rotate(20 56 30)" />
          {/* Eye */}
          <circle cx="34" cy="50" r="2.5" fill="#000000" />
        </svg>
      );

    case 'iq':
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Brain / Lightbulb hybrid */}
          <circle cx="50" cy="46" r="24" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <path d="M 40 70 L 60 70 L 56 82 L 44 82 Z" fill="#fbbf24" />
          <line x1="50" y1="28" x2="50" y2="40" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="38" y1="46" x2="62" y2="46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
};
