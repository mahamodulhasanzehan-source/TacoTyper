
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface RandomRevealProps {
  children: React.ReactNode;
  className?: string;
  as?: any;
  duration?: number; // Standardized duration
  distance?: number;
  delay?: number;
  style?: React.CSSProperties;
  [key: string]: any; // Allow arbitrary props like onClick
}

export const RandomReveal: React.FC<RandomRevealProps> = ({ 
  children, 
  className = '', 
  as: Component = 'div',
  duration = 0.6,
  distance = 50, // Reduced default distance for subtler effect
  delay = 0,
  style: propStyle = {},
  ...props 
}) => {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);

  // Randomize direction slightly for organic feel
  const [angle] = useState(() => Math.random() * Math.PI * 2);

  useEffect(() => {
    // If fast boot is on, or distance is 0, show immediately without animation logic
    if (settings.fastBoot || distance === 0) {
        setIsVisible(true);
        return;
    }

    // Small timeout to allow React to paint the initial "hidden" state
    const t = setTimeout(() => {
        setIsVisible(true);
    }, 50 + (delay * 1000));

    return () => clearTimeout(t);
  }, [delay, settings.fastBoot, distance]);

  // Calculate transform values
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  const animationStyle: React.CSSProperties = settings.fastBoot ? {
      opacity: 1,
      transform: 'none'
  } : {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translate3d(0,0,0) scale(1)' : `translate3d(${x}px, ${y}px, 0) scale(0.95)`,
      transition: `transform ${duration}s var(--ease-out-expo), opacity ${duration}s ease-out`,
      willChange: 'transform, opacity'
  };

  const mergedStyle = { ...propStyle, ...animationStyle };
  
  // Ensure elements that need layout allow transform
  if (Component === 'span' || Component === 'label' || Component === 'a') {
      mergedStyle.display = 'inline-block';
  }

  return <Component className={className} style={mergedStyle} {...props}>{children}</Component>;
};

export const RandomText: React.FC<{ text: string; className?: string; distance?: number; stagger?: number }> = ({ text, className = '', distance = 20, stagger = 0.03 }) => {
  return (
      <span className={className} style={{ display: 'inline-block', wordBreak: 'break-word' }}>
          {text.split('').map((char, i) => (
              <RandomReveal 
                key={i} 
                as="span" 
                distance={distance} 
                delay={i * stagger}
                duration={0.4}
                style={{ whiteSpace: 'pre' }}
              >
                  {char}
              </RandomReveal>
          ))}
      </span>
  );
};
