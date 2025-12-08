import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { storylineConfig } from '../../config/storyline.config.js';

export class LangChainService {
    private model: ChatAnthropic;

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.warn('ANTHROPIC_API_KEY is not set. AI features will not work.');
        }

        this.model = new ChatAnthropic({
            apiKey: apiKey || '',
            modelName: storylineConfig.claude.model,
            temperature: storylineConfig.claude.temperature,
            maxTokens: storylineConfig.claude.maxTokens,
        });
    }

    async generateText(promptTemplate: string, variables: Record<string, any>): Promise<string> {
        try {
            const prompt = PromptTemplate.fromTemplate(promptTemplate);
            const chain = prompt.pipe(this.model).pipe(new StringOutputParser());
            const result = await chain.invoke(variables);
            return result;
        } catch (error) {
            console.error('LangChain generation error:', error);
            throw new Error('Failed to generate text from AI service.');
        }
    }

    // For structured output (extraction), we can use withStructuredOutput once we have schemas
    // Or just use a specific model for extraction as planned (Haiku)
    getExtractionModel() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        return new ChatAnthropic({
            apiKey: apiKey || '',
            modelName: storylineConfig.claude.extractorModel,
            temperature: 0.2, // lower temp for extraction
            maxTokens: 1000,
        });
    }
}

export const langChainService = new LangChainService();
