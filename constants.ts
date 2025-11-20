import { AlgorithmType } from './types';

export const ALGORITHM_DESCRIPTIONS: Record<AlgorithmType, string> = {
  [AlgorithmType.GWO]: "The Grey Wolf Optimizer (GWO) is a nature-inspired algorithm that mimics the leadership hierarchy and hunting mechanism of grey wolves. The pack is led by the Alpha, Beta, and Delta wolves, who guide the Omega wolves toward the prey (the optimal solution)."
};

// Colors
export const COLORS = {
  primary: '#3b82f6', // Blue
  secondary: '#8b5cf6', // Purple
  accent: '#10b981', // Emerald
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  muted: '#94a3b8'
};