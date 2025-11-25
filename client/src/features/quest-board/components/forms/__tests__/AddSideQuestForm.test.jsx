import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AddSideQuestForm } from '../AddSideQuestForm';

describe('AddSideQuestForm', () => {
    const defaultProps = {
        questId: 123,
        value: '',
        onChange: jest.fn(),
        onAdd: jest.fn(),
        onCancel: jest.fn(),
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        inputRef: React.createRef()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<AddSideQuestForm {...defaultProps} />);

        const input = screen.getByPlaceholderText('Add a side-quest');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('');

        const button = screen.getByText('Add');
        expect(button).toBeInTheDocument();
    });

    it('calls onChange when input value changes', () => {
        render(<AddSideQuestForm {...defaultProps} />);

        const input = screen.getByPlaceholderText('Add a side-quest');
        fireEvent.change(input, { target: { value: 'New side quest' } });

        expect(defaultProps.onChange).toHaveBeenCalledWith('New side quest');
    });

    it('calls onAdd when Add button is clicked', () => {
        render(<AddSideQuestForm {...defaultProps} value="Test" />);

        const button = screen.getByText('Add');
        fireEvent.click(button);

        expect(defaultProps.onAdd).toHaveBeenCalled();
    });

    it('calls onAdd when Enter key is pressed', () => {
        render(<AddSideQuestForm {...defaultProps} value="Test" />);

        const input = screen.getByPlaceholderText('Add a side-quest');
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onAdd).toHaveBeenCalled();
    });

    it('calls onCancel when Escape key is pressed', () => {
        render(<AddSideQuestForm {...defaultProps} />);

        const input = screen.getByPlaceholderText('Add a side-quest');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('calls onFocus and onBlur handlers', () => {
        render(<AddSideQuestForm {...defaultProps} />);

        const input = screen.getByPlaceholderText('Add a side-quest');

        fireEvent.focus(input);
        expect(defaultProps.onFocus).toHaveBeenCalled();

        fireEvent.blur(input);
        expect(defaultProps.onBlur).toHaveBeenCalled();
    });
});
