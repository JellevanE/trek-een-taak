import PropTypes from 'prop-types';
import React from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    MeasuringStrategy,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DEFAULT_THEME_ID } from '../../../theme';
import { useQuestMotionTokens } from '../hooks/useQuestMotionTokens.js';
import { getItemKey, reconcileOrder } from './listUtils.js';

const isDragInteractiveTarget = (target) =>
    target && typeof target.closest === 'function' &&
    target.closest('button, a, input, textarea, select, [data-no-drag]');

const buildHandleProps = (attributes, listeners, setActivatorNodeRef, isDragging) => {
    const {
        onKeyDown,
        onKeyUp,
        ...safeListeners
    } = listeners || {};
    const props = {
        ...attributes,
        ...safeListeners,
        ref: setActivatorNodeRef,
        'data-drag-handle': 'true',
        'aria-grabbed': isDragging ? 'true' : 'false',
    };

    if (safeListeners && typeof safeListeners.onPointerDown === 'function') {
        props.onPointerDown = (event) => {
            if (isDragInteractiveTarget(event.target)) return;
            safeListeners.onPointerDown(event);
        };
    }

    return props;
};

const QuestListRow = ({
    id,
    item,
    renderItem,
    motionTokens,
    listIsDragging,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });
    const scale = isDragging ? motionTokens.drag.scale : 1;
    const adjustedTransform = transform
        ? { ...transform, x: 0, scaleX: scale, scaleY: scale }
        : (isDragging ? { x: 0, y: 0, scaleX: scale, scaleY: scale } : null);

    const style = {
        transform: adjustedTransform ? CSS.Transform.toString(adjustedTransform) : undefined,
        transition,
        listStyle: 'none',
        width: '100%',
        visibility: isDragging ? 'hidden' : 'visible',
        zIndex: isDragging ? 2 : undefined,
        boxShadow: isDragging ? motionTokens.drag.shadow : undefined,
        filter: isDragging && motionTokens.drag.glow !== 'none'
            ? `drop-shadow(${motionTokens.drag.glow})`
            : undefined,
    };

    const handleProps = React.useMemo(() => (
        buildHandleProps(attributes, listeners, setActivatorNodeRef, isDragging)
    ), [attributes, isDragging, listeners, setActivatorNodeRef]);

    return (
        <div ref={setNodeRef} style={style}>
            {renderItem(item, isDragging, {
                handleProps,
                handleStyle: { cursor: isDragging ? 'grabbing' : 'grab' },
                isDragging,
                listIsDragging,
            })}
        </div>
    );
};

QuestListRow.propTypes = {
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    item: PropTypes.any.isRequired,
    motionTokens: PropTypes.shape({
        durations: PropTypes.object,
        easing: PropTypes.object,
        drag: PropTypes.object,
    }).isRequired,
    renderItem: PropTypes.func.isRequired,
    listIsDragging: PropTypes.bool,
};

export const FramerQuestList = ({
    items,
    onReorder,
    onDragEnd,
    itemGap,
    itemHeight,
    renderItem,
    refreshToken,
    themeName,
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const containerRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dimensions, setDimensions] = React.useState(null);
    const [activeId, setActiveId] = React.useState(null);

    const [order, setOrder] = React.useState(() => (Array.isArray(items) ? items : []));
    const latestOrderRef = React.useRef(order);
    const dragStartOrderRef = React.useRef(order);

    React.useEffect(() => {
        if (isDragging) return;
        setOrder((prev) => {
            const next = reconcileOrder(items, prev);
            latestOrderRef.current = next;
            return next;
        });
    }, [items, refreshToken, isDragging]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const itemIds = React.useMemo(
        () => order.map((item, index) => getItemKey(item, index)),
        [order],
    );

    const activeItem = React.useMemo(() => {
        if (activeId === null) return null;
        const index = itemIds.findIndex((id) => id === activeId);
        return index >= 0 ? order[index] : null;
    }, [activeId, itemIds, order]);

    const handleDragStart = React.useCallback(({ active }) => {
        if (containerRef.current) {
            const { width } = containerRef.current.getBoundingClientRect();
            setDimensions({ width });
        }
        dragStartOrderRef.current = latestOrderRef.current;
        setActiveId(active?.id ?? null);
        setIsDragging(true);
    }, []);

    const handleDragOver = React.useCallback(({ active, over }) => {
        if (!over || active.id === over.id) return;
        setOrder((prev) => {
            const oldIndex = prev.findIndex((item, index) => getItemKey(item, index) === active.id);
            const newIndex = prev.findIndex((item, index) => getItemKey(item, index) === over.id);
            if (oldIndex === -1 || newIndex === -1) return prev;
            const next = arrayMove(prev, oldIndex, newIndex);
            latestOrderRef.current = next;
            return next;
        });
    }, []);

    const handleDragEnd = React.useCallback(({ active, over }) => {
        setIsDragging(false);
        setActiveId(null);
        setDimensions(null);
        if (over && active.id !== over.id) {
            setOrder((prev) => {
                const oldIndex = prev.findIndex((item, index) =>
                    getItemKey(item, index) === active.id
                );
                const newIndex = prev.findIndex((item, index) =>
                    getItemKey(item, index) === over.id
                );
                if (oldIndex === -1 || newIndex === -1) return prev;
                const next = arrayMove(prev, oldIndex, newIndex);
                latestOrderRef.current = next;
                return next;
            });
        }
        if (onReorder && latestOrderRef.current) {
            onReorder(latestOrderRef.current);
        }
        if (onDragEnd) {
            onDragEnd();
        }
    }, [onReorder, onDragEnd]);

    const handleDragCancel = React.useCallback(() => {
        setIsDragging(false);
        setActiveId(null);
        setDimensions(null);
        if (dragStartOrderRef.current) {
            setOrder(dragStartOrderRef.current);
            latestOrderRef.current = dragStartOrderRef.current;
        }
    }, []);

    if (!order || order.length === 0) {
        return null;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                <div
                    ref={containerRef}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: itemGap,
                        position: 'relative',
                        minHeight: itemHeight > 0 ? itemHeight : undefined,
                        width: isDragging && dimensions ? dimensions.width : '100%',
                    }}
                >
                    {order.map((item, index) => {
                        const id = getItemKey(item, index);
                        return (
                            <QuestListRow
                                key={id}
                                id={id}
                                item={item}
                                renderItem={renderItem}
                                motionTokens={motionTokens}
                                listIsDragging={isDragging}
                            />
                        );
                    })}
                </div>
            </SortableContext>
            <DragOverlay style={{ pointerEvents: 'none' }}>
                {activeItem
                    ? (
                        <div style={{ width: dimensions?.width || '100%' }}>
                            {renderItem(activeItem, true, {
                                handleProps: {},
                                handleStyle: { cursor: 'grabbing' },
                                isDragging: true,
                                listIsDragging: true,
                            })}
                        </div>
                    )
                    : null}
            </DragOverlay>
        </DndContext>
    );
};

FramerQuestList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.any).isRequired,
    onReorder: PropTypes.func,
    onDragEnd: PropTypes.func,
    itemGap: PropTypes.number,
    itemHeight: PropTypes.number,
    renderItem: PropTypes.func.isRequired,
    refreshToken: PropTypes.number,
    themeName: PropTypes.string,
};

FramerQuestList.defaultProps = {
    onReorder: undefined,
    itemGap: 0,
    itemHeight: 0,
    refreshToken: 0,
    themeName: DEFAULT_THEME_ID,
};

export default FramerQuestList;
