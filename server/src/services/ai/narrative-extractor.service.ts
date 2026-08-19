import { z } from 'zod';
import { langChainService } from './langchain.service.js';
import type { Storyline } from '../../types/storyline.js';

// The array fields are optional with a [] default: the extraction model
// (Claude structured output) intermittently omits one — most often
// keyPlotPoints — and a hard `required` there throws an OUTPUT_PARSING_FAILURE
// that discards the whole (otherwise valid) extraction. Keeping them optional
// lets a partial result through; extractState() then merges any omitted/empty
// array with the previous state so continuity is preserved rather than lost.
const narrativeStateSchema = z.object({
    summary: z.string().describe('2-3 sentence summary of the story so far'),
    currentObjective: z.string().describe("The hero's current main goal"),
    chapter: z.number().describe('Current chapter number, increment if major milestone reached'),
    characters: z.array(z.string()).default([]).describe('List of active character names'),
    locations: z.array(z.string()).default([]).describe('List of relevant locations'),
    keyPlotPoints: z
        .array(z.string())
        .default([])
        .describe('List of important events that happened'),
});

type NarrativeState = z.infer<typeof narrativeStateSchema>;

// Cap accumulated plot points so narrative state stays bounded over a long campaign.
const MAX_PLOT_POINTS = 20;

export class NarrativeExtractorService {
    static async extractState(
        storyText: string,
        previousState: Storyline['narrativeState'],
    ): Promise<NarrativeState> {
        try {
            const model = langChainService.getExtractionModel();
            const structuredModel = model.withStructuredOutput(narrativeStateSchema);

            const prompt = `
Given this story update and previous narrative state, extract the updated state.
Always return every field. For characters, locations, and keyPlotPoints, carry
forward the previous entries and add any new ones from this update (do not drop
existing entries). keyPlotPoints must list the important events so far.

Story Text:
${storyText}

Previous State:
${JSON.stringify(previousState, null, 2)}
      `;

            const result = await structuredModel.invoke(prompt);

            // The model may still omit or empty an array field; never let that
            // erase accumulated state — fall back to the previous entries.
            const characters = result.characters ?? [];
            const locations = result.locations ?? [];
            const keyPlotPoints = result.keyPlotPoints ?? [];
            const mergedPlotPoints = keyPlotPoints.length
                ? keyPlotPoints
                : previousState.keyPlotPoints;
            return {
                summary: result.summary,
                currentObjective: result.currentObjective,
                chapter: result.chapter,
                characters: characters.length ? characters : previousState.characters,
                locations: locations.length ? locations : previousState.locations,
                // Keep only the most recent points so the state (and the context
                // it feeds back into generation) doesn't grow unbounded.
                keyPlotPoints: mergedPlotPoints.slice(-MAX_PLOT_POINTS),
            };
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
