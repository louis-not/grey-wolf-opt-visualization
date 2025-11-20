import React, { useRef, useEffect, useState } from 'react';
import { Point, SimulationConfig, SimulationStats } from '../../types';

interface AcoSimulationProps {
  config: SimulationConfig;
  onStatsUpdate: (stats: SimulationStats) => void;
}

const CITY_COUNT = 15;
const CANVAS_SIZE = 600;

export const AcoSimulation: React.FC<AcoSimulationProps> = ({ config, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cities, setCities] = useState<Point[]>([]);
  const requestRef = useRef<number>(0);
  
  // ACO State refs to persist without re-render
  const pheromonesRef = useRef<number[][]>([]);
  const antsRef = useRef<any[]>([]);
  const bestPathRef = useRef<number[]>([]);
  const bestDistRef = useRef<number>(Infinity);
  const iterationRef = useRef(0);

  // Initialize Cities
  useEffect(() => {
    const newCities: Point[] = [];
    for (let i = 0; i < CITY_COUNT; i++) {
      newCities.push({
        x: Math.random() * (CANVAS_SIZE - 40) + 20,
        y: Math.random() * (CANVAS_SIZE - 40) + 20
      });
    }
    setCities(newCities);

    // Init Pheromones
    pheromonesRef.current = Array(CITY_COUNT).fill(0).map(() => Array(CITY_COUNT).fill(1));
    bestDistRef.current = Infinity;
    bestPathRef.current = [];
    iterationRef.current = 0;
  }, []); // Run once on mount

  const distance = (p1: Point, p2: Point) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  const animate = () => {
    if (!config.isRunning) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Logic Update Rate
    iterationRef.current++;

    // Simulation Logic: Simple ACO Step
    // 1. Construct Solutions
    const currentAntsPaths: number[][] = [];
    const pathDistances: number[] = [];

    for (let k = 0; k < config.populationSize; k++) {
      const visited = new Set<number>();
      const path = [];
      let currentCity = Math.floor(Math.random() * CITY_COUNT);
      visited.add(currentCity);
      path.push(currentCity);

      while (visited.size < CITY_COUNT) {
        // Calculate probabilities
        const probs: number[] = [];
        const candidates: number[] = [];
        let sumProb = 0;

        for (let next = 0; next < CITY_COUNT; next++) {
          if (!visited.has(next)) {
            const dist = distance(cities[currentCity], cities[next]);
            const pheromone = pheromonesRef.current[currentCity][next];
            // alpha=1, beta=2 usually
            const prob = Math.pow(pheromone, 1) * Math.pow(1 / dist, 2);
            probs.push(prob);
            candidates.push(next);
            sumProb += prob;
          }
        }

        // Roulette Wheel Selection
        let r = Math.random() * sumProb;
        let selected = candidates[candidates.length - 1];
        for (let i = 0; i < probs.length; i++) {
          r -= probs[i];
          if (r <= 0) {
            selected = candidates[i];
            break;
          }
        }

        visited.add(selected);
        path.push(selected);
        currentCity = selected;
      }
      // Return to start
      // path.push(path[0]); // Optional for closed loop TSP

      currentAntsPaths.push(path);
      
      // Calculate Distance
      let d = 0;
      for (let i = 0; i < path.length - 1; i++) {
        d += distance(cities[path[i]], cities[path[i+1]]);
      }
      // Close loop distance
      d += distance(cities[path[path.length-1]], cities[path[0]]);
      pathDistances.push(d);

      if (d < bestDistRef.current) {
        bestDistRef.current = d;
        bestPathRef.current = [...path];
      }
    }

    // 2. Update Pheromones
    const rho = 0.1; // Evaporation
    for (let i = 0; i < CITY_COUNT; i++) {
      for (let j = 0; j < CITY_COUNT; j++) {
        pheromonesRef.current[i][j] *= (1 - rho);
      }
    }

    for (let k = 0; k < currentAntsPaths.length; k++) {
      const path = currentAntsPaths[k];
      const contribution = 100 / pathDistances[k];
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i+1];
        pheromonesRef.current[u][v] += contribution;
        pheromonesRef.current[v][u] += contribution;
      }
      // Loop closing
      const u = path[path.length-1];
      const v = path[0];
      pheromonesRef.current[u][v] += contribution;
      pheromonesRef.current[v][u] += contribution;
    }

    // Stats update
    onStatsUpdate({
      iteration: iterationRef.current,
      bestScore: bestDistRef.current,
      populationSize: config.populationSize
    });

    // Rendering
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw Pheromones
    ctx.lineCap = 'round';
    for (let i = 0; i < CITY_COUNT; i++) {
      for (let j = i + 1; j < CITY_COUNT; j++) {
        const level = pheromonesRef.current[i][j];
        if (level > 0.1) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${Math.min(level * 0.05, 0.8)})`;
            ctx.lineWidth = Math.min(level * 0.5, 8);
            ctx.moveTo(cities[i].x, cities[i].y);
            ctx.lineTo(cities[j].x, cities[j].y);
            ctx.stroke();
        }
      }
    }

    // Draw active ants (just purely visual representation of current iteration paths)
    // For visualization, we draw faint lines for a few recent ants
    currentAntsPaths.slice(0, 5).forEach(path => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for(let i=0; i<path.length-1; i++) {
            const p1 = cities[path[i]];
            const p2 = cities[path[i+1]];
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
    });

    // Draw Best Path
    if (bestPathRef.current.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#10b981'; // Emerald
      ctx.lineWidth = 3;
      const path = bestPathRef.current;
      ctx.moveTo(cities[path[0]].x, cities[path[0]].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(cities[path[i]].x, cities[path[i]].y);
      }
      ctx.lineTo(cities[path[0]].x, cities[path[0]].y); // Close loop
      ctx.stroke();
    }

    // Draw Cities
    cities.forEach(city => {
      ctx.beginPath();
      ctx.fillStyle = '#f8fafc';
      ctx.arc(city.x, city.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#3b82f6';
      ctx.arc(city.x, city.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Loop
    setTimeout(() => {
      requestRef.current = requestAnimationFrame(animate);
    }, 100 - config.speed); // speed controls delay
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [config.isRunning, config.speed, cities, config.populationSize]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_SIZE} 
        height={CANVAS_SIZE}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-300 pointer-events-none">
        TSP Mode: Minimizing Total Distance
      </div>
    </div>
  );
};