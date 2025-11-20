import React, { useEffect, useState, useCallback } from 'react';
import { AlgorithmType, SimulationStats } from '../types';
import { generateAlgoExplanation } from '../services/geminiService';
import { ALGORITHM_DESCRIPTIONS } from '../constants';

interface ExplainerProps {
  currentAlgo: AlgorithmType;
  stats: SimulationStats;
}

export const Explainer: React.FC<ExplainerProps> = ({ currentAlgo, stats }) => {
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Debounce the AI request to avoid spamming API every frame
  const fetchExplanation = useCallback(async () => {
    setLoading(true);
    const text = await generateAlgoExplanation(currentAlgo, stats);
    setExplanation(text);
    setLoading(false);
  }, [currentAlgo, stats.iteration]); // Only re-trigger if iteration changes significantly (handled by caller logic usually, or throttle here)

  // Effect to fetch explanation every 50 iterations or when algo changes
  useEffect(() => {
    if (stats.iteration === 0 || stats.iteration % 100 === 0) {
      fetchExplanation();
    }
  }, [stats.iteration, currentAlgo, fetchExplanation]);

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg flex flex-col gap-4 h-full">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{currentAlgo}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          {ALGORITHM_DESCRIPTIONS[currentAlgo]}
        </p>
      </div>
      
      <div className="flex-grow flex flex-col justify-end">
        <div className="bg-slate-900/50 p-4 rounded-md border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              {loading ? (
                 <span className="animate-pulse">AI Analyzing...</span>
              ) : (
                 <span>Gemini Insight</span>
              )}
            </h4>
            <p className="text-slate-200 text-sm italic min-h-[3rem]">
              {explanation || "Starting simulation to gather insights..."}
            </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-slate-700/50 p-2 rounded">
            <span className="block text-xs text-slate-400 uppercase">Iteration</span>
            <span className="text-lg font-mono font-bold text-white">{stats.iteration}</span>
        </div>
        <div className="bg-slate-700/50 p-2 rounded">
            <span className="block text-xs text-slate-400 uppercase">Best Score</span>
            <span className="text-lg font-mono font-bold text-green-400">{stats.bestScore.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};