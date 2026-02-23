import { z } from 'zod';
import { langChainService } from './langchain.service.js';
import type { Storyline } from '../../types/storyline.js';

const narrativeStateSchema = z.object({
    summary: z.string().describe('2-3 sentence summary of the story so far'),
    currentObjective: z.string().describe("The hero's current main goal"),
    chapter: z.number().describe('Current chapter number, increment if major milestone reached'),
    characters: z.array(z.string()).describe('List of active character names'),
    locations: z.array(z.string()).describe('List of relevant locations'),
    keyPlotPoints: z.array(z.string()).describe('List of important events that happened'),
});

type NarrativeState = z.infer<typeof narrativeStateSchema>;

export class NarrativeExtractorService {
    static async extractState(
        storyText: string,
        previousState: Storyline['narrativeState'],
    ): Promise<NarrativeState> {
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
            console.error('Narrative extraction failed, using previous state:', error);
            // Fall back to previous state rather than crashing the generation pipeline
            return {
                summary: previousState.summary,
                currentObjective: previousState.currentObjective,
                chapter: previousState.chapter,
                characters: previousState.characters,
                locations: previousState.locations,
                keyPlotPoints: previousState.keyPlotPoints,
            };
        }
    }
}
