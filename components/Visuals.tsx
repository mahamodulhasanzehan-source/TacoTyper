
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface RandomRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: any;
  duration?: number;
  distance?: number; // How far elements fly from in Chaos mode
  delay?: number;
  style?: React.CSSProperties;
  [key: string]: any;
}

export const RandomReveal: React.FC<RandomRevealProps> = ({ 
  children, 
  className = '', 
  as: Component = 'div',
  duration = 0.8,
  distance = 100, 
  delay = 0,
  style: propStyle = {},
  ...props 
}) => {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);

  // LOGIC CHANGE:
  // 1. duration is now fixed (snappy) unless setting is 0.
  // 2. delay is scaled by the setting slider (0x to 6x).
  const ANIMATION_SPEED_CONSTANT = 0.6; 
  const effectiveDuration = settings.animDuration === 0 ? 0 : ANIMATION_SPEED_CONSTANT;
  
  // Scale delay: If slider is 6, delay is 6x longer. If 0, delay is 0.
  // Base delay is passed in seconds (e.g. 0.1s).
  const effectiveDelay = delay * settings.animDuration; 

  // --- CHAOS CALCULATIONS ---
  const [initialTransform] = useState(() => {
    if (settings.reducedMotion) {
        return `translate3d(0, 20px, 0)`;
    }

    // Chaos Mode:
    const angle = Math.random() * Math.PI * 2;
    const dist = distance * (0.8 + Math.random() * 0.7);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const rotate = (Math.random() - 0.5) * 90;
    const scale = 0.5 + Math.random() * 0.5;

    return `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`;
  });

  useEffect(() => {
    // Determine wait time in ms
    const wait = (effectiveDelay * 1000) + 50; // Small buffer

    const t = setTimeout(() => {
        setIsVisible(true);
    }, wait);

    return () => clearTimeout(t);
  }, [delay, settings.animDuration]);

  const animationStyle: React.CSSProperties = {
      opacity: isVisible ? 1 : 0,
      transform: isVisible 
          ? 'translate3d(0,0,0) rotate(0deg) scale(1)' // End state
          : initialTransform, // Start state
      transition: `transform ${effectiveDuration}s var(--ease-spring), opacity ${effectiveDuration}s ease-out`,
      willChange: 'transform, opacity',
      ...propStyle
  };
  
  if (Component === 'span' || Component === 'label' || Component === 'a' || Component === 'strong') {
      animationStyle.display = 'inline-block';
  }

  return <Component className={className} style={animationStyle} {...props}>{children}</Component>;
};

export const RandomText: React.FC<{ text: string; className?: string; distance?: number; stagger?: number }> = ({ text, className = '', distance = 200, stagger = 0.05 }) => {
  return (
      <span className={className} style={{ display: 'inline-block', wordBreak: 'break-word' }}>
          {text.split('').map((char, i) => {
              if (char === ' ') {
                  return <span key={i}>&nbsp;</span>;
              }
              return (
                  <RandomReveal 
                    key={i} 
                    as="span" 
                    distance={distance}
                    delay={i * stagger}
                    duration={0.6} // overridden internally
                  >
                      {char}
                  </RandomReveal>
              );
          })}
      </span>
  );
};
