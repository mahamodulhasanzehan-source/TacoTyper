
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

  // Use the global setting for duration, ignoring the prop to ensure consistency with the user request
  // Exception: If setting is 0, duration is 0.
  const effectiveDuration = settings.animDuration;

  // --- CHAOS CALCULATIONS ---
  // We calculate these once on mount so they are stable, but random per instance.
  // This creates the "fly in from everywhere" effect.
  const [initialTransform] = useState(() => {
    if (settings.reducedMotion) {
        // Simple slide up for reduced motion
        return `translate3d(0, 20px, 0)`;
    }

    // Chaos Mode:
    // 1. Random Angle (0 to 360 degrees)
    const angle = Math.random() * Math.PI * 2;
    // 2. Random Distance Variance (0.8x to 1.5x the prop distance)
    const dist = distance * (0.8 + Math.random() * 0.7);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    
    // 3. Random Rotation (-45deg to 45deg) - Adds to the chaotic feel
    const rotate = (Math.random() - 0.5) * 90;
    
    // 4. Random Scale (Start small or slightly large)
    const scale = 0.5 + Math.random() * 0.5;

    return `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`;
  });

  useEffect(() => {
    // Determine wait time.
    // In Reduced Motion, we still stagger slightly but keep it snappy.
    const wait = 50 + (delay * 1000);

    const t = setTimeout(() => {
        setIsVisible(true);
    }, wait);

    return () => clearTimeout(t);
  }, [delay]);

  const animationStyle: React.CSSProperties = {
      opacity: isVisible ? 1 : 0,
      transform: isVisible 
          ? 'translate3d(0,0,0) rotate(0deg) scale(1)' // End state: Perfectly aligned
          : initialTransform, // Start state: Chaos
      transition: `transform ${effectiveDuration}s var(--ease-spring), opacity ${effectiveDuration}s ease-out`,
      willChange: 'transform, opacity',
      ...propStyle
  };
  
  // Inline blocks for text elements to ensure transforms work correctly on spans
  if (Component === 'span' || Component === 'label' || Component === 'a' || Component === 'strong') {
      animationStyle.display = 'inline-block';
  }

  return <Component className={className} style={animationStyle} {...props}>{children}</Component>;
};

export const RandomText: React.FC<{ text: string; className?: string; distance?: number; stagger?: number }> = ({ text, className = '', distance = 200, stagger = 0.05 }) => {
  // Split by character but preserve spaces
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
                    distance={distance} // Pass high distance for flying letters
                    delay={i * stagger}
                    duration={0.6} // This prop is now overridden by global settings in RandomReveal
                  >
                      {char}
                  </RandomReveal>
              );
          })}
      </span>
  );
};
