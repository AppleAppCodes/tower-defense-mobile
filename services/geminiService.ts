import { GoogleGenAI } from "@google/genai";
import { GameState, Tower } from "../types";
import { TOWER_TYPES } from "../constants";

// Helper to summarize game state for the AI
const getGameStatePrompt = (gameState: GameState, towers: Tower[]) => {
  const towerSummary = towers.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `
    Current Game State:
    - Wave: ${gameState.wave}
    - Money: ${gameState.money}
    - Lives: ${gameState.lives}
    - Towers Built: ${JSON.stringify(towerSummary)}
    
    Tower Stats Reference:
    ${Object.values(TOWER_TYPES).map(t => `${t.baseName}: Cost ${t.cost}, Dmg ${t.damage}, Type ${t.type}`).join('\n')}

    As an expert Tower Defense strategist, provide a ONE SENTENCE tactical tip for the player. 
    Focus on what they should build or upgrade next based on their money and wave.
    Keep it encouraging but strategic.
  `;
};

export const getTacticalAdvice = async (gameState: GameState, towers: Tower[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "Configure API_KEY to receive AI advice.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = getGameStatePrompt(gameState, towers);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() ?? "No advice available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Tactical communications offline. Rely on your instincts, Commander.";
  }
};