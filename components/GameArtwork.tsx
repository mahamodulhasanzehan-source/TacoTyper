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
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Base Stand Legs */}
          <path d="M 8 86 L 18 68 L 26 68 L 20 86 Z" fill="#1d4ed8" stroke="#1e40af" strokeWidth="1" />
          <path d="M 92 86 L 82 68 L 74 68 L 80 86 Z" fill="#1d4ed8" stroke="#1e40af" strokeWidth="1" />
          <rect x="14" y="80" width="72" height="6" rx="2" fill="#1e3a8a" />

          {/* Blue Vertical Connect 4 Grid */}
          <rect x="13" y="12" width="74" height="60" rx="6" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
          {/* Top drop slots indents */}
          <rect x="17" y="12" width="66" height="3" fill="#1e40af" />

          {/* 5 columns x 4 rows perfectly aligned grid (cols at 22, 36, 50, 64, 78; rows at 22, 35, 48, 61) */}
          {/* Row 1 (y = 22) */}
          <circle cx="22" cy="22" r="5.2" fill="#0f172a" />
          <circle cx="36" cy="22" r="5.2" fill="#0f172a" />
          <circle cx="50" cy="22" r="5.2" fill="#0f172a" />
          {/* Winning 4th Red Disc */}
          <g>
            <circle cx="64" cy="22" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="64" cy="22" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>
          <circle cx="78" cy="22" r="5.2" fill="#0f172a" />

          {/* Row 2 (y = 35) */}
          <circle cx="22" cy="35" r="5.2" fill="#0f172a" />
          <circle cx="36" cy="35" r="5.2" fill="#0f172a" />
          {/* Winning 3rd Red Disc */}
          <g>
            <circle cx="50" cy="35" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="50" cy="35" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>
          {/* Yellow Disc */}
          <g>
            <circle cx="64" cy="35" r="5.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="64" cy="35" r="3" fill="none" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          <circle cx="78" cy="35" r="5.2" fill="#0f172a" />

          {/* Row 3 (y = 48) */}
          <circle cx="22" cy="48" r="5.2" fill="#0f172a" />
          {/* Winning 2nd Red Disc */}
          <g>
            <circle cx="36" cy="48" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="36" cy="48" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>
          {/* Yellow Disc */}
          <g>
            <circle cx="50" cy="48" r="5.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="50" cy="48" r="3" fill="none" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          {/* Yellow Disc */}
          <g>
            <circle cx="64" cy="48" r="5.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="64" cy="48" r="3" fill="none" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          <circle cx="78" cy="48" r="5.2" fill="#0f172a" />

          {/* Row 4 (y = 61) */}
          {/* Winning 1st Red Disc */}
          <g>
            <circle cx="22" cy="61" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="22" cy="61" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>
          {/* Yellow Disc */}
          <g>
            <circle cx="36" cy="61" r="5.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="36" cy="61" r="3" fill="none" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          {/* Red Disc */}
          <g>
            <circle cx="50" cy="61" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="50" cy="61" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>
          {/* Yellow Disc */}
          <g>
            <circle cx="64" cy="61" r="5.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="64" cy="61" r="3" fill="none" stroke="#fef08a" strokeWidth="0.8" />
          </g>
          {/* Red Disc */}
          <g>
            <circle cx="78" cy="61" r="5.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            <circle cx="78" cy="61" r="3" fill="none" stroke="#fca5a5" strokeWidth="0.8" />
          </g>

          {/* Winning 4-in-a-row highlight tracer */}
          <line x1="20" y1="63" x2="66" y2="20" stroke="#facc15" strokeWidth="2" strokeDasharray="3,2" />
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
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Crispy Folded Golden Taco Shell */}
          <path
            d="M 12 62 C 14 26, 86 26, 88 62 C 84 66, 16 66, 12 62 Z"
            fill="#d97706"
          />
          <path
            d="M 15 60 C 18 28, 82 28, 85 60 C 80 64, 20 64, 15 60 Z"
            fill="#f59e0b"
          />
          {/* Seasoned Ground Beef */}
          <path d="M 22 56 Q 50 28 78 56 Z" fill="#78350f" />
          {/* Crisp Wavy Shredded Lettuce */}
          <path
            d="M 20 54 Q 28 44 36 52 Q 44 42 52 50 Q 60 42 68 50 Q 74 44 80 54 Z"
            fill="#22c55e"
          />
          <path
            d="M 26 50 Q 34 42 42 48 Q 50 38 58 46 Q 66 38 74 48 Z"
            fill="#4ade80"
          />
          {/* Diced Tomato Cubes & Cheddar Cheese shreds */}
          <rect x="30" y="44" width="5" height="5" rx="1" fill="#ef4444" transform="rotate(12 32 46)" />
          <rect x="46" y="38" width="5.5" height="5.5" rx="1" fill="#ef4444" transform="rotate(-8 48 40)" />
          <rect x="64" y="44" width="5" height="5" rx="1" fill="#ef4444" transform="rotate(15 66 46)" />
          <line x1="38" y1="42" x2="44" y2="46" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="56" y1="40" x2="62" y2="43" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="48" y1="46" x2="54" y2="48" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />

          {/* Typing Keyboard Keys Below (T A C O) */}
          <rect x="14" y="74" width="16" height="13" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="22" y="82.5" fill="#38bdf8" fontSize="8.5" fontWeight="900" textAnchor="middle" dominantBaseline="central">T</text>

          <rect x="34" y="74" width="16" height="13" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="42" y="82.5" fill="#f59e0b" fontSize="8.5" fontWeight="900" textAnchor="middle" dominantBaseline="central">A</text>

          <rect x="54" y="74" width="16" height="13" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="62" y="82.5" fill="#22c55e" fontSize="8.5" fontWeight="900" textAnchor="middle" dominantBaseline="central">C</text>

          <rect x="74" y="74" width="16" height="13" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          <text x="82" y="82.5" fill="#ec4899" fontSize="8.5" fontWeight="900" textAnchor="middle" dominantBaseline="central">O</text>
        </svg>
      );

    case 'more-less':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Left Card: MORE (Higher) */}
          <g transform="translate(6, 15)">
            <rect x="0" y="0" width="38" height="54" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
            <polygon points="19,10 27,24 11,24" fill="#34d399" />
            <text x="19" y="34" fill="#6ee7b7" fontSize="8.5" fontWeight="900" textAnchor="middle">MORE</text>
            <text x="19" y="45" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">+150%</text>
          </g>

          {/* Right Card: LESS (Lower) */}
          <g transform="translate(56, 31)">
            <rect x="0" y="0" width="38" height="54" rx="6" fill="#881337" stroke="#f43f5e" strokeWidth="2" />
            <polygon points="19,44 11,30 27,30" fill="#fb7185" />
            <text x="19" y="22" fill="#fda4af" fontSize="8.5" fontWeight="900" textAnchor="middle">LESS</text>
            <text x="19" y="10" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">-50%</text>
          </g>

          {/* Central Balance / VS Spark */}
          <circle cx="50" cy="50" r="10" fill="#090d16" stroke="#fbbf24" strokeWidth="2" />
          <text x="50" y="52" fill="#facc15" fontSize="8" fontWeight="900" textAnchor="middle" dominantBaseline="central">VS</text>
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
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Honeycomb Hexagon Background */}
          <polygon
            points="50,14 78,30 78,62 50,78 22,62 22,30"
            fill="#451a03"
            stroke="#f59e0b"
            strokeWidth="2.5"
            opacity="0.8"
          />
          <polygon
            points="50,22 70,34 70,58 50,70 30,58 30,34"
            fill="#78350f"
            opacity="0.4"
          />

          {/* Translucent Gossamer Wings */}
          <ellipse cx="40" cy="36" rx="8" ry="16" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.2" opacity="0.85" transform="rotate(-30 40 36)" />
          <ellipse cx="60" cy="36" rx="8" ry="16" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.2" opacity="0.85" transform="rotate(30 60 36)" />

          {/* Bee Body (Striped Abdomen & Thorax) */}
          {/* Little stinger at bottom */}
          <polygon points="50,75 48,68 52,68" fill="#18181b" />

          {/* Oval Abdomen */}
          <ellipse cx="50" cy="56" rx="16" ry="14" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          {/* Black Stripes */}
          <path d="M 37 51 Q 50 54 63 51 L 63 56 Q 50 59 37 56 Z" fill="#18181b" />
          <path d="M 39 60 Q 50 63 61 60 L 59 65 Q 50 67 41 65 Z" fill="#18181b" />

          {/* Bee Head */}
          <circle cx="50" cy="40" r="10" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          {/* Cute Eyes */}
          <ellipse cx="46" cy="39" rx="2.5" ry="3.5" fill="#18181b" />
          <circle cx="45" cy="38" r="1" fill="#ffffff" />
          <ellipse cx="54" cy="39" rx="2.5" ry="3.5" fill="#18181b" />
          <circle cx="53" cy="38" r="1" fill="#ffffff" />
          {/* Smile */}
          <path d="M 48 45 Q 50 47 52 45" fill="none" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />

          {/* Antennae */}
          <path d="M 47 31 Q 44 24 39 25" fill="none" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="39" cy="25" r="1.5" fill="#18181b" />
          <path d="M 53 31 Q 56 24 61 25" fill="none" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="61" cy="25" r="1.5" fill="#18181b" />
        </svg>
      );

    case 'quick-draw':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Desert horizon glow */}
          <circle cx="50" cy="50" r="38" fill="#431407" />
          <circle cx="50" cy="50" r="28" fill="#7c2d12" />
          {/* Standoff Revolver */}
          <rect x="25" y="44" width="38" height="10" rx="2" fill="#cbd5e1" />
          <rect x="34" y="38" width="18" height="6" rx="1" fill="#94a3b8" />
          <path d="M 25 50 L 16 68 Q 14 74 22 75 L 30 73 L 34 54 Z" fill="#b45309" />
          {/* Muzzle Flash */}
          <polygon points="65,49 82,39 74,49 88,49 76,55 84,62 67,53" fill="#facc15" />
          <polygon points="65,49 76,44 71,49 80,49 72,52 77,57 66,51" fill="#ef4444" />
        </svg>
      );

    case 'finger-sumo':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Tension meter arc */}
          <rect x="12" y="46" width="76" height="8" rx="4" fill="#1e293b" />
          <rect x="36" y="46" width="28" height="8" rx="4" fill="#e11d48" />
          {/* Central golden marker */}
          <circle cx="50" cy="50" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
          {/* Left Sumo Fist pushing right */}
          <path d="M 12 40 L 28 40 Q 34 40 34 50 Q 34 60 28 60 L 12 60 Z" fill="#38bdf8" />
          <line x1="28" y1="44" x2="38" y2="44" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          {/* Right Sumo Fist pushing left */}
          <path d="M 88 40 L 72 40 Q 66 40 66 50 Q 66 60 72 60 L 88 60 Z" fill="#f43f5e" />
          <line x1="72" y1="44" x2="62" y2="44" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
          {/* Sparks */}
          <polygon points="50,30 52,38 58,40 52,42 50,50 48,42 42,40 48,38" fill="#fde047" />
        </svg>
      );

    case 'pong':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Dark retro court */}
          <rect x="8" y="8" width="84" height="84" rx="8" fill="#020617" stroke="#1e293b" strokeWidth="2" />
          {/* Dashed Center line */}
          <line x1="50" y1="12" x2="50" y2="88" stroke="#334155" strokeWidth="2" strokeDasharray="6,6" />
          {/* Left Player Paddle */}
          <rect x="16" y="32" width="5" height="28" rx="2.5" fill="#38bdf8" />
          {/* Right Bot Paddle */}
          <rect x="79" y="44" width="5" height="28" rx="2.5" fill="#f43f5e" />
          {/* Ball & Motion Trail */}
          <line x1="30" y1="56" x2="48" y2="44" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3,3" opacity="0.6" />
          <rect x="46" y="42" width="6" height="6" fill="#f8fafc" />
        </svg>
      );

    case 'knife-flip':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Wooden target log */}
          <circle cx="50" cy="45" r="26" fill="#78350f" stroke="#451a03" strokeWidth="3" />
          <circle cx="50" cy="45" r="18" fill="#92400e" />
          <circle cx="50" cy="45" r="10" fill="#b45309" />
          {/* Embedded knives radiating */}
          <rect x="48" y="10" width="4" height="16" fill="#94a3b8" />
          <rect x="46" y="6" width="8" height="4" rx="1" fill="#ec4899" />
          <g transform="rotate(75 50 45)">
            <rect x="48" y="10" width="4" height="16" fill="#94a3b8" />
            <rect x="46" y="6" width="8" height="4" rx="1" fill="#ec4899" />
          </g>
          <g transform="rotate(160 50 45)">
            <rect x="48" y="10" width="4" height="16" fill="#94a3b8" />
            <rect x="46" y="6" width="8" height="4" rx="1" fill="#ec4899" />
          </g>
          {/* Incoming blade flying up */}
          <polygon points="50,72 47,82 53,82" fill="#e2e8f0" />
          <rect x="48" y="82" width="4" height="10" fill="#cbd5e1" />
          <rect x="46" y="92" width="8" height="4" rx="1" fill="#ec4899" />
        </svg>
      );

    case 'reversi':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Green felt board */}
          <rect x="10" y="10" width="80" height="80" rx="6" fill="#065f46" stroke="#047857" strokeWidth="2" />
          {/* 4x4 inner grid lines */}
          <line x1="30" y1="10" x2="30" y2="90" stroke="#047857" strokeWidth="1.5" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="#047857" strokeWidth="1.5" />
          <line x1="70" y1="10" x2="70" y2="90" stroke="#047857" strokeWidth="1.5" />
          <line x1="10" y1="30" x2="90" y2="30" stroke="#047857" strokeWidth="1.5" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#047857" strokeWidth="1.5" />
          <line x1="10" y1="70" x2="90" y2="70" stroke="#047857" strokeWidth="1.5" />
          {/* Center Discs: Dark & Light */}
          <circle cx="40" cy="40" r="7" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <circle cx="60" cy="40" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="40" cy="60" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="7" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        </svg>
      );

    case 'battleship':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Naval Radar Grid */}
          <circle cx="50" cy="50" r="38" fill="#082f49" stroke="#0284c7" strokeWidth="2" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx="50" cy="50" r="14" fill="none" stroke="#0284c7" strokeWidth="1" />
          <line x1="12" y1="50" x2="88" y2="50" stroke="#0284c7" strokeWidth="1" />
          <line x1="50" y1="12" x2="50" y2="88" stroke="#0284c7" strokeWidth="1" />
          {/* Radar sweep beam */}
          <path d="M 50 50 L 78 26 A 38 38 0 0 0 50 12 Z" fill="#38bdf8" opacity="0.3" />
          {/* Battleship Silhouette */}
          <path d="M 28 55 L 34 48 L 66 48 L 74 55 L 68 59 L 32 59 Z" fill="#e2e8f0" />
          <rect x="42" y="42" width="16" height="6" fill="#cbd5e1" />
          <rect x="46" y="38" width="6" height="4" fill="#94a3b8" />
          {/* Red Hit Marker */}
          <circle cx="54" cy="51" r="3.5" fill="#ef4444" />
          <circle cx="54" cy="51" r="6" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
        </svg>
      );

    case 'nim':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Row 1: 1 Matchstick (Centered with Flame) */}
          <g>
            {/* Wooden Stem */}
            <rect x="48.5" y="16" width="3.5" height="18" rx="0.8" fill="#d4b996" stroke="#92400e" strokeWidth="0.5" />
            {/* Red Matchhead */}
            <ellipse cx="50.2" cy="15" rx="3" ry="4" fill="#dc2626" />
            <circle cx="49.5" cy="14" r="1.2" fill="#fca5a5" />
            {/* Active Flame */}
            <path d="M 50 11 Q 54 6 50 2 Q 46 6 50 11 Z" fill="#f59e0b" />
            <path d="M 50 10 Q 52 7 50 4 Q 48 7 50 10 Z" fill="#fef08a" />
          </g>

          {/* Row 2: 3 Matchsticks (Centered at 38, 50, 62) */}
          {[38, 50, 62].map((x, i) => (
            <g key={`nim-r2-${i}`}>
              <rect x={x - 1.75} y="42" width="3.5" height="20" rx="0.8" fill="#d4b996" stroke="#92400e" strokeWidth="0.5" />
              <ellipse cx={x} cy="41" rx="3" ry="4" fill="#dc2626" />
              <circle cx={x - 0.7} cy="40" r="1.2" fill="#fca5a5" />
            </g>
          ))}

          {/* Row 3: 5 Matchsticks (Centered at 26, 38, 50, 62, 74) */}
          {[26, 38, 50, 62, 74].map((x, i) => (
            <g key={`nim-r3-${i}`}>
              <rect x={x - 1.75} y="70" width="3.5" height="20" rx="0.8" fill="#d4b996" stroke="#92400e" strokeWidth="0.5" />
              <ellipse cx={x} cy="69" rx="3" ry="4" fill="#dc2626" />
              <circle cx={x - 0.7} cy="68" r="1.2" fill="#fca5a5" />
            </g>
          ))}
        </svg>
      );

    case 'tower-stacker':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Stacked floors */}
          <rect x="18" y="76" width="64" height="14" rx="3" fill="#475569" stroke="#64748b" strokeWidth="1" />
          <rect x="24" y="60" width="52" height="14" rx="3" fill="#06b6d4" stroke="#22d3ee" strokeWidth="1" />
          <rect x="30" y="44" width="40" height="14" rx="3" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="1" />
          <rect x="34" y="28" width="32" height="14" rx="3" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
          {/* Sliding active floor */}
          <rect x="42" y="12" width="32" height="12" rx="3" fill="#ec4899" stroke="#f472b6" strokeWidth="1" />
          {/* Slice off fragment falling */}
          <rect x="76" y="20" width="8" height="12" rx="2" fill="#ec4899" opacity="0.6" transform="rotate(18 80 26)" />
        </svg>
      );

    case 'tetris':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Grid background */}
          <rect x="12" y="10" width="76" height="80" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          {/* Placed bottom blocks */}
          {/* I Piece (cyan) bottom */}
          <rect x="18" y="74" width="14" height="12" rx="2" fill="#06b6d4" />
          <rect x="33" y="74" width="14" height="12" rx="2" fill="#06b6d4" />
          <rect x="48" y="74" width="14" height="12" rx="2" fill="#06b6d4" />
          <rect x="63" y="74" width="14" height="12" rx="2" fill="#06b6d4" />
          {/* O Piece (yellow) */}
          <rect x="18" y="61" width="14" height="12" rx="2" fill="#eab308" />
          <rect x="33" y="61" width="14" height="12" rx="2" fill="#eab308" />
          <rect x="18" y="48" width="14" height="12" rx="2" fill="#eab308" />
          <rect x="33" y="48" width="14" height="12" rx="2" fill="#eab308" />
          {/* T Piece (purple) falling */}
          <rect x="48" y="22" width="14" height="12" rx="2" fill="#a855f7" />
          <rect x="33" y="35" width="14" height="12" rx="2" fill="#a855f7" />
          <rect x="48" y="35" width="14" height="12" rx="2" fill="#a855f7" />
          <rect x="63" y="35" width="14" height="12" rx="2" fill="#a855f7" />
        </svg>
      );

    case 'chess':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {/* Checkered 4x4 background board */}
          <rect x="12" y="12" width="76" height="76" rx="8" fill="#1e1b4b" stroke="#4338ca" strokeWidth="2" />
          <rect x="12" y="12" width="38" height="38" fill="#312e81" />
          <rect x="50" y="50" width="38" height="38" fill="#312e81" />
          {/* Chess Knight Piece Silhouette with Neon Accent */}
          <path
            d="M 32 80 L 68 80 L 64 74 C 64 68 68 62 68 52 C 68 40 58 32 54 22 C 48 24 44 28 42 34 C 38 32 32 35 32 42 C 32 46 36 49 42 50 C 38 56 34 65 32 80 Z"
            fill="#6366f1"
            stroke="#a5b4fc"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Knight eye */}
          <circle cx="42" cy="40" r="2.5" fill="#facc15" />
          {/* Mane detail */}
          <line x1="58" y1="42" x2="65" y2="46" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
          <line x1="56" y1="52" x2="64" y2="56" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'reaction-time':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-1.5 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          {/* Outer Stopwatch Housing */}
          <circle cx="50" cy="54" r="34" fill="#0f172a" stroke="#22c55e" strokeWidth="2.5" />
          {/* Top Crown Button */}
          <rect x="46" y="12" width="8" height="6" rx="1.5" fill="#22c55e" />
          <rect x="44" y="9" width="12" height="3" rx="1" fill="#4ade80" />
          <line x1="50" y1="18" x2="50" y2="20" stroke="#22c55e" strokeWidth="2" />

          {/* Emerald Green Digital Display Face */}
          <circle cx="50" cy="54" r="28" fill="#14532d" stroke="#16a34a" strokeWidth="1" />
          <circle cx="50" cy="54" r="25" fill="#052e16" />

          {/* Stopwatch Ticks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line
              key={`tick-${deg}`}
              x1="50"
              y1="32"
              x2="50"
              y2="34"
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${deg} 50 54)`}
            />
          ))}

          {/* Digital Reaction Time Readout */}
          <text x="50" y="52" fill="#4ade80" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="monospace">
            215
          </text>
          <text x="50" y="63" fill="#86efac" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="monospace">
            MS
          </text>

          {/* Golden Electric Lightning Bolt */}
          <polygon
            points="68,26 56,48 64,48 54,74 74,42 64,42"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="0.8"
            className="filter drop-shadow-[0_0_6px_#fde047]"
          />
        </svg>
      );

    case 'dead-trigger':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full p-1 select-none">
          <defs>
            <radialGradient id="dt-bg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2e0505" />
              <stop offset="65%" stopColor="#140202" />
              <stop offset="100%" stopColor="#050101" />
            </radialGradient>
            <radialGradient id="dt-blood-glow" cx="50%" cy="50%" r="48%">
              <stop offset="0%" stopColor="#ff2525" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff2525" stopOpacity="0" />
            </radialGradient>
            <filter id="dt-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grungy Decay Chamber Background */}
          <rect x="6" y="6" width="88" height="88" rx="14" fill="url(#dt-bg-glow)" stroke="#ff2525" strokeWidth="2.2" strokeOpacity="0.7" />
          <circle cx="50" cy="50" r="38" fill="url(#dt-blood-glow)" />

          {/* Radar / Scope Rings */}
          <circle cx="50" cy="50" r="34" fill="none" stroke="#ff2525" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
          <circle cx="50" cy="50" r="23" fill="none" stroke="#39ff14" strokeWidth="1" opacity="0.35" />

          {/* Zombie Silhouette in Target Crosshair */}
          <g opacity="0.9">
            {/* Zombie Head */}
            <path
              d="M 39 39 C 37 27, 63 27, 61 39 C 61 45, 57 49, 50 49 C 43 49, 39 45, 39 39 Z"
              fill="#18221a"
              stroke="#0b120d"
              strokeWidth="1.2"
            />
            {/* Gritted Jaw / Teeth */}
            <path d="M 44 44 L 56 44 L 54 48 L 46 48 Z" fill="#3f1414" />
            <line x1="47.5" y1="44" x2="47.5" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.75" />
            <line x1="50" y1="44" x2="50" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.75" />
            <line x1="52.5" y1="44" x2="52.5" y2="48" stroke="#ffffff" strokeWidth="0.9" opacity="0.75" />
            
            {/* Glowing Radioactive Crimson Zombie Eyes */}
            <circle cx="44.5" cy="36.5" r="2.2" fill="#ff2525" filter="url(#dt-glow)" />
            <circle cx="55.5" cy="36.5" r="2.2" fill="#ff2525" filter="url(#dt-glow)" />
            <circle cx="44.5" cy="36.5" r="0.9" fill="#ffff88" />
            <circle cx="55.5" cy="36.5" r="0.9" fill="#ffff88" />

            {/* Zombie Torso & Shoulders */}
            <path
              d="M 26 68 C 28 53, 40 51, 50 51 C 60 51, 72 53, 74 68 Z"
              fill="#111713"
            />
          </g>

          {/* Biohazard Symbol Background Accent */}
          <g transform="translate(50, 50) scale(0.62)" opacity="0.45" stroke="#ff2525" strokeWidth="2.5" fill="none">
            <circle cx="0" cy="-14" r="9" />
            <circle cx="-12" cy="7" r="9" />
            <circle cx="12" cy="7" r="9" />
            <circle cx="0" cy="0" r="5" stroke="#39ff14" />
          </g>

          {/* Laser Sniper Reticle / Precision Crosshairs */}
          <line x1="10" y1="50" x2="36" y2="50" stroke="#39ff14" strokeWidth="1.8" filter="url(#dt-glow)" />
          <line x1="64" y1="50" x2="90" y2="50" stroke="#39ff14" strokeWidth="1.8" filter="url(#dt-glow)" />
          <line x1="50" y1="10" x2="50" y2="36" stroke="#39ff14" strokeWidth="1.8" filter="url(#dt-glow)" />
          <line x1="50" y1="64" x2="50" y2="90" stroke="#39ff14" strokeWidth="1.8" filter="url(#dt-glow)" />

          {/* Milliradian Ticks on Reticle */}
          <line x1="26" y1="47.5" x2="26" y2="52.5" stroke="#39ff14" strokeWidth="1.2" opacity="0.8" />
          <line x1="74" y1="47.5" x2="74" y2="52.5" stroke="#39ff14" strokeWidth="1.2" opacity="0.8" />
          <line x1="47.5" y1="26" x2="52.5" y2="26" stroke="#39ff14" strokeWidth="1.2" opacity="0.8" />
          <line x1="47.5" y1="74" x2="52.5" y2="74" stroke="#39ff14" strokeWidth="1.2" opacity="0.8" />

          {/* Reticle Inner Target Ring and Center Bullseye */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="#ff2525" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="2.5" fill="#ff2525" filter="url(#dt-glow)" />

          {/* Tactical Corner Brackets */}
          <path d="M 14 24 L 14 14 L 24 14" fill="none" stroke="#ff2525" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 86 24 L 86 14 L 76 14" fill="none" stroke="#ff2525" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 14 76 L 14 86 L 24 86" fill="none" stroke="#ff2525" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 86 76 L 86 86 L 76 86" fill="none" stroke="#ff2525" strokeWidth="2.5" strokeLinecap="round" />

          {/* Hazard Biohazard Strip */}
          <rect x="34" y="80" width="32" height="7.5" rx="2" fill="#7f1d1d" stroke="#ff2525" strokeWidth="0.8" />
          <text x="50" y="85.5" fill="#ffdddd" fontSize="5.2" fontWeight="900" textAnchor="middle" fontFamily="monospace" letterSpacing="0.8">
            SURVIVAL
          </text>
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
