import { ChatAnthropic } from '@langchain/anthropic';
import { ChatPromptTemplate } from '@langchain/core/prompts';
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

    async generateText(
        promptTemplate: string,
        variables: Record<string, unknown>,
        systemPrompt?: string,
    ): Promise<string> {
        const { retryAttempts, timeoutMs } = storylineConfig.generation;
        let lastError: Error = new Error('Generation failed');

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const messages: [string, string][] = [];
                if (systemPrompt) {
                    messages.push(['system', systemPrompt]);
                }
                messages.push(['human', promptTemplate]);

                const prompt = ChatPromptTemplate.fromMessages(messages);
                const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`Generation timed out after ${timeoutMs}ms`)),
                        timeoutMs,
                    )
                );

                const result = await Promise.race([chain.invoke(variables), timeoutPromise]);

                if (!result || result.trim().length === 0) {
                    throw new Error('AI returned an empty response');
                }

                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(
                    `Generation attempt ${attempt}/${retryAttempts} failed:`,
                    lastError.message,
                );

                if (attempt < retryAttempts) {
                    const backoffMs = Math.pow(2, attempt) * 500;
                    await new Promise((resolve) => setTimeout(resolve, backoffMs));
                }
            }
        }

        throw lastError;
    }

    getExtractionModel(): ChatAnthropic {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        return new ChatAnthropic({
            apiKey: apiKey || '',
            modelName: storylineConfig.claude.extractorModel,
            temperature: 0.2,
            maxTokens: 1000,
        });
    }
}

export const langChainService = new LangChainService();
