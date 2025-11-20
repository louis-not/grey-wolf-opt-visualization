import { GoogleGenAI } from "@google/genai";
import { AlgorithmType, SimulationStats } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. Gemini features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAlgoExplanation = async (
  algo: AlgorithmType,
  stats: SimulationStats
): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key not found. Please configure the environment.";

  try {
    const prompt = `
      You are an expert computer scientist teaching genetic algorithms visually.
      The user is currently running a simulation of the **${algo}**.
      
      Current Stats:
      - Iteration: ${stats.iteration}
      - Best Score/Distance: ${stats.bestScore.toFixed(2)}
      - Population: ${stats.populationSize}

      Provide a concise, 2-sentence insight about what is conceptually happening right now in the algorithm based on these stats. 
      Focus on the "why" (e.g., pheromone evaporation, wolf hierarchy, bee recruitment). 
      Keep it encouraging and educational.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analyzing simulation data...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI explanation temporarily unavailable.";
  }
};