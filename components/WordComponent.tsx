
import React from 'react';
import { WordEntity } from '../types';
import { COLORS } from '../constants';

interface WordProps {
  word: WordEntity;
  isActive: boolean;
  onClick: (word: WordEntity) => void;
}

const WordComponent: React.FC<WordProps> = ({ word, isActive, onClick }) => {
  const getStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      // Use translate3d for GPU acceleration
      transform: `translate3d(${word.x}px, ${word.y}px, 0) ${isActive ? 'scale(1.1)' : 'scale(1)'}`,
      top: 0,
      left: 0,
      padding: '5px 10px',
      borderWidth: '3px',
      borderStyle: 'solid',
      borderRadius: '4px',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      transition: 'transform 0.1s linear, background-color 0.2s ease', // Linear transform for falling, ease for interactions
      cursor: 'pointer',
      zIndex: isActive ? 30 : 20,
      willChange: 'transform'
    };

    if (word.type === 'rotten') {
      return {
        ...baseStyle,
        borderColor: '#7cfc00',
        color: '#7cfc00',
        fontFamily: '"Creepster", cursive',
        letterSpacing: '2px',
        boxShadow: '0 0 5px #7cfc00',
        backgroundColor: isActive ? '#330000' : '#222',
      };
    }

    if (word.type === 'heart') {
      return {
        ...baseStyle,
        borderColor: '#ff69b4',
        color: '#ff69b4',
        boxShadow: '0 0 8px #ff69b4',
        backgroundColor: isActive ? COLORS.warn : '#222',
      };
    }

    return {
      ...baseStyle,
      borderColor: isActive ? COLORS.text : COLORS.text,
      color: COLORS.text,
      backgroundColor: isActive ? COLORS.warn : '#222',
      boxShadow: isActive ? `0 0 10px ${COLORS.warn}` : 'none',
    };
  };

  const getRemainingColor = () => {
    if (word.type === 'rotten') return '#7cfc00';
    if (word.type === 'heart') return '#ff69b4';
    return isActive ? '#111' : COLORS.text;
  };
  
  const getTypedColor = () => {
      if (word.type === 'rotten' && isActive) return '#ff0000'; 
      return COLORS.correct;
  }

  const remainingText = word.text.substring(word.typed.length);

  // Apply heart-beat class only if it's a heart type
  const animateClass = word.type === 'heart' ? 'animate-heart-beat' : '';

  return (
    <div
      style={getStyle()}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick(word);
      }}
      className={`word ${animateClass} hover:border-[#f4b400] text-base md:text-2xl ${word.y < 50 ? 'word-enter' : ''}`}
    >
      <span 
        style={{ 
            color: getTypedColor(), 
            textDecoration: (word.type === 'rotten' && isActive) ? 'line-through' : 'none' 
        }}
      >
        {word.typed}
      </span>
      <span style={{ color: getRemainingColor() }}>
        {remainingText}
      </span>
    </div>
  );
};

export default WordComponent;
