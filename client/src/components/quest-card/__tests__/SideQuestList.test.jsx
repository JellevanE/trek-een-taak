import React from 'react';
import { render, screen } from '@testing-library/react';
import { SideQuestList } from '../SideQuestList.jsx';
import { createSideQuestFixture } from '../../../features/quest-board/test-data/questFixtures.js';
import { QUEST_LAYOUT_TOKENS } from '../../../features/quest-board/tokens/spacing.js';

const baseQuest = { id: 1 };

const noop = () => { };

const requiredProps = {
    quest: baseQuest,
    smoothDrag: null,
    themeName: 'dark',
    sideQuestItemHeight: 80,
    sideQuestGap: QUEST_LAYOUT_TOKENS.sideQuestGap,
    sideQuestMaxHeight: null,
    sideQuestFooter: <div data-testid="footer">footer</div>,
    selectedSideQuest: null,
    editingSideQuest: null,
    idsMatch: (a, b) => Number(a) === Number(b),
    handleSelectSideQuest: noop,
    isInteractiveTarget: () => false,
    getSideQuestStatus: () => 'todo',
    getSideQuestStatusLabel: () => 'Todo',
    setSideQuestStatus: noop,
    deleteSideQuest: noop,
    startEditingSideQuest: noop,
    handleSideQuestEditChange: noop,
    cancelSideQuestEdit: noop,
    saveSideQuestEdit: noop,
    addInputRefs: { current: {} },
    pulsingSideQuests: {}
};

describe('SideQuestList', () => {
    it('renders only footer when no side quests exist', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuests={[]}
            />
        );

        expect(screen.getByTestId('footer')).toBeInTheDocument();
        expect(screen.queryByText(/Side-quests:/i)).not.toBeInTheDocument();
    });

    it('renders quests and clamps height when provided', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuestMaxHeight={240}
                sideQuests={[
                    { id: 11, description: 'First' },
                    { id: 12, description: 'Second' },
                    { id: 13, description: 'Third' }
                ]}
            />
        );

        expect(screen.getByText('Side-quests:')).toBeInTheDocument();
        expect(screen.getByText('First')).toBeInTheDocument();
        const scrollRegion = screen.getByRole('list');
        expect(scrollRegion).toHaveStyle('max-height: 240px');
    });

    it('enables scroll mode for tall lists (6 side quests)', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuestMaxHeight={240}
                sideQuests={[
                    { id: 21, description: 'One' },
                    { id: 22, description: 'Two' },
                    { id: 23, description: 'Three' },
                    { id: 24, description: 'Four' },
                    { id: 25, description: 'Five' },
                    { id: 26, description: 'Six' }
                ]}
            />
        );

        const scrollRegion = screen.getByRole('list');
        expect(scrollRegion).toHaveAttribute('data-scrollable', 'true');
    });

    it('falls back to copy when a side quest description is missing', () => {
        render(
            <SideQuestList
                {...requiredProps}
                sideQuests={[
                    createSideQuestFixture({ id: 31, description: '   ' })
                ]}
            />
        );

        expect(screen.getByText('Untitled side quest')).toBeInTheDocument();
    });

    it('marks completed side quests with the completed class', () => {
        render(
            <SideQuestList
                {...requiredProps}
                getSideQuestStatus={() => 'done'}
                getSideQuestStatusLabel={() => 'Done'}
                sideQuests={[
                    createSideQuestFixture({ id: 51, description: 'Victory lap' })
                ]}
            />
        );

        const description = screen.getByText('Victory lap');
        expect(description).toHaveClass('completed');
        const listItem = description.closest('[role="listitem"]');
        expect(listItem).toHaveAttribute('data-status', 'done');
    });

    describe('Edit Mode', () => {
        it('enters edit mode when clicking on description text', () => {
            const startEditingSideQuest = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    startEditingSideQuest={startEditingSideQuest}
                    sideQuests={[{ id: 60, description: 'Edit me' }]}
                />
            );

            const description = screen.getByText('Edit me');
            description.click();

            expect(startEditingSideQuest).toHaveBeenCalledWith(1, { id: 60, description: 'Edit me' });
        });

        it('renders edit input when editing a side quest', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    editingSideQuest={{ questId: 1, sideQuestId: 61, description: 'Old text' }}
                    sideQuests={[{ id: 61, description: 'Old text' }]}
                />
            );

            const input = screen.getByDisplayValue('Old text');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('data-subtask-edit', '1:61');
        });

        it('calls save when Save button is clicked in edit mode', () => {
            const saveSideQuestEdit = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    saveSideQuestEdit={saveSideQuestEdit}
                    editingSideQuest={{ questId: 1, sideQuestId: 62, description: 'Editing' }}
                    sideQuests={[{ id: 62, description: 'Editing' }]}
                />
            );

            const saveButton = screen.getByText('Save');
            saveButton.click();

            expect(saveSideQuestEdit).toHaveBeenCalledWith(1, 62);
        });

        it('calls cancel when Cancel button is clicked in edit mode', () => {
            const cancelSideQuestEdit = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    cancelSideQuestEdit={cancelSideQuestEdit}
                    editingSideQuest={{ questId: 1, sideQuestId: 63, description: 'Editing' }}
                    sideQuests={[{ id: 63, description: 'Editing' }]}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            cancelButton.click();

            expect(cancelSideQuestEdit).toHaveBeenCalled();
        });

        it('saves on Enter key in edit input', () => {
            const saveSideQuestEdit = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    saveSideQuestEdit={saveSideQuestEdit}
                    editingSideQuest={{ questId: 1, sideQuestId: 64, description: 'Text' }}
                    sideQuests={[{ id: 64, description: 'Text' }]}
                />
            );

            const input = screen.getByDisplayValue('Text');
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            expect(saveSideQuestEdit).toHaveBeenCalledWith(1, 64);
        });

        it('cancels on Escape key in edit input', () => {
            const cancelSideQuestEdit = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    cancelSideQuestEdit={cancelSideQuestEdit}
                    editingSideQuest={{ questId: 1, sideQuestId: 65, description: 'Text' }}
                    sideQuests={[{ id: 65, description: 'Text' }]}
                />
            );

            const input = screen.getByDisplayValue('Text');
            input.focus();
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

            expect(cancelSideQuestEdit).toHaveBeenCalled();
        });
    });

    describe('Status Changes', () => {
        it('shows Start button for todo side quests', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    getSideQuestStatus={() => 'todo'}
                    sideQuests={[{ id: 70, description: 'Not started' }]}
                />
            );

            expect(screen.getByText('Start')).toBeInTheDocument();
            expect(screen.getByText('Complete')).toBeInTheDocument();
        });

        it('calls setSideQuestStatus when Start button is clicked', () => {
            const setSideQuestStatus = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    setSideQuestStatus={setSideQuestStatus}
                    getSideQuestStatus={() => 'todo'}
                    sideQuests={[{ id: 71, description: 'Start me' }]}
                />
            );

            const startButton = screen.getByText('Start');
            startButton.click();

            expect(setSideQuestStatus).toHaveBeenCalledWith(1, 71, 'in_progress');
        });

        it('hides Start button when side quest is in progress', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    getSideQuestStatus={() => 'in_progress'}
                    sideQuests={[{ id: 72, description: 'In progress' }]}
                />
            );

            expect(screen.queryByText('Start')).not.toBeInTheDocument();
            expect(screen.getByText('Complete')).toBeInTheDocument();
        });

        it('calls setSideQuestStatus when Complete button is clicked', () => {
            const setSideQuestStatus = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    setSideQuestStatus={setSideQuestStatus}
                    getSideQuestStatus={() => 'in_progress'}
                    sideQuests={[{ id: 73, description: 'Complete me' }]}
                />
            );

            const completeButton = screen.getByText('Complete');
            completeButton.click();

            expect(setSideQuestStatus).toHaveBeenCalledWith(1, 73, 'done');
        });

        it('shows Undo button for completed side quests', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    getSideQuestStatus={() => 'done'}
                    sideQuests={[{ id: 74, description: 'Done' }]}
                />
            );

            expect(screen.getByText('Undo')).toBeInTheDocument();
            // When done, both Start and Complete buttons are hidden
            expect(screen.queryByText('Complete')).not.toBeInTheDocument();
        });

        it('calls setSideQuestStatus when Undo button is clicked', () => {
            const setSideQuestStatus = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    setSideQuestStatus={setSideQuestStatus}
                    getSideQuestStatus={() => 'done'}
                    sideQuests={[{ id: 75, description: 'Undo me' }]}
                />
            );

            const undoButton = screen.getByText('Undo');
            undoButton.click();

            expect(setSideQuestStatus).toHaveBeenCalledWith(1, 75, 'todo');
        });
    });

    describe('Selection', () => {
        it('shows Edit and Delete buttons when side quest is selected', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    selectedSideQuest={{ questId: 1, sideQuestId: 80 }}
                    sideQuests={[{ id: 80, description: 'Selected' }]}
                />
            );

            expect(screen.getByText('Edit')).toBeInTheDocument();
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });

        it('calls startEditingSideQuest when Edit button is clicked', () => {
            const startEditingSideQuest = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    startEditingSideQuest={startEditingSideQuest}
                    selectedSideQuest={{ questId: 1, sideQuestId: 81 }}
                    sideQuests={[{ id: 81, description: 'Edit via button' }]}
                />
            );

            const editButton = screen.getByText('Edit');
            editButton.click();

            expect(startEditingSideQuest).toHaveBeenCalledWith(1, { id: 81, description: 'Edit via button' });
        });

        it('calls deleteSideQuest when Delete button is clicked', () => {
            const deleteSideQuest = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    deleteSideQuest={deleteSideQuest}
                    selectedSideQuest={{ questId: 1, sideQuestId: 82 }}
                    sideQuests={[{ id: 82, description: 'Delete me' }]}
                />
            );

            const deleteButton = screen.getByText('Delete');
            deleteButton.click();

            expect(deleteSideQuest).toHaveBeenCalledWith(1, 82);
        });

        it('applies selected class to selected side quest', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    selectedSideQuest={{ questId: 1, sideQuestId: 83 }}
                    sideQuests={[{ id: 83, description: 'Selected item' }]}
                />
            );

            const description = screen.getByText('Selected item');
            const listItem = description.closest('[role="listitem"]');
            expect(listItem).toHaveClass('selected');
        });
    });

    describe('Keyboard Interactions', () => {
        it('selects side quest on Enter key', () => {
            const handleSelectSideQuest = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    handleSelectSideQuest={handleSelectSideQuest}
                    sideQuests={[{ id: 90, description: 'Keyboard select' }]}
                />
            );

            const taskRow = screen.getByText('Keyboard select').closest('.task-row');
            taskRow.focus();
            taskRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            expect(handleSelectSideQuest).toHaveBeenCalledWith(1, 90);
        });

        it('selects side quest on Space key', () => {
            const handleSelectSideQuest = jest.fn();
            render(
                <SideQuestList
                    {...requiredProps}
                    handleSelectSideQuest={handleSelectSideQuest}
                    sideQuests={[{ id: 91, description: 'Space select' }]}
                />
            );

            const taskRow = screen.getByText('Space select').closest('.task-row');
            taskRow.focus();
            taskRow.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

            expect(handleSelectSideQuest).toHaveBeenCalledWith(1, 91);
        });
    });

    describe('Pulsing Animation', () => {
        it('applies pulse-subtle class when side quest is pulsing', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    pulsingSideQuests={{ '1:95': true }}
                    sideQuests={[{ id: 95, description: 'Pulsing' }]}
                />
            );

            const description = screen.getByText('Pulsing');
            expect(description).toHaveClass('pulse-subtle');
        });

        it('does not apply pulse class when side quest is not pulsing', () => {
            render(
                <SideQuestList
                    {...requiredProps}
                    pulsingSideQuests={{}}
                    sideQuests={[{ id: 96, description: 'Not pulsing' }]}
                />
            );

            const description = screen.getByText('Not pulsing');
            expect(description).not.toHaveClass('pulse-subtle');
        });
    });

    describe('Drag Integration', () => {
        it('renders with smoothDrag component when provided', () => {
            const MockSideQuestList = ({ renderItem, sideQuests }) => (
                <div data-testid="smooth-drag-list">
                    {sideQuests.map(sq => renderItem(sq, false, {}))}
                </div>
            );

            render(
                <SideQuestList
                    {...requiredProps}
                    smoothDrag={{ SideQuestList: MockSideQuestList }}
                    sideQuests={[{ id: 100, description: 'Draggable' }]}
                />
            );

            expect(screen.getByTestId('smooth-drag-list')).toBeInTheDocument();
            expect(screen.getByText('Draggable')).toBeInTheDocument();
        });

        it('applies dragging class when isDragging is true', () => {
            const MockSideQuestList = ({ renderItem, sideQuests }) => (
                <div>
                    {sideQuests.map(sq => renderItem(sq, true, { handleProps: {}, handleStyle: {} }))}
                </div>
            );

            render(
                <SideQuestList
                    {...requiredProps}
                    smoothDrag={{ SideQuestList: MockSideQuestList }}
                    sideQuests={[{ id: 101, description: 'Being dragged' }]}
                />
            );

            const description = screen.getByText('Being dragged');
            const listItem = description.closest('[role="listitem"]');
            expect(listItem).toHaveClass('dragging');
            expect(listItem).toHaveAttribute('data-dragging', 'true');
        });
    });
});
