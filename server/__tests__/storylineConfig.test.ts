import { storylineConfig } from '../src/config/storyline.config';

test('story and extraction use different models', () => {
    expect(storylineConfig.claude.model).toBe('claude-sonnet-4-6');
    expect(storylineConfig.claude.extractorModel).toBe('claude-haiku-4-5-20251001');
    expect(storylineConfig.claude.model).not.toBe(storylineConfig.claude.extractorModel);
});

test('storyline count cap has been removed', () => {
    expect(
        (storylineConfig.rateLimits as Record<string, unknown>)
            .maxActiveCampaignsWithStorylines,
    ).toBeUndefined();
    expect(storylineConfig.rateLimits.maxGenerationsPerDay).toBe(10);
});
