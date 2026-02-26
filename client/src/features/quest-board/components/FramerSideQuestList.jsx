import PropTypes from 'prop-types';
import React from 'react';
import {
    closestCenter,
    DndContext,
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
            event.stopPropagation();
            safeListeners.onPointerDown(event);
        };
    }

    return props;
};

const SideQuestRow = ({
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
    const dragScale = isDragging ? Math.max(1, motionTokens.drag.scale - 0.01) : 1;
    const adjustedTransform = transform
        ? { ...transform, x: 0, scaleX: dragScale, scaleY: dragScale }
        : (isDragging ? { x: 0, y: 0, scaleX: dragScale, scaleY: dragScale } : null);

    const style = {
        transform: adjustedTransform ? CSS.Transform.toString(adjustedTransform) : undefined,
        transition,
        listStyle: 'none',
        width: '100%',
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

SideQuestRow.propTypes = {
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

export const FramerSideQuestList = ({
    questId,
    sideQuests,
    onReorder,
    onDragEnd,
    itemGap,
    itemHeight,
    renderItem,
    maxContainerHeight,
    refreshToken,
    themeName,
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const [order, setOrder] = React.useState(() => (Array.isArray(sideQuests) ? sideQuests : []));
    const latestOrderRef = React.useRef(order);
    const dragStartOrderRef = React.useRef(order);
    const containerRef = React.useRef(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dimensions, setDimensions] = React.useState(null);

    React.useEffect(() => {
        if (isDragging) return;
        setOrder((prev) => {
            const next = reconcileOrder(sideQuests, prev);
            latestOrderRef.current = next;
            return next;
        });
    }, [sideQuests, refreshToken, questId, isDragging]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const itemIds = React.useMemo(
        () => order.map((item, index) => getItemKey(item, index)),
        [order],
    );

    const handleDragStart = React.useCallback(() => {
        if (containerRef.current) {
            const { width } = containerRef.current.getBoundingClientRect();
            setDimensions({ width });
        }
        dragStartOrderRef.current = latestOrderRef.current;
        setIsDragging(true);
    }, []);

    const handleDragOver = React.useCallback(({ active, over }) => {
        if (!over || active.id === over.id) return;
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
    }, []);

    const handleDragEnd = React.useCallback(({ active, over }) => {
        setIsDragging(false);
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
        setDimensions(null);
        if (dragStartOrderRef.current) {
            setOrder(dragStartOrderRef.current);
            latestOrderRef.current = dragStartOrderRef.current;
        }
    }, []);

    React.useEffect(() => {
        if (!maxContainerHeight || !containerRef.current) {
            setIsOverflowing(false);
            return undefined;
        }
        const node = containerRef.current;
        const measure = () => {
            setIsOverflowing(node.scrollHeight - 1 > node.clientHeight);
        };
        measure();
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            const raf = window.requestAnimationFrame(measure);
            return () => window.cancelAnimationFrame(raf);
        }
        return undefined;
    }, [order, maxContainerHeight, itemGap]);

    const wrapperStyle = {
        maxHeight: typeof maxContainerHeight === 'number' && maxContainerHeight > 0
            ? maxContainerHeight
            : undefined,
        overflowY: typeof maxContainerHeight === 'number' && maxContainerHeight > 0
            ? 'auto'
            : 'visible',
        overflowX: 'hidden',
        paddingRight: isOverflowing ? 6 : 0,
    };

    if (!order || order.length === 0) {
        return null;
    }

    return (
        <div ref={containerRef} style={wrapperStyle}>
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
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: itemGap,
                            minHeight: itemHeight > 0 ? itemHeight : undefined,
                            width: isDragging && dimensions ? dimensions.width : '100%',
                        }}
                    >
                        {order.map((item, index) => {
                            const id = getItemKey(item, index);
                            return (
                                <SideQuestRow
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
            </DndContext>
        </div>
    );
};

FramerSideQuestList.propTypes = {
    questId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    sideQuests: PropTypes.arrayOf(PropTypes.any).isRequired,
    onReorder: PropTypes.func,
    onDragEnd: PropTypes.func,
    itemGap: PropTypes.number,
    itemHeight: PropTypes.number,
    renderItem: PropTypes.func.isRequired,
    maxContainerHeight: PropTypes.number,
    refreshToken: PropTypes.number,
    themeName: PropTypes.string,
};

FramerSideQuestList.defaultProps = {
    questId: null,
    onReorder: undefined,
    itemGap: 0,
    itemHeight: 0,
    maxContainerHeight: null,
    refreshToken: 0,
    themeName: DEFAULT_THEME_ID,
};

export default FramerSideQuestList;
