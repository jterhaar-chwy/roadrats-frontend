import React, { useState, useEffect, useCallback } from 'react';
import styles from '@/styles/global/scurryRat.module.scss';

interface Rat {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  direction: 'left' | 'right';
  size: number;
}

// Frequency presets: maps 1-5 slider to min/max interval in ms
const FREQUENCY_PRESETS: Record<number, { min: number; max: number; initialMin: number; initialMax: number }> = {
  1: { min: 40000, max: 90000, initialMin: 20000, initialMax: 40000 },  // Rare
  2: { min: 20000, max: 50000, initialMin: 12000, initialMax: 25000 },  // Occasional
  3: { min: 12000, max: 30000, initialMin: 5000, initialMax: 15000 },   // Normal
  4: { min: 5000, max: 15000, initialMin: 2000, initialMax: 8000 },     // Frequent
  5: { min: 1500, max: 6000, initialMin: 500, initialMax: 2000 },       // Swarm
};

interface ScurryRatProps {
  frequency?: number; // 1-5
}

export const ScurryRat: React.FC<ScurryRatProps> = ({ frequency = 3 }) => {
  const [rats, setRats] = useState<Rat[]>([]);
  const [nextId, setNextId] = useState(0);

  const spawnRat = useCallback(() => {
    const direction: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Random vertical position (bottom 70% of screen - rats stay low)
    const yMin = viewportHeight * 0.3;
    const yMax = viewportHeight * 0.9;
    const startY = yMin + Math.random() * (yMax - yMin);
    // End Y drifts a bit from start
    const endY = startY + (Math.random() - 0.5) * 200;

    const startX = direction === 'right' ? -60 : viewportWidth + 60;
    const endX = direction === 'right' ? viewportWidth + 60 : -60;

    // Random speed: 3-6 seconds to cross
    const duration = 3 + Math.random() * 3;
    // Random size variation
    const size = 0.8 + Math.random() * 0.5;

    const newRat: Rat = {
      id: nextId,
      startX,
      startY,
      endX,
      endY,
      duration,
      direction,
      size,
    };

    setNextId((prev) => prev + 1);
    setRats((prev) => [...prev, newRat]);

    // Remove rat after animation completes
    setTimeout(() => {
      setRats((prev) => prev.filter((r) => r.id !== newRat.id));
    }, duration * 1000 + 500);
  }, [nextId]);

  useEffect(() => {
    const preset = FREQUENCY_PRESETS[frequency] || FREQUENCY_PRESETS[3];
    const initialDelay = preset.initialMin + Math.random() * (preset.initialMax - preset.initialMin);

    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const currentPreset = FREQUENCY_PRESETS[frequency] || FREQUENCY_PRESETS[3];
      const interval = currentPreset.min + Math.random() * (currentPreset.max - currentPreset.min);
      timeoutId = setTimeout(() => {
        spawnRat();
        scheduleNext();
      }, interval);
    };

    // First rat after initial delay
    timeoutId = setTimeout(() => {
      spawnRat();
      scheduleNext();
    }, initialDelay);

    return () => clearTimeout(timeoutId);
  }, [spawnRat, frequency]);

  return (
    <div className={styles.ratContainer} aria-hidden="true">
      {rats.map((rat) => (
        <div
          key={rat.id}
          className={`${styles.rat} ${rat.direction === 'left' ? styles.facingLeft : ''}`}
          style={{
            '--start-x': `${rat.startX}px`,
            '--start-y': `${rat.startY}px`,
            '--end-x': `${rat.endX}px`,
            '--end-y': `${rat.endY}px`,
            '--duration': `${rat.duration}s`,
            '--size': rat.size,
          } as React.CSSProperties}
        >
          <svg
            className={styles.ratBody}
            viewBox="0 0 80 40"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Tail - long curvy */}
            <path
              className={styles.tail}
              d="M2 20 Q8 8, 16 18 Q20 24, 24 20"
              fill="none"
              stroke="#4a3728"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Body */}
            <ellipse cx="42" cy="22" rx="18" ry="10" fill="#6b5344" />
            {/* Head */}
            <ellipse cx="62" cy="20" rx="10" ry="8" fill="#7a6354" />
            {/* Ear back */}
            <ellipse cx="58" cy="13" rx="4" ry="5" fill="#8a7364" />
            {/* Ear front */}
            <ellipse cx="63" cy="13" rx="4" ry="5" fill="#9a8374" />
            {/* Eye */}
            <circle cx="66" cy="18" r="1.5" fill="#1a1a1a" />
            {/* Nose */}
            <ellipse cx="72" cy="20" rx="2" ry="1.5" fill="#e8a0a0" />
            {/* Whiskers */}
            <line x1="70" y1="19" x2="78" y2="16" stroke="#8a7364" strokeWidth="0.5" />
            <line x1="70" y1="20" x2="79" y2="20" stroke="#8a7364" strokeWidth="0.5" />
            <line x1="70" y1="21" x2="78" y2="24" stroke="#8a7364" strokeWidth="0.5" />
            {/* Front legs */}
            <g className={styles.frontLegs}>
              <line x1="52" y1="30" x2="50" y2="38" stroke="#5a4334" strokeWidth="2" strokeLinecap="round" />
              <line x1="56" y1="30" x2="58" y2="38" stroke="#5a4334" strokeWidth="2" strokeLinecap="round" />
            </g>
            {/* Back legs */}
            <g className={styles.backLegs}>
              <line x1="32" y1="30" x2="28" y2="38" stroke="#5a4334" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="30" x2="40" y2="38" stroke="#5a4334" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
};

