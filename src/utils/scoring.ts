import { BeatResult, HitNote } from '../types';

export const calculateHitResult = (
  hitTime: number,
  targetTime: number,
  tolerance: number = 0.15
): BeatResult => {
  const diff = Math.abs(hitTime - targetTime);
  if (diff < tolerance * 0.5) return 'perfect';
  if (diff < tolerance) return 'good';
  return 'miss';
};

export const calculateScore = (
  result: BeatResult,
  combo: number,
  isStress: boolean
): number => {
  const baseScore: Record<BeatResult, number> = {
    perfect: 100,
    good: 50,
    miss: 0
  };

  let score = baseScore[result];
  
  if (isStress && result !== 'miss') {
    score *= 1.5;
  }

  if (combo > 0 && result !== 'miss') {
    score *= 1 + combo * 0.1;
  }

  return Math.floor(score);
};

export const calculateLevelScore = (notes: HitNote[]): number => {
  return notes.reduce((total, note) => {
    if (note.result === 'perfect') return total + 100;
    if (note.result === 'good') return total + 50;
    return total;
  }, 0);
};

export const calculateAccuracy = (notes: HitNote[]): number => {
  if (notes.length === 0) return 0;
  
  const hitNotes = notes.filter(n => n.result !== null);
  if (hitNotes.length === 0) return 0;

  const perfectCount = hitNotes.filter(n => n.result === 'perfect').length;
  const goodCount = hitNotes.filter(n => n.result === 'good').length;

  const weightedScore = perfectCount * 100 + goodCount * 50;
  const maxScore = hitNotes.length * 100;

  return Math.round((weightedScore / maxScore) * 100);
};

export const calculateStars = (
  accuracy: number,
  thresholds: number[]
): number => {
  let stars = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (accuracy >= thresholds[i]) {
      stars = i + 1;
      break;
    }
  }
  return stars;
};

export const getResultColor = (result: BeatResult | null): string => {
  switch (result) {
    case 'perfect': return '#FFD700';
    case 'good': return '#32CD32';
    case 'miss': return '#FF6347';
    default: return '#888';
  }
};

export const getResultText = (result: BeatResult | null): string => {
  switch (result) {
    case 'perfect': return 'Perfect!';
    case 'good': return 'Good!';
    case 'miss': return 'Miss';
    default: return '';
  }
};
