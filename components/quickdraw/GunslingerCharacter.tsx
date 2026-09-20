import React from 'react';

interface GunslingerProps {
  isPlayer: boolean;
  state: 'idle' | 'ready' | 'steady' | 'fire' | 'round_over' | 'match_over';
  winner: 'player' | 'bot' | 'foul' | null;
  reactionTime?: number | null;
}

export const GunslingerCharacter: React.FC<GunslingerProps> = ({
  isPlayer,
  state,
  winner,
  reactionTime
}) => {
  const isWinner = (isPlayer && winner === 'player') || (!isPlayer && winner === 'bot');
  const isLoser = (isPlayer && winner === 'bot') || (!isPlayer && winner === 'player');
  const isDrawing = state === 'fire' || isWinner;

  // Primary colors
  const coatColor = isPlayer ? '#1e3a8a' : '#7f1d1d';
  const hatColor = isPlayer ? '#172554' : '#450a0a';
  const scarfColor = isPlayer ? '#38bdf8' : '#f87171';

  return (
    <div className={`flex flex-col items-center select-none ${isPlayer ? '' : '-scale-x-100'}`}>
      <svg
        viewBox="0 0 140 220"
        className={`w-36 h-56 sm:w-44 sm:h-64 transition-transform duration-200 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${
          isLoser ? 'translate-y-8 rotate-12 opacity-80' : isWinner ? '-translate-y-2' : ''
        }`}
      >
        <defs>
          {/* Muzzle Flash Radial Gradient */}
          <radialGradient id={`muzzleGlow-${isPlayer ? 'p' : 'b'}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Shadow on desert ground */}
        <ellipse cx="70" cy="208" rx="42" ry="7" fill="rgba(0,0,0,0.4)" />

        {/* Legs / Leather Chaps */}
        <path d="M 52 140 L 46 200 L 60 200 L 64 140 Z" fill="#292524" />
        <path d="M 76 140 L 80 200 L 94 200 L 88 140 Z" fill="#292524" />
        {/* Boots with spurs */}
        <rect x="42" y="198" width="20" height="9" rx="2" fill="#1c1917" />
        <rect x="78" y="198" width="20" height="9" rx="2" fill="#1c1917" />
        <circle cx="43" cy="202" r="2" fill="#fbbf24" />
        <circle cx="97" cy="202" r="2" fill="#fbbf24" />

        {/* Long Duster Coat Body */}
        <path
          d="M 44 80 L 32 170 L 62 170 L 70 115 L 78 170 L 108 170 L 96 80 Z"
          fill={coatColor}
        />
        {/* Shirt & Vest */}
        <path d="M 54 80 L 58 135 L 82 135 L 86 80 Z" fill="#d6d3d1" />
        {/* Bandolier / Belt */}
        <line x1="48" y1="84" x2="88" y2="132" stroke="#78350f" strokeWidth="4" />
        <circle cx="62" cy="102" r="2" fill="#fbbf24" />
        <circle cx="72" cy="114" r="2" fill="#fbbf24" />
        <rect x="52" y="132" width="36" height="6" rx="1" fill="#451a03" />
        <rect x="66" y="131" width="8" height="8" rx="1" fill="#f59e0b" />

        {/* Neck Scarf */}
        <path d="M 56 74 L 84 74 L 70 94 Z" fill={scarfColor} />

        {/* Head & Face */}
        <rect x="58" y="44" width="24" height="26" rx="6" fill="#fbcfe8" />
        {/* Beard / Stubble */}
        <path d="M 60 58 Q 70 70 80 58 Q 75 74 65 74 Z" fill="#44403c" opacity="0.6" />
        {/* Eyes */}
        <circle cx="64" cy="52" r="1.5" fill="#1c1917" />
        <circle cx="76" cy="52" r="1.5" fill="#1c1917" />

        {/* Western Cowboy Hat */}
        {/* Brim with curved edges */}
        <path d="M 28 42 C 40 38, 100 38, 112 42 C 104 35, 36 35, 28 42 Z" fill={hatColor} />
        {/* Crown with crease */}
        <path d="M 48 40 L 52 16 C 62 20, 78 20, 88 16 L 92 40 Z" fill={hatColor} />
        {/* Hat band */}
        <line x1="49" y1="38" x2="91" y2="38" stroke="#f59e0b" strokeWidth="2.5" />

        {/* Arms & Revolver Stance */}
        {isDrawing ? (
          // DRAWING & FIRING POSE: Gun raised and extended straight forward
          <g>
            {/* Extended Right Arm */}
            <path d="M 88 84 L 115 88 L 115 98 L 88 94 Z" fill={coatColor} />
            {/* Hand gripping revolver */}
            <circle cx="118" cy="93" r="5" fill="#fbcfe8" />
            {/* Heavy Revolver Pistol */}
            {/* Grip */}
            <rect x="114" y="93" width="5" height="12" rx="1" fill="#78350f" transform="rotate(-15 114 93)" />
            {/* Cylinder */}
            <rect x="118" y="88" width="8" height="7" rx="1" fill="#334155" />
            {/* Long Steel Barrel */}
            <rect x="126" y="89" width="16" height="4" fill="#0f172a" />
            <rect x="140" y="87" width="2" height="3" fill="#0f172a" />

            {/* Muzzle Flash & Smoke when in FIRE or WINNER state */}
            {(state === 'fire' || isWinner) && (
              <g className="animate-pulse">
                {/* Radial Flash Burst */}
                <circle cx="148" cy="91" r="14" fill={`url(#muzzleGlow-${isPlayer ? 'p' : 'b'})`} />
                <path d="M 144 91 L 164 88 L 150 95 L 160 98 L 146 93 Z" fill="#ffffff" />
                {/* Gunsmoke */}
                <circle cx="152" cy="85" r="4" fill="rgba(203,213,225,0.5)" />
                <circle cx="158" cy="81" r="6" fill="rgba(203,213,225,0.3)" />
              </g>
            )}
          </g>
        ) : (
          // RESTING / READY POSE: Hand hovering right beside hip holster
          <g>
            {/* Left Arm hanging relaxed */}
            <path d="M 44 82 L 36 128 L 44 130 L 50 86 Z" fill={coatColor} />
            {/* Right Arm poised at hip */}
            <path d="M 94 82 L 102 120 L 96 128 L 88 88 Z" fill={coatColor} />
            {/* Poised Hand over holster */}
            <circle
              cx="98"
              cy="128"
              r="5.5"
              fill="#fbcfe8"
              className={state === 'ready' || state === 'steady' ? 'animate-bounce' : ''}
            />
            {/* Leather Holster with gun butt visible */}
            <rect x="90" y="125" width="8" height="18" rx="2" fill="#451a03" />
            <path d="M 94 122 L 100 119 L 98 125 Z" fill="#1e293b" />
          </g>
        )}
      </svg>

      {/* Name & Reaction Time Badge */}
      <div className={`mt-2 flex flex-col items-center ${isPlayer ? '' : ''}`}>
        <span
          className={`text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
            isPlayer ? 'bg-blue-900/60 text-sky-400 border border-sky-500/40' : 'bg-red-950/60 text-rose-400 border border-rose-500/40'
          }`}
        >
          {isPlayer ? 'You (The Kid)' : 'Outlaw Black-Bart'}
        </span>
        {reactionTime !== null && reactionTime !== undefined && (
          <span className="text-[11px] font-mono text-amber-400 mt-0.5 font-bold">
            {reactionTime}ms
          </span>
        )}
      </div>
    </div>
  );
};
