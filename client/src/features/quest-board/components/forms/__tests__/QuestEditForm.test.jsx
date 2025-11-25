import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { QuestEditForm } from '../QuestEditForm';

describe('QuestEditForm', () => {
    const mockQuest = { id: 1 };
    const mockEditingQuest = {
        description: 'Test Quest',
        priority: 'high',
        task_level: 2,
        campaign_id: 10
    };
    const mockCampaigns = [
        { id: 10, name: 'Campaign A' },
        { id: 20, name: 'Campaign B' }
    ];

    const defaultProps = {
        quest: mockQuest,
        editingQuest: mockEditingQuest,
        campaigns: mockCampaigns,
        hasCampaigns: true,
        onChange: jest.fn(),
        onCancel: jest.fn(),
        onSave: jest.fn(),
        onCyclePriority: jest.fn(),
        onCycleLevel: jest.fn(),
        inputRef: React.createRef()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing if quest or editingQuest is missing', () => {
        const { container } = render(<QuestEditForm {...defaultProps} quest={null} />);
        expect(container).toBeEmptyDOMElement();

        const { container: container2 } = render(<QuestEditForm {...defaultProps} editingQuest={null} />);
        expect(container2).toBeEmptyDOMElement();
    });

    it('renders form with correct values', () => {
        render(<QuestEditForm {...defaultProps} />);

        expect(screen.getByDisplayValue('Test Quest')).toBeInTheDocument();
        expect(screen.getByText('Priority: high')).toBeInTheDocument();
        expect(screen.getByText('Level: 2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Campaign A')).toBeInTheDocument();
    });

    it('calls onChange when description changes', () => {
        render(<QuestEditForm {...defaultProps} />);

        const input = screen.getByDisplayValue('Test Quest');
        fireEvent.change(input, { target: { value: 'Updated Quest' } });

        expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it('calls onChange when campaign changes', () => {
        render(<QuestEditForm {...defaultProps} />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '20' } });

        expect(defaultProps.onChange).toHaveBeenCalled();
    });

    it('calls onCyclePriority when priority button clicked', () => {
        render(<QuestEditForm {...defaultProps} />);

        const button = screen.getByText('Priority: high');
        fireEvent.click(button);

        expect(defaultProps.onCyclePriority).toHaveBeenCalled();
    });

    it('calls onCycleLevel when level button clicked', () => {
        render(<QuestEditForm {...defaultProps} />);

        const button = screen.getByText('Level: 2');
        fireEvent.click(button);

        expect(defaultProps.onCycleLevel).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button clicked', () => {
        render(<QuestEditForm {...defaultProps} />);

        const button = screen.getByText('Cancel');
        fireEvent.click(button);

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('calls onSave when save button clicked', () => {
        render(<QuestEditForm {...defaultProps} />);

        const button = screen.getByText('Save');
        fireEvent.click(button);

        expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it('handles no campaigns state', () => {
        render(<QuestEditForm {...defaultProps} campaigns={[]} hasCampaigns={false} />);

        expect(screen.getByText('No campaigns yet')).toBeInTheDocument();
    });
});
