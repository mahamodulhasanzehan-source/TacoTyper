import React from 'react';

interface ShipSilhouetteProps {
  id: string;
  horizontal?: boolean;
  className?: string;
}

export const ShipSilhouette: React.FC<ShipSilhouetteProps> = ({ id, horizontal = true, className = '' }) => {
  const getSvgContent = () => {
    switch (id) {
      case 'carrier':
        // Modern Aircraft Carrier silhouette: angled flight deck, tower island, landing strip markings, radar mast
        return (
          <svg viewBox="0 0 200 48" className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="carrierHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="deckGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Hull & Main Deck */}
            <path
              d="M 12 28 L 28 10 L 186 10 L 196 22 L 186 38 L 26 38 Z"
              fill="url(#carrierHull)"
              stroke="#0284c7"
              strokeWidth="1.5"
            />
            {/* Angled Runway Stripe */}
            <line x1="34" y1="24" x2="175" y2="24" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,4" />
            <line x1="28" y1="16" x2="115" y2="16" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
            {/* Carrier Island Superstructure */}
            <rect x="135" y="12" width="28" height="11" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            {/* Radar dome & mast */}
            <circle cx="156" cy="15" r="3" fill="#38bdf8" />
            <line x1="144" y1="12" x2="144" y2="6" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="144" cy="5" r="1.5" fill="#e0f2fe" />
            {/* Landing deck edge lights */}
            <circle cx="34" cy="24" r="1.5" fill="#facc15" />
            <circle cx="180" cy="24" r="1.5" fill="#38bdf8" />
          </svg>
        );

      case 'battleship':
        // Heavy Battleship: streamlined bow, twin forward turrets, bridge tower, aft turret
        return (
          <svg viewBox="0 0 160 40" className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="battleshipHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            {/* Razor Bow Hull */}
            <path
              d="M 6 20 L 26 8 L 140 8 L 154 20 L 140 32 L 26 32 Z"
              fill="url(#battleshipHull)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            {/* Superstructure center */}
            <rect x="68" y="12" width="34" height="16" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
            <line x1="85" y1="12" x2="85" y2="5" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Forward Heavy Turret 1 */}
            <circle cx="36" cy="20" r="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="36" y1="18.5" x2="22" y2="18.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="36" y1="21.5" x2="22" y2="21.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Forward Heavy Turret 2 */}
            <circle cx="52" cy="20" r="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="52" y1="18.5" x2="38" y2="18.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="21.5" x2="38" y2="21.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Aft Turret */}
            <circle cx="120" cy="20" r="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="120" y1="18.5" x2="134" y2="18.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="120" y1="21.5" x2="134" y2="21.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case 'cruiser':
        // Guided Missile Cruiser: tapered sleek hull, radar radome, missile array
        return (
          <svg viewBox="0 0 120 36" className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="cruiserHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="60%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            <path
              d="M 6 18 L 22 8 L 104 8 L 114 18 L 104 28 L 22 28 Z"
              fill="url(#cruiserHull)"
              stroke="#0ea5e9"
              strokeWidth="1.5"
            />
            {/* Bridge */}
            <rect x="46" y="11" width="28" height="14" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <circle cx="60" cy="18" r="3" fill="#38bdf8" />
            {/* Forward gun mount */}
            <circle cx="30" cy="18" r="4" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="30" y1="18" x2="18" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Aft VLS missile cells */}
            <rect x="84" y="13" width="14" height="10" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            <line x1="91" y1="13" x2="91" y2="23" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
          </svg>
        );

      case 'submarine':
        // Stealth Attack Submarine: cigar-shaped hull, conning tower sail, diving planes, propeller rudder
        return (
          <svg viewBox="0 0 120 34" className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="subHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#090d16" />
                <stop offset="50%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            {/* Submarine Torpedo Hull */}
            <path
              d="M 12 17 C 12 8, 26 7, 50 7 L 98 7 C 108 7, 114 12, 114 17 C 114 22, 108 27, 98 27 L 50 27 C 26 27, 12 26, 12 17 Z"
              fill="url(#subHull)"
              stroke="#06b6d4"
              strokeWidth="1.5"
            />
            {/* Conning Tower (Sail) */}
            <rect x="52" y="11" width="18" height="12" rx="4" fill="#082f49" stroke="#38bdf8" strokeWidth="1" />
            {/* Periscope / Sonar */}
            <circle cx="61" cy="17" r="2.5" fill="#22d3ee" />
            {/* Stern Fins / Propeller */}
            <path d="M 112 10 L 118 7 L 118 27 L 112 24 Z" fill="#0891b2" />
            {/* Bow Sonar Dome */}
            <circle cx="18" cy="17" r="4" fill="#083344" stroke="#06b6d4" strokeWidth="1" />
          </svg>
        );

      case 'destroyer':
      default:
        // Agile Fast Destroyer: compact sleek hull, dual antennas, torpedo rack
        return (
          <svg viewBox="0 0 80 32" className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <defs>
              <linearGradient id="destroyerHull" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            <path
              d="M 6 16 L 16 8 L 68 8 L 76 16 L 68 24 L 16 24 Z"
              fill="url(#destroyerHull)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            {/* Bridge */}
            <rect x="30" y="11" width="18" height="10" rx="2" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1" />
            <line x1="39" y1="11" x2="39" y2="5" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Forward gun */}
            <circle cx="20" cy="16" r="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
            <line x1="20" y1="16" x2="11" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            {/* Aft depth charges */}
            <circle cx="58" cy="16" r="2.5" fill="#f43f5e" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-center transition-transform ${
        horizontal ? '' : 'rotate-90'
      } ${className}`}
    >
      {getSvgContent()}
    </div>
  );
};
