export enum AlgorithmType {
  GWO = 'Grey Wolf Optimizer'
}

export interface Point {
  x: number;
  y: number;
}

export interface SimulationStats {
  iteration: number;
  bestScore: number;
  populationSize: number;
}

export interface SimulationConfig {
  populationSize: number;
  speed: number;
  isRunning: boolean;
}