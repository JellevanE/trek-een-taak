import React from 'react';
import { useDragControls } from 'framer-motion';

export const getItemKey = (item, fallback) => {
    if (item && (item.id || item.id === 0)) return item.id;
    if (item && (item.key || item.key === 0)) return item.key;
    return fallback;
};

export const reconcileOrder = (incoming, previous) => {
    const sanitizedIncoming = Array.isArray(incoming) ? incoming : [];
    if (!previous || previous.length === 0) {
        return sanitizedIncoming.slice();
    }
    const incomingMap = new Map(
        sanitizedIncoming.map((item, index) => [getItemKey(item, index), item])
    );
    const merged = [];
    previous.forEach((prevItem, idx) => {
        const key = getItemKey(prevItem, idx);
        if (incomingMap.has(key)) {
            merged.push(incomingMap.get(key));
            incomingMap.delete(key);
        }
    });
    sanitizedIncoming.forEach((item, idx) => {
        const key = getItemKey(item, idx);
        if (incomingMap.has(key)) {
            merged.push(incomingMap.get(key));
            incomingMap.delete(key);
        }
    });
    return merged;
};

export const useNeonDragHandle = () => {
    const controls = useDragControls();
    const [isDragging, setIsDragging] = React.useState(false);

    const startDrag = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        controls.start(event, { snapToCursor: true });
    }, [controls]);

    const dragMeta = React.useMemo(() => ({
        handleProps: {
            'data-drag-handle': 'true',
            'aria-grabbed': isDragging ? 'true' : 'false',
            onPointerDown: startDrag,
            onMouseDown: startDrag,
            onTouchStart: startDrag
        },
        handleStyle: { cursor: isDragging ? 'grabbing' : 'grab' },
        isDragging
    }), [isDragging, startDrag]);

    return { controls, dragMeta, setIsDragging };
};
