import React from 'react';
import { renderHook } from '@testing-library/react';
import { QuestBoardProvider, useQuestBoardContext } from '../QuestBoardContext.jsx';

describe('QuestBoardContext', () => {
    it('exposes the provided quest board value to children', () => {
        const wrapper = ({ children }) => (
            <QuestBoardProvider value={{ foo: 'bar' }}>
                {children}
            </QuestBoardProvider>
        );

        const { result } = renderHook(() => useQuestBoardContext(), { wrapper });
        expect(result.current.foo).toBe('bar');
    });

    it('throws when context is consumed without a provider', () => {
        expect(() => renderHook(() => useQuestBoardContext())).toThrow(
            'useQuestBoardContext must be used within a QuestBoardProvider'
        );
    });
});
