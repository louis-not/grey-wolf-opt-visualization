import React, { useState } from 'react';
import { AlgorithmType, SimulationConfig, SimulationStats } from './types';
import { WolfSimulation } from './components/Canvas/WolfSimulation';
import { Explainer } from './components/Explainer';

const App: React.FC = () => {
  // Default speed slowed down to 30 for better educational value
  const [config, setConfig] = useState<SimulationConfig>({
    populationSize: 30,
    speed: 30, 
    isRunning: true
  });
  
  const [currentStats, setCurrentStats] = useState<SimulationStats>({
    iteration: 0,
    bestScore: 0,
    populationSize: 30
  });

  const handleConfigChange = (key: keyof SimulationConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar Control Panel & Guide */}
      <aside className="w-full md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-screen z-10 shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Grey Wolf <span className="text-blue-400">Optimizer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Step-by-step Educational Visualization</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Legend / Guide */}
          <section className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
            <h2 className="text-sm font-bold text-slate-300 uppercase mb-4 tracking-wider border-b border-slate-700 pb-2">
              Pack Hierarchy & Roles
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] shrink-0"></div>
                <div>
                  <span className="block text-sm font-bold text-red-400">The Prey (Target)</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The optimal solution we are searching for. In nature, this is the food source. In algorithms, it's the global minimum/maximum.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] shrink-0 flex items-center justify-center text-[10px] text-black font-bold">α</div>
                <div>
                  <span className="block text-sm font-bold text-amber-400">Alpha (α) - The Leader</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The best solution found so far. The alpha makes decisions, and the rest of the pack follows its lead.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] shrink-0 flex items-center justify-center text-[10px] text-black font-bold">β</div>
                <div>
                  <span className="block text-sm font-bold text-cyan-400">Beta (β) - The Advisor</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The second-best solution. The beta helps the alpha and reinforces the alpha's commands to the pack.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-orange-500 shrink-0 flex items-center justify-center text-[10px] text-black font-bold">δ</div>
                <div>
                  <span className="block text-sm font-bold text-orange-500">Delta (δ) - The Sentinel</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The third-best solution. Deltas dominate the omegas but submit to alphas and betas.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 w-4 h-4 rounded-full bg-slate-500 shrink-0"></div>
                <div>
                  <span className="block text-sm font-bold text-slate-400">Omega (ω) - The Pack</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The followers. They update their positions by averaging the locations of the Alpha, Beta, and Delta.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Controls */}
          <section>
             <h2 className="text-sm font-semibold text-slate-400 uppercase mb-3 tracking-wider">Simulation Controls</h2>
             <div className="space-y-5">
                
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-medium text-slate-300">Pack Size (Population)</label>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 rounded">{config.populationSize}</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={config.populationSize}
                    onChange={(e) => handleConfigChange('populationSize', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                  />
                </div>

                <div>
                   <div className="flex justify-between mb-2">
                    <label className="text-xs font-medium text-slate-300">Animation Speed</label>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 rounded">{config.speed}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={config.speed}
                    onChange={(e) => handleConfigChange('speed', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    * Keep speed low to observe the step-by-step hierarchy update.
                  </p>
                </div>

             </div>
          </section>

           {/* Playback */}
           <section>
              <button 
                onClick={() => handleConfigChange('isRunning', !config.isRunning)}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg ${
                  config.isRunning 
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-red-900/20' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/20'
                }`}
              >
                {config.isRunning ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    PAUSE SIMULATION
                  </>
                ) : (
                  <>
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    RESUME SIMULATION
                  </>
                )}
              </button>
           </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 relative">
        
        {/* Visualization Area */}
        <div className="flex-1 p-6 lg:p-10 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
           <div className="w-full max-w-7xl h-full max-h-[90vh] flex flex-col lg:flex-row gap-6">
              
              {/* Canvas Container */}
              <div className="flex-grow h-full min-h-[50vh] relative rounded-2xl shadow-2xl shadow-black/50 border border-slate-800 overflow-hidden">
                <WolfSimulation config={config} onStatsUpdate={setCurrentStats} />
              </div>
              
              {/* AI Insight Panel */}
              <div className="w-full lg:w-80 h-48 lg:h-full flex-shrink-0">
                <Explainer currentAlgo={AlgorithmType.GWO} stats={currentStats} />
              </div>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;