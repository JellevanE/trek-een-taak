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
        // Don't start drag if interacting with a button, input, or other interactive element
        const target = event.target;
        const interactive = target.closest('button, a, input, textarea, select, [role="button"], [data-no-drag], .quest-card-actions, .action-button');

        if (interactive && !interactive.hasAttribute('data-drag-handle')) {
            return;
        }

        // Prevent default behavior to avoid text selection while dragging
        // but only if we're actually starting a drag
        if (event.cancelable) {
            event.preventDefault();
        }

        // We don't stop propagation here so that click events can still fire
        // if the drag doesn't actually move much (Framer Motion handles this)
        // But for the handle itself, we might want to.
        // For whole-card drag, we generally want to let events bubble unless we're dragging.

        controls.start(event, { snapToCursor: false }); // snapToCursor: false is better for whole-card drag
    }, [controls]);

    const dragMeta = React.useMemo(() => ({
        handleProps: {
            'data-drag-handle': 'true',
            'aria-grabbed': isDragging ? 'true' : 'false',
            onPointerDown: startDrag
        },
        handleStyle: { cursor: isDragging ? 'grabbing' : 'grab' },
        isDragging
    }), [isDragging, startDrag]);

    return { controls, dragMeta, setIsDragging };
};
