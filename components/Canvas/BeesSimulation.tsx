import React, { useRef, useEffect } from 'react';
import { Point, SimulationConfig, SimulationStats } from '../../types';

interface BeesSimulationProps {
  config: SimulationConfig;
  onStatsUpdate: (stats: SimulationStats) => void;
}

const CANVAS_SIZE = 600;

// Fitness Function: Multi-modal landscape (peaks are better)
const getFitness = (x: number, y: number) => {
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  // Main peak
  const d1 = Math.sqrt((x - cx)**2 + (y - cy)**2);
  const v1 = 100 * Math.exp(-d1/100);
  
  // Secondary peaks
  const d2 = Math.sqrt((x - cx + 150)**2 + (y - cy - 100)**2);
  const v2 = 80 * Math.exp(-d2/80);

  const d3 = Math.sqrt((x - cx - 150)**2 + (y - cy + 150)**2);
  const v3 = 60 * Math.exp(-d3/60);
  
  return v1 + v2 + v3;
};

export const BeesSimulation: React.FC<BeesSimulationProps> = ({ config, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const iterationRef = useRef(0);
  const bestRef = useRef<number>(0);

  // Bees State
  const beesRef = useRef<Point[]>([]);

  useEffect(() => {
    // Init Random Bees
    beesRef.current = Array(config.populationSize).fill(0).map(() => ({
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE
    }));
    iterationRef.current = 0;
    bestRef.current = 0;
  }, [config.populationSize]); // Reset on pop size change

  const drawLandscape = (ctx: CanvasRenderingContext2D) => {
      // Draw a simplified heatmap for visualization
      // Note: Calculating per-pixel is expensive in JS. We use circles for peaks visual.
      const cx = CANVAS_SIZE / 2;
      const cy = CANVAS_SIZE / 2;

      // Peak 1
      const grad1 = ctx.createRadialGradient(cx, cy, 10, cx, cy, 150);
      grad1.addColorStop(0, 'rgba(255, 215, 0, 0.2)'); // Gold
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Peak 2
      const grad2 = ctx.createRadialGradient(cx-150, cy+150, 10, cx-150, cy+150, 100);
      grad2.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

       // Peak 3
       const grad3 = ctx.createRadialGradient(cx+150, cy-100, 10, cx+150, cy-100, 100);
       grad3.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
       grad3.addColorStop(1, 'transparent');
       ctx.fillStyle = grad3;
       ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  const animate = () => {
    if (!config.isRunning) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }
    iterationRef.current++;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // 1. Evaluate Fitness
    let scoredBees = beesRef.current.map(b => ({ ...b, score: getFitness(b.x, b.y) }));
    scoredBees.sort((a, b) => b.score - a.score);
    
    // Update Global Best
    if (scoredBees[0].score > bestRef.current) bestRef.current = scoredBees[0].score;

    // 2. Selection (Simplified Bees Algo)
    const eliteCount = Math.floor(config.populationSize * 0.2); // Top 20%
    const bestCount = Math.floor(config.populationSize * 0.5); // Top 50%
    
    const newBees: Point[] = [];

    // Elite Sites: Search intensely locally
    for(let i=0; i<eliteCount; i++) {
        newBees.push({x: scoredBees[i].x, y: scoredBees[i].y}); // Keep elite
        // Recruit neighbors
        const neighborX = scoredBees[i].x + (Math.random() - 0.5) * 20;
        const neighborY = scoredBees[i].y + (Math.random() - 0.5) * 20;
        newBees.push({ x: Math.max(0, Math.min(CANVAS_SIZE, neighborX)), y: Math.max(0, Math.min(CANVAS_SIZE, neighborY)) });
    }

    // Other Best Sites: Search less intensely
    for(let i=eliteCount; i<bestCount; i++) {
        if (newBees.length < config.populationSize) {
             const neighborX = scoredBees[i].x + (Math.random() - 0.5) * 50;
             const neighborY = scoredBees[i].y + (Math.random() - 0.5) * 50;
             newBees.push({ x: Math.max(0, Math.min(CANVAS_SIZE, neighborX)), y: Math.max(0, Math.min(CANVAS_SIZE, neighborY)) });
        }
    }

    // Scouts: Random Global Search for the rest
    while(newBees.length < config.populationSize) {
        newBees.push({
            x: Math.random() * CANVAS_SIZE,
            y: Math.random() * CANVAS_SIZE
        });
    }

    // Limit to population size
    beesRef.current = newBees.slice(0, config.populationSize);

    onStatsUpdate({
        iteration: iterationRef.current,
        bestScore: bestRef.current,
        populationSize: config.populationSize
    });

    // Render
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawLandscape(ctx);

    // Draw Bees
    beesRef.current.forEach((bee, idx) => {
        ctx.beginPath();
        // Color based on rank approximation (index in array doesn't perfectly match rank after recruitment mixing, but close enough for viz)
        ctx.fillStyle = idx < eliteCount * 2 ? '#facc15' : '#94a3b8'; // Yellow (Elite/Recruit) vs Grey (Scout)
        const size = idx < eliteCount * 2 ? 4 : 2;
        ctx.arc(bee.x, bee.y, size, 0, Math.PI * 2);
        ctx.fill();
    });

    setTimeout(() => {
        requestRef.current = requestAnimationFrame(animate);
    }, 100 - config.speed);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [config.isRunning, config.speed]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_SIZE} 
        height={CANVAS_SIZE}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-xs text-yellow-300 pointer-events-none">
        Yellow: Elite/Recruits | Grey: Scouts
      </div>
    </div>
  );
};