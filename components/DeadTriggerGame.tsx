import React, { useEffect } from 'react';
import { incrementGamePlays } from '../services/firebase';
import DeadTriggerApp from '../Dead Trigger/src/App';
import '../Dead Trigger/src/index.css';

interface DeadTriggerGameProps {
  onBackToHub: () => void;
  user?: any;
  username?: string | null;
}

export default function DeadTriggerGame({ onBackToHub }: DeadTriggerGameProps) {
  useEffect(() => {
    incrementGamePlays('dead_trigger');
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#060706]">
      <DeadTriggerApp onBackToHub={onBackToHub} />
    </div>
  );
}
