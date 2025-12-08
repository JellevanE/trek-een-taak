import { z } from 'zod';
import { langChainService } from './langchain.service.js';

// Define the schema for narrative state extraction
const narrativeStateSchema = z.object({
    summary: z.string().describe("2-3 sentence summary of the story so far"),
    currentObjective: z.string().describe("The hero's current main goal"),
    chapter: z.number().describe("Current chapter number, increment if major milestone reached"),
    characters: z.array(z.string()).describe("List of active character names"),
    locations: z.array(z.string()).describe("List of relevant locations"),
    keyPlotPoints: z.array(z.string()).describe("List of important events that happened"),
});

export class NarrativeExtractorService {

    static async extractState(storyText: string, previousState: any): Promise<z.infer<typeof narrativeStateSchema>> {
        try {
            const model = langChainService.getExtractionModel();
            const structuredModel = model.withStructuredOutput(narrativeStateSchema);

            const prompt = `
        Given this story update and previous narrative state, extract the following information.
        
        Story Text:
        ${storyText}
        
        Previous State:
        ${JSON.stringify(previousState, null, 2)}
      `;

            const result = await structuredModel.invoke(prompt);
            return result;
        } catch (error) {
            console.error('Narrative extraction failed:', error);
            // Fallback: return previous state or partial update?
            // For now, let's re-throw so consumption layer can handle it (e.g. use previous state)
            throw error;
        }
    }
}
