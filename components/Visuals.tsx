
import React, { useState, useEffect } from 'react';

interface RandomRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: any;
  durationMin?: number;
  durationMax?: number;
  distance?: number;
  delay?: number;
  style?: React.CSSProperties;
}

export const RandomReveal: React.FC<RandomRevealProps> = ({ 
  children, 
  className = '', 
  as: Component = 'div',
  durationMin = 2,
  durationMax = 3,
  distance = 800, // Large distance for the "pull up" effect from far away
  delay = 0,
  style: propStyle = {}
}) => {
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'translate(0,0)', // Placeholder
    transition: 'none'
  });

  useEffect(() => {
    // Calculate random starting position
    const angle = Math.random() * Math.PI * 2;
    // Ensure it's far enough to be off-screen or significant
    const dist = distance + Math.random() * (distance / 2);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const duration = durationMin + Math.random() * (durationMax - durationMin);
    
    // Set Initial State (Off-screen)
    setAnimStyle({
      opacity: 0,
      transform: `translate(${x}px, ${y}px)`,
      transition: 'none'
    });

    // Trigger Animation to Final State
    const t = setTimeout(() => {
        setAnimStyle({
            opacity: 1,
            transform: 'translate(0,0)',
            transition: `transform ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${duration}s ease-out`
        });
    }, 100 + (delay * 1000));

    return () => clearTimeout(t);
  }, []);

  const mergedStyle = { ...propStyle, ...animStyle };
  
  // Ensure elements that need layout allow transform
  if (Component === 'span' || Component === 'label') {
      mergedStyle.display = 'inline-block';
  }

  return <Component className={className} style={mergedStyle}>{children}</Component>;
};

export const RandomText: React.FC<{ text: string; className?: string; distance?: number }> = ({ text, className = '', distance = 500 }) => {
  return (
      <span className={className} style={{ display: 'inline-block', wordBreak: 'break-word' }}>
          {text.split('').map((char, i) => (
              <RandomReveal 
                key={i} 
                as="span" 
                distance={distance} 
                style={{ whiteSpace: 'pre' }}
              >
                  {char}
              </RandomReveal>
          ))}
      </span>
  );
};
