import React, { useRef, useEffect, useState } from 'react';
import { Point, SimulationConfig, SimulationStats } from '../../types';

interface WolfSimulationProps {
  config: SimulationConfig;
  onStatsUpdate: (stats: SimulationStats) => void;
}

const CANVAS_SIZE = 600;

// Simulation Phases
enum Phase {
  MOVE_PREY = 'PREY_MOVING',
  EVALUATE = 'EVALUATING_FITNESS',
  RANK = 'UPDATING_HIERARCHY',
  CALCULATE = 'CALCULATING_VECTORS',
  MOVE_WOLVES = 'WOLVES_HUNTING'
}

type WolfType = 'alpha' | 'beta' | 'delta' | 'omega';

interface Wolf {
  id: number;
  x: number;
  y: number;
  targetX: number; // For smooth animation
  targetY: number;
  type: WolfType;
  score: number;
}

const COLORS = {
  PREY: '#ef4444',   // Red
  ALPHA: '#fbbf24',  // Gold
  BETA: '#22d3ee',   // Cyan
  DELTA: '#f97316',  // Orange
  OMEGA: '#64748b',  // Slate
};

export const WolfSimulation: React.FC<WolfSimulationProps> = ({ config, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // State for logic
  const wolvesRef = useRef<Wolf[]>([]);
  const preyRef = useRef<Point>({ x: CANVAS_SIZE/2, y: CANVAS_SIZE/2 });
  
  // Animation state
  const phaseRef = useRef<Phase>(Phase.EVALUATE);
  const phaseTimerRef = useRef<number>(0);
  const iterationRef = useRef<number>(0);

  // UI State
  const [phaseDescription, setPhaseDescription] = useState<string>("Initializing...");
  const [currentPhase, setCurrentPhase] = useState<Phase>(Phase.EVALUATE);

  // 1. Initialize
  useEffect(() => {
    const initialWolves: Wolf[] = Array.from({ length: config.populationSize }).map((_, i) => ({
      id: i,
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
      targetX: Math.random() * CANVAS_SIZE, // Init target same as pos
      targetY: Math.random() * CANVAS_SIZE,
      type: 'omega',
      score: Infinity
    }));
    
    // Determine initial positions immediately
    initialWolves.forEach(w => { w.targetX = w.x; w.targetY = w.y; });
    
    wolvesRef.current = initialWolves;
    iterationRef.current = 0;
    phaseRef.current = Phase.EVALUATE;
    phaseTimerRef.current = 0;
    setPhaseDescription("Initializing simulation...");
  }, [config.populationSize]);

  const distance = (x1: number, y1: number, x2: number, y2: number) => 
    Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

  // Main Animation Loop
  const animate = () => {
    if (!config.isRunning) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // --- LOGIC UPDATE (Based on Timer) ---
    // Slow down the phase transitions based on config.speed
    const speedMultiplier = 0.2 + (config.speed / 100) * 0.8; 
    phaseTimerRef.current += speedMultiplier;

    // Phase Duration Thresholds (approx frames)
    const PHASE_DURATION = 150; // Slower for reading

    if (phaseTimerRef.current >= PHASE_DURATION) {
      phaseTimerRef.current = 0;
      advancePhase();
    }

    // --- INTERPOLATION / MOVEMENT ---
    if (phaseRef.current === Phase.MOVE_WOLVES || phaseRef.current === Phase.MOVE_PREY) {
      const moveSpeed = 0.05 * speedMultiplier; // Smooth lerp factor
      wolvesRef.current.forEach(w => {
        w.x = lerp(w.x, w.targetX, moveSpeed);
        w.y = lerp(w.y, w.targetY, moveSpeed);
      });
    }

    // --- RENDER ---
    draw(ctx);

    // Report Stats
    const alpha = wolvesRef.current.find(w => w.type === 'alpha');
    if (iterationRef.current % 10 === 0) {
       onStatsUpdate({
        iteration: iterationRef.current,
        bestScore: alpha ? alpha.score : 0,
        populationSize: config.populationSize
      });
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const advancePhase = () => {
    switch (phaseRef.current) {
      case Phase.MOVE_PREY:
        // Move prey slightly
        const time = Date.now() * 0.0005;
        preyRef.current = {
            x: CANVAS_SIZE/2 + Math.cos(time) * 150,
            y: CANVAS_SIZE/2 + Math.sin(time * 2) * 80
        };
        setPhaseDescription("Oh no! The Prey is moving away. The pack needs to track it down.");
        setCurrentPhase(Phase.EVALUATE);
        phaseRef.current = Phase.EVALUATE;
        break;

      case Phase.EVALUATE:
        // Calculate scores
        wolvesRef.current.forEach(w => {
          w.score = distance(w.x, w.y, preyRef.current.x, preyRef.current.y);
        });
        setPhaseDescription("Evaluating... Determining which wolf is closest to the prey.");
        setCurrentPhase(Phase.RANK);
        phaseRef.current = Phase.RANK;
        break;

      case Phase.RANK:
        // Sort and assign types
        const sorted = [...wolvesRef.current].sort((a, b) => a.score - b.score);
        
        // Reset all to omega first
        wolvesRef.current.forEach(w => w.type = 'omega');

        // Assign top 3
        if (sorted[0]) sorted[0].type = 'alpha';
        if (sorted[1]) sorted[1].type = 'beta';
        if (sorted[2]) sorted[2].type = 'delta';
        
        setPhaseDescription("Pack Hierarchy Updated! We identified the Alpha (Gold), Beta (Cyan), and Delta (Orange).");
        setCurrentPhase(Phase.CALCULATE);
        phaseRef.current = Phase.CALCULATE;
        break;

      case Phase.CALCULATE:
        // GWO Math Step
        const alpha = wolvesRef.current.find(w => w.type === 'alpha');
        const beta = wolvesRef.current.find(w => w.type === 'beta');
        const delta = wolvesRef.current.find(w => w.type === 'delta');

        if (alpha && beta && delta) {
           wolvesRef.current.forEach(w => {
              // Simple GWO logic implementation
              const A = 2 - 2 * (iterationRef.current / 1000); // Decay
              
              const computeDim = (current: number, alphaPos: number, betaPos: number, deltaPos: number) => {
                  const r1 = Math.random(); const r2 = Math.random();
                  const A1 = 2 * A * r1 - A;
                  const C1 = 2 * r2;
                  const D_alpha = Math.abs(C1 * alphaPos - current);
                  const X1 = alphaPos - A1 * D_alpha;

                  const r3 = Math.random(); const r4 = Math.random();
                  const A2 = 2 * A * r3 - A;
                  const C2 = 2 * r4;
                  const D_beta = Math.abs(C2 * betaPos - current);
                  const X2 = betaPos - A2 * D_beta;

                  const r5 = Math.random(); const r6 = Math.random();
                  const A3 = 2 * A * r3 - A;
                  const C3 = 2 * r6;
                  const D_delta = Math.abs(C3 * deltaPos - current);
                  const X3 = deltaPos - A3 * D_delta;

                  return (X1 + X2 + X3) / 3;
              };

              w.targetX = computeDim(w.x, alpha.x, beta.x, delta.x);
              w.targetY = computeDim(w.y, alpha.y, beta.y, delta.y);
              
              // Clamp to canvas
              w.targetX = Math.max(10, Math.min(CANVAS_SIZE - 10, w.targetX));
              w.targetY = Math.max(10, Math.min(CANVAS_SIZE - 10, w.targetY));
           });
        }
        setPhaseDescription("Planning... The Omegas are triangulating their next move based on the leaders' positions.");
        setCurrentPhase(Phase.MOVE_WOLVES);
        phaseRef.current = Phase.MOVE_WOLVES;
        break;

      case Phase.MOVE_WOLVES:
        iterationRef.current++;
        setPhaseDescription("Hunting! The whole pack moves in to encircle the prey.");
        setCurrentPhase(Phase.MOVE_PREY);
        phaseRef.current = Phase.MOVE_PREY; // Loop back
        break;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 1. Draw Prey (Target)
    ctx.beginPath();
    ctx.fillStyle = COLORS.PREY;
    ctx.shadowColor = COLORS.PREY;
    ctx.shadowBlur = 20;
    ctx.arc(preyRef.current.x, preyRef.current.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '12px Inter';
    ctx.fillText('Prey', preyRef.current.x + 15, preyRef.current.y + 4);

    // 2. Draw Hierarchy Connectors
    const alpha = wolvesRef.current.find(w => w.type === 'alpha');
    // Only draw lines in calculation phase to show the math happening visually
    if ((phaseRef.current === Phase.CALCULATE) && alpha) {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = COLORS.ALPHA;
        ctx.beginPath();
        wolvesRef.current.forEach(w => {
            if (w.type === 'omega') {
                ctx.moveTo(alpha.x, alpha.y);
                ctx.lineTo(w.x, w.y);
            }
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // 3. Draw Wolves
    // Draw Omegas first so they are behind
    wolvesRef.current.filter(w => w.type === 'omega').forEach(w => drawWolf(ctx, w));
    // Draw Leaders on top
    wolvesRef.current.filter(w => w.type !== 'omega').reverse().forEach(w => drawWolf(ctx, w));
  };

  const drawWolf = (ctx: CanvasRenderingContext2D, w: Wolf) => {
      let color = COLORS.OMEGA;
      let radius = 4;
      let label = '';
      let ringColor = '';

      if (w.type === 'alpha') {
          color = COLORS.ALPHA;
          radius = 12;
          label = 'α';
          ringColor = 'rgba(251, 191, 36, 0.3)';
      } else if (w.type === 'beta') {
          color = COLORS.BETA;
          radius = 10;
          label = 'β';
          ringColor = 'rgba(34, 211, 238, 0.3)';
      } else if (w.type === 'delta') {
          color = COLORS.DELTA;
          radius = 8;
          label = 'δ';
          ringColor = 'rgba(249, 115, 22, 0.3)';
      }

      // Rank Ring
      if (ringColor) {
          ctx.beginPath();
          ctx.fillStyle = ringColor;
          ctx.arc(w.x, w.y, radius + 8, 0, Math.PI * 2);
          ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(w.x, w.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Label (Greek letter inside)
      if (label) {
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, w.x, w.y + 1); 
      }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [config.isRunning, config.speed]);

  return (
     <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900 group">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_SIZE} 
        height={CANVAS_SIZE}
        className="w-full h-full object-contain"
      />
      
      {/* Step Explanation Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-11/12 max-w-xl transition-all duration-300">
         <div className="bg-slate-900/90 border border-slate-600 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-sm flex items-start gap-4">
             <div className={`mt-1 w-3 h-3 rounded-full animate-pulse flex-shrink-0 ${
                 currentPhase === Phase.EVALUATE ? 'bg-blue-400' : 
                 currentPhase === Phase.RANK ? 'bg-yellow-400' : 
                 currentPhase === Phase.CALCULATE ? 'bg-purple-400' : 'bg-green-400'
             }`}></div>
             <div>
               <h3 className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">
                 Current Step: {currentPhase.replace('_', ' ')}
               </h3>
               <p className="text-base font-medium text-slate-100 leading-snug">
                  {phaseDescription}
               </p>
             </div>
         </div>
      </div>

    </div>
  );
};