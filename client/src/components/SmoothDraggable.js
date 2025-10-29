import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSpring, useSprings, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

/**
 * SmoothDraggableList - Physics-based drag and drop for quest cards
 * 
 * This replaces the native HTML5 drag API with smooth React Spring animations.
 * 
 * Features:
 * - Smooth dragging with spring physics
 * - Items automatically reorder as you drag
 * - Satisfying release animation
 * - Touch support built-in
 * - No more glitchy ghost images
 * 
 * Usage:
 * <SmoothDraggableList
 *   items={quests}
 *   onReorder={(newOrder) => setQuests(newOrder)}
 *   renderItem={(quest, isDragging) => (
 *     <div className="quest">Your quest card</div>
 *   )}
 * />
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ACTIVE_DRAG_CONFIG = { tension: 360, friction: 32, mass: 0.9 };
const RESTING_CONFIG = { tension: 220, friction: 28, mass: 1.05 };
const SIDE_ACTIVE_CONFIG = { tension: 320, friction: 30, mass: 0.85 };
const DRAG_ACTIVATION_THRESHOLD = 30;
const SIDE_DRAG_ACTIVATION_THRESHOLD = 20;

const getPointerClientY = (event) => {
    if (!event) return null;
    if (typeof event.clientY === 'number') return event.clientY;
    if (event.touches && event.touches[0]) return event.touches[0].clientY;
    if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].clientY;
    return null;
};

const getItemKey = (item, index) => {
    if (item && (item.id || item.id === 0)) return item.id;
    if (item && (item.key || item.key === 0)) return item.key;
    return index;
};

const buildOffsets = (order, getHeight, gap = 0) => {
    let offset = 0;
    const map = new Map();
    order.forEach((key, index) => {
        map.set(key, offset);
        const height = getHeight(key);
        offset += height;
        if (gap > 0 && index < order.length - 1) {
            offset += gap;
        }
    });
    return { map, total: offset };
};

const indexFromOffset = (order, target, getHeight, gap = 0) => {
    let accumulated = 0;
    for (let idx = 0; idx < order.length; idx += 1) {
        const key = order[idx];
        const height = getHeight(key);
        if (target < accumulated + height / 2) {
            return idx;
        }
        accumulated += height;
        if (gap > 0 && idx < order.length - 1) {
            accumulated += gap;
        }
    }
    return order.length - 1;
};

const estimateListHeight = (count, baseHeight, gap = 0) => {
    if (count <= 0) return 0;
    return (count * baseHeight) + (Math.max(count - 1, 0) * gap);
};

/**
 * Check if the target element or any of its parents is an interactive element
 * that should prevent drag initiation
 */
const INTERACTIVE_TAGS = new Set(['button', 'input', 'select', 'textarea', 'a']);

const isInteractiveElement = (target) => {
    if (!target) return false;

    // Allow drag handles to initiate drags even though they are buttons
    if (target.closest?.('[data-drag-handle="true"]')) {
        return false;
    }

    const isInteractiveTag = (element) => {
        if (!element || !element.tagName) return false;
        return INTERACTIVE_TAGS.has(element.tagName.toLowerCase());
    };

    if (isInteractiveTag(target) || target.contentEditable === 'true') {
        return true;
    }

    let parent = target.parentElement;
    while (parent && parent.getAttribute) {
        if (parent.hasAttribute('data-drag-container')) {
            break;
        }
        if (isInteractiveTag(parent) || parent.contentEditable === 'true') {
            return true;
        }
        parent = parent.parentElement;
    }

    return false;
};

export const SmoothDraggableList = ({
    items,
    onReorder,
    renderItem,
    itemHeight = 100,
    itemGap = 0,
    refreshToken = 0
}) => {
    const itemsRef = useRef(items);
    const keys = useMemo(() => {
        return items.map((item, index) => getItemKey(item, index));
    }, [items]);
    const keysRef = useRef(keys);
    const order = useRef(keys.slice());
    const isDraggingRef = useRef(false);
    const orderChangedRef = useRef(false);
    const heightsRef = useRef(new Map());
    const nodesRef = useRef(new Map());
    const observersRef = useRef(new Map());
    const initialHeight = estimateListHeight(items.length, itemHeight, itemGap);
    const listHeightRef = useRef(initialHeight);
    const [listHeight, setListHeight] = useState(initialHeight);
    const dragCancelledRef = useRef(false);
    const dragStateRef = useRef({ key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 });

    const hasResizeObserver = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';

    const getHeight = useCallback((key) => {
        const stored = heightsRef.current.get(key);
        return stored && stored > 0 ? stored : itemHeight;
    }, [itemHeight]);

    const measureNode = useCallback((key) => {
        const node = nodesRef.current.get(key);
        if (!node) return false;
        const rect = node.getBoundingClientRect?.();
        if (!rect || !rect.height) return false;
        const prev = heightsRef.current.get(key) ?? 0;
        if (Math.abs(prev - rect.height) > 0.5) {
            heightsRef.current.set(key, rect.height);
            return true;
        }
        return false;
    }, []);

    const [springs, api] = useSprings(
        items.length,
        (index) => ({
            y: index * (itemHeight + itemGap),
            scale: 1,
            zIndex: 0,
            shadow: 1,
            immediate: false,
        }),
        [items.length, itemHeight, itemGap]
    );

    const updateLayout = useCallback((immediate = false) => {
        const { map, total } = buildOffsets(order.current, getHeight, itemGap);
        if (Math.abs(listHeightRef.current - total) > 1) {
            listHeightRef.current = total;
            setListHeight(total);
        }
        api.start((index) => {
            const key = keysRef.current[index];
            const y = map.get(key) ?? index * (itemHeight + itemGap);
            return {
                y,
                scale: 1,
                zIndex: 0,
                shadow: 1,
                immediate,
                config: RESTING_CONFIG,
            };
        });
    }, [api, getHeight, itemGap, itemHeight]);

    const measureAllNodes = useCallback(() => {
        let changed = false;
        keysRef.current.forEach((key) => {
            if (measureNode(key)) {
                changed = true;
            }
        });
        if (changed) {
            updateLayout(true);
        }
    }, [measureNode, updateLayout]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useLayoutEffect(() => {
        // Check if the actual key VALUES changed (not just array reference)
        const keysActuallyChanged = 
            keysRef.current.length !== keys.length ||
            keysRef.current.some((key, index) => key !== keys[index]);

        if (keysActuallyChanged) {
            const currentKeys = new Set(keys);
            heightsRef.current.forEach((_, key) => {
                if (!currentKeys.has(key)) {
                    heightsRef.current.delete(key);
                    const observer = observersRef.current.get(key);
                    if (observer) {
                        observer.disconnect();
                        observersRef.current.delete(key);
                    }
                    nodesRef.current.delete(key);
                }
            });

            keysRef.current = keys;
            order.current = keys.slice();
            updateLayout(true);
        } else {
            keysRef.current = keys;
        }
    }, [keys, updateLayout]);

    useLayoutEffect(() => {
        updateLayout(true);
    }, [items, updateLayout]);

    useEffect(() => () => {
        observersRef.current.forEach((observer) => observer.disconnect());
        observersRef.current.clear();
        nodesRef.current.clear();
    }, []);

    useLayoutEffect(() => {
        measureAllNodes();
    }, [items, measureAllNodes, refreshToken]);

    useEffect(() => {
        if (!hasResizeObserver && typeof window !== 'undefined') {
            const handle = () => measureAllNodes();
            window.addEventListener('resize', handle);
            return () => window.removeEventListener('resize', handle);
        }
        return undefined;
    }, [hasResizeObserver, measureAllNodes]);

    const registerNode = useCallback((key) => (node) => {
        const teardown = () => {
            const observer = observersRef.current.get(key);
            if (observer) {
                observer.disconnect();
                observersRef.current.delete(key);
            }
        };

        teardown();

        if (!node) {
            nodesRef.current.delete(key);
            return;
        }

        nodesRef.current.set(key, node);
        if (measureNode(key)) {
            updateLayout(true);
        }

        if (hasResizeObserver) {
            const observer = new window.ResizeObserver(() => {
                if (measureNode(key)) {
                    updateLayout(true);
                }
            });
            observer.observe(node);
            observersRef.current.set(key, observer);
        }
    }, [hasResizeObserver, measureNode, updateLayout]);

    const bind = useDrag(
        ({ args: [itemKey], active, movement: [, my], tap, first, event, cancel }) => {
            // IMMEDIATELY check for tap - if it's a tap, exit completely
            if (tap) {
                isDraggingRef.current = false;
                orderChangedRef.current = false;
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                return;
            }

            // On first interaction, verify we're on a drag handle and NOT on an interactive element
            if (first) {
                dragCancelledRef.current = false;
                orderChangedRef.current = false;
                isDraggingRef.current = false;
                
                const target = event?.target;
                
                // Check if we clicked on an interactive element
                if (isInteractiveElement(target)) {
                    dragCancelledRef.current = true;
                    cancel?.();
                    return;
                }

                // Check if we're on a drag handle
                const isHandle = target?.closest?.('[data-drag-handle="true"]');
                if (!isHandle) {
                    dragCancelledRef.current = true;
                    cancel?.();
                    return;
                }
            }

            // If this gesture was cancelled, ignore all subsequent events
            if (dragCancelledRef.current) {
                if (!active) {
                    dragCancelledRef.current = false;
                    dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                }
                return;
            }

            // If gesture ended and we're not dragging, just clean up
            if (!active && !isDraggingRef.current) {
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                return;
            }

            // Check if we should activate drag based on movement threshold
            let justActivated = false;
            if (!isDraggingRef.current) {
                if (!active || Math.abs(my) < DRAG_ACTIVATION_THRESHOLD) {
                    if (!active) {
                        isDraggingRef.current = false;
                        orderChangedRef.current = false;
                        dragCancelledRef.current = false;
                        dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                    }
                    return;
                }
                isDraggingRef.current = true;
                justActivated = true;
            }

            // Now we're in active drag mode
            const currentIndex = order.current.indexOf(itemKey);
            if (currentIndex === -1) return;

            const { map, total } = buildOffsets(order.current, getHeight, itemGap);
            const currentOffset = map.get(itemKey) ?? 0;
            const currentHeight = getHeight(itemKey);
            const maxOffset = Math.max(total - currentHeight, 0);

            let stateForItem = dragStateRef.current;
            if (justActivated || stateForItem.key !== itemKey) {
                const node = nodesRef.current.get(itemKey);
                const pointerY = getPointerClientY(event);
                let anchor = currentHeight > 0 ? Math.min(currentHeight / 2, currentHeight) : 0;
                if (node && typeof pointerY === 'number') {
                    const rect = node.getBoundingClientRect();
                    const measuredHeight = rect.height || currentHeight || 0;
                    anchor = clamp(pointerY - rect.top, 0, measuredHeight);
                }
                stateForItem = {
                    key: itemKey,
                    baseOffset: currentOffset,
                    movementAtBase: my,
                    anchor,
                };
                dragStateRef.current = stateForItem;
            }

            if (stateForItem.key !== itemKey) {
                stateForItem = {
                    key: itemKey,
                    baseOffset: currentOffset,
                    movementAtBase: my,
                    anchor: currentHeight > 0 ? Math.min(currentHeight / 2, currentHeight) : 0,
                };
                dragStateRef.current = stateForItem;
            }

            const movementDelta = my - stateForItem.movementAtBase;
            const rawDesiredOffset = stateForItem.baseOffset + movementDelta;
            const desiredOffset = clamp(rawDesiredOffset, 0, maxOffset);
            const pointerPosition = clamp(desiredOffset + stateForItem.anchor, 0, total + currentHeight);
            const targetIndex = indexFromOffset(order.current, pointerPosition, getHeight, itemGap);

            if (targetIndex !== currentIndex) {
                const newOrder = order.current.slice();
                newOrder.splice(currentIndex, 1);
                newOrder.splice(targetIndex, 0, itemKey);
                order.current = newOrder;
                orderChangedRef.current = true;
            }

            const { map: updatedMap, total: updatedTotal } = buildOffsets(order.current, getHeight, itemGap);
            if (Math.abs(listHeightRef.current - updatedTotal) > 1) {
                listHeightRef.current = updatedTotal;
                setListHeight(updatedTotal);
            }

            const maxActiveOffset = Math.max(updatedTotal - currentHeight, 0);
            const activeOffset = clamp(desiredOffset, 0, maxActiveOffset);

            dragStateRef.current = {
                key: itemKey,
                baseOffset: activeOffset,
                movementAtBase: my,
                anchor: stateForItem.anchor,
            };
            const isActiveDrag = active && isDraggingRef.current;

            api.start((index) => {
                const key = keysRef.current[index];
                const offset = updatedMap.get(key) ?? index * (itemHeight + itemGap);

                if (key === itemKey) {
                    return {
                        y: isActiveDrag ? activeOffset : offset,
                        scale: isActiveDrag ? 1.02 : 1,
                        zIndex: isActiveDrag ? 20 : 0,
                        shadow: isActiveDrag ? 14 : 2,
                        immediate: isActiveDrag ? (prop) => prop === 'y' : false,
                        config: isActiveDrag ? ACTIVE_DRAG_CONFIG : RESTING_CONFIG,
                    };
                }
                return {
                    y: offset,
                    scale: 1,
                    zIndex: 0,
                    shadow: 1,
                    immediate: false,
                    config: RESTING_CONFIG,
                };
            });

            if (!active && isDraggingRef.current) {
                isDraggingRef.current = false;
                
                // Snap all items to their final grid positions
                const { map: finalMap } = buildOffsets(order.current, getHeight, itemGap);
                api.start((index) => {
                    const key = keysRef.current[index];
                    const offset = finalMap.get(key) ?? index * (itemHeight + itemGap);
                    return {
                        y: offset,
                        scale: 1,
                        zIndex: 0,
                        shadow: 1,
                        immediate: false,
                        config: RESTING_CONFIG,
                    };
                });
                
                if (orderChangedRef.current) {
                    const reorderedItems = order.current
                        .map((key) => {
                            const sourceIndex = keysRef.current.indexOf(key);
                            return itemsRef.current[sourceIndex];
                        })
                        .filter((item) => item !== undefined);
                    onReorder?.(reorderedItems);
                    orderChangedRef.current = false;
                }
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
            }
        },
        {
            filterTaps: true,
            pointer: { touch: true },
            preventScroll: true,
            axis: 'y',
        }
    );

    return (
        <div style={{ position: 'relative', height: listHeight }}>
            {springs.map(({ y, scale, zIndex, shadow }, index) => {
                const item = items[index];
                const key = keysRef.current[index];
                const isDragging = (zIndex.get ? zIndex.get() : zIndex) > 0;
                const rawHandleProps = bind(key);
                const handleProps = {
                    ...rawHandleProps,
                    'data-drag-handle': 'true',
                    'aria-grabbed': isDragging ? 'true' : 'false',
                };
                const dragMeta = {
                    handleProps,
                    handleStyle: { cursor: isDragging ? 'grabbing' : 'grab' },
                    isDragging,
                };

                return (
                    <animated.div
                        key={key}
                        data-drag-container
                        style={{
                            position: 'absolute',
                            width: '100%',
                            y,
                            scale,
                            zIndex,
                            boxShadow: shadow.to
                                ? shadow.to((s) => `rgba(0, 0, 0, 0.18) 0px ${s}px ${2 * s}px 0px`)
                                : `rgba(0, 0, 0, 0.18) 0px ${shadow}px ${2 * shadow}px 0px`,
                            touchAction: isDragging ? 'none' : 'auto',
                            willChange: isDragging ? 'transform' : 'auto',
                        }}
                    >
                        <div ref={registerNode(key)} style={{ width: '100%' }}>
                            {renderItem(item, isDragging, dragMeta)}
                        </div>
                    </animated.div>
                );
            })}
        </div>
    );
};

/**
 * SmoothDraggableSideQuests - Smooth drag for nested side quests
 * 
 * Optimized for smaller items with tighter spacing.
 */
export const SmoothDraggableSideQuests = ({
    items,
    onReorder,
    renderItem,
    itemHeight = 60,
    itemGap = 0,
    refreshToken = 0,
    maxContainerHeight = null,
    footer = null
}) => {
    const itemsRef = useRef(items);
    const keys = useMemo(() => items.map((item, index) => getItemKey(item, index)), [items]);
    const keysRef = useRef(keys);
    const order = useRef(keys.slice());
    const isDraggingRef = useRef(false);
    const orderChangedRef = useRef(false);
    const heightsRef = useRef(new Map());
    const nodesRef = useRef(new Map());
    const observersRef = useRef(new Map());
    const initialHeight = estimateListHeight(items.length, itemHeight, itemGap);
    const listHeightRef = useRef(initialHeight);
    const [listHeight, setListHeight] = useState(initialHeight);
    const dragCancelledRef = useRef(false);
    const dragStateRef = useRef({ key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 });

    const hasResizeObserver = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';

    const getHeight = useCallback((key) => {
        const stored = heightsRef.current.get(key);
        return stored && stored > 0 ? stored : itemHeight;
    }, [itemHeight]);

    const measureNode = useCallback((key) => {
        const node = nodesRef.current.get(key);
        if (!node) return false;
        const rect = node.getBoundingClientRect?.();
        if (!rect || !rect.height) return false;
        const prev = heightsRef.current.get(key) ?? 0;
        if (Math.abs(prev - rect.height) > 0.5) {
            heightsRef.current.set(key, rect.height);
            return true;
        }
        return false;
    }, []);

    const [springs, api] = useSprings(
        items.length,
        (index) => ({
            y: index * (itemHeight + itemGap),
            scale: 1,
            zIndex: 0,
            opacity: 1,
            immediate: false,
        }),
        [items.length, itemHeight, itemGap]
    );

    const updateLayout = useCallback((immediate = false) => {
        const { map, total } = buildOffsets(order.current, getHeight, itemGap);
        if (Math.abs(listHeightRef.current - total) > 1) {
            listHeightRef.current = total;
            setListHeight(total);
        }
        api.start((index) => {
            const key = keysRef.current[index];
            const y = map.get(key) ?? index * (itemHeight + itemGap);
            return {
                y,
                scale: 1,
                zIndex: 0,
                opacity: 1,
                immediate,
                config: RESTING_CONFIG,
            };
        });
    }, [api, getHeight, itemGap, itemHeight]);

    const measureAllNodes = useCallback(() => {
        let changed = false;
        keysRef.current.forEach((key) => {
            if (measureNode(key)) {
                changed = true;
            }
        });
        if (changed) {
            updateLayout(true);
        }
    }, [measureNode, updateLayout]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useLayoutEffect(() => {
        const keysActuallyChanged =
            keysRef.current.length !== keys.length ||
            keysRef.current.some((key, index) => key !== keys[index]);

        if (keysActuallyChanged) {
            const currentKeys = new Set(keys);
            heightsRef.current.forEach((_, key) => {
                if (!currentKeys.has(key)) {
                    heightsRef.current.delete(key);
                    const observer = observersRef.current.get(key);
                    if (observer) {
                        observer.disconnect();
                        observersRef.current.delete(key);
                    }
                    nodesRef.current.delete(key);
                }
            });
            keysRef.current = keys;
            order.current = keys.slice();
            updateLayout(true);
        } else {
            keysRef.current = keys;
        }
    }, [keys, updateLayout]);

    useLayoutEffect(() => {
        updateLayout(true);
    }, [items, updateLayout]);

    useEffect(() => () => {
        observersRef.current.forEach((observer) => observer.disconnect());
        observersRef.current.clear();
        nodesRef.current.clear();
    }, []);

    useLayoutEffect(() => {
        measureAllNodes();
    }, [items, measureAllNodes, refreshToken]);

    useEffect(() => {
        if (!hasResizeObserver && typeof window !== 'undefined') {
            const handle = () => measureAllNodes();
            window.addEventListener('resize', handle);
            return () => window.removeEventListener('resize', handle);
        }
        return undefined;
    }, [hasResizeObserver, measureAllNodes]);

    const registerNode = useCallback((key) => (node) => {
        const teardown = () => {
            const observer = observersRef.current.get(key);
            if (observer) {
                observer.disconnect();
                observersRef.current.delete(key);
            }
        };

        teardown();

        if (!node) {
            nodesRef.current.delete(key);
            return;
        }

        nodesRef.current.set(key, node);
        if (measureNode(key)) {
            updateLayout(true);
        }

        if (hasResizeObserver) {
            const observer = new window.ResizeObserver(() => {
                if (measureNode(key)) {
                    updateLayout(true);
                }
            });
            observer.observe(node);
            observersRef.current.set(key, observer);
        }
    }, [hasResizeObserver, measureNode, updateLayout]);

    const bind = useDrag(
        ({ args: [itemKey], active, movement: [, my], tap, first, event, cancel }) => {
            // IMMEDIATELY check for tap - if it's a tap, exit completely
            if (tap) {
                isDraggingRef.current = false;
                orderChangedRef.current = false;
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                return;
            }

            // On first interaction, verify we're on a drag handle and NOT on an interactive element
            if (first) {
                dragCancelledRef.current = false;
                orderChangedRef.current = false;
                isDraggingRef.current = false;
                
                const target = event?.target;
                
                // Check if we clicked on an interactive element
                if (isInteractiveElement(target)) {
                    dragCancelledRef.current = true;
                    cancel?.();
                    return;
                }
                
                // Check if we're on a drag handle
                const isHandle = target?.closest?.('[data-drag-handle="true"]');
                if (!isHandle) {
                    dragCancelledRef.current = true;
                    cancel?.();
                    return;
                }
            }

            // If this gesture was cancelled, ignore all subsequent events
            if (dragCancelledRef.current) {
                if (!active) {
                    dragCancelledRef.current = false;
                    dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                }
                return;
            }

            // If gesture ended and we're not dragging, just clean up
            if (!active && !isDraggingRef.current) {
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                return;
            }

            // Check if we should activate drag based on movement threshold
            let justActivated = false;
            if (!isDraggingRef.current) {
                if (!active || Math.abs(my) < SIDE_DRAG_ACTIVATION_THRESHOLD) {
                    if (!active) {
                        isDraggingRef.current = false;
                        orderChangedRef.current = false;
                        dragCancelledRef.current = false;
                        dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
                    }
                    return;
                }
                isDraggingRef.current = true;
                justActivated = true;
            }

            // Now we're in active drag mode
            const currentIndex = order.current.indexOf(itemKey);
            if (currentIndex === -1) return;

            const { map, total } = buildOffsets(order.current, getHeight, itemGap);
            const currentOffset = map.get(itemKey) ?? 0;
            const currentHeight = getHeight(itemKey);
            const maxOffset = Math.max(total - currentHeight, 0);

            let stateForItem = dragStateRef.current;
            if (justActivated || stateForItem.key !== itemKey) {
                const node = nodesRef.current.get(itemKey);
                const pointerY = getPointerClientY(event);
                let anchor = currentHeight > 0 ? Math.min(currentHeight / 2, currentHeight) : 0;
                if (node && typeof pointerY === 'number') {
                    const rect = node.getBoundingClientRect();
                    const measuredHeight = rect.height || currentHeight || 0;
                    anchor = clamp(pointerY - rect.top, 0, measuredHeight);
                }
                stateForItem = {
                    key: itemKey,
                    baseOffset: currentOffset,
                    movementAtBase: my,
                    anchor,
                };
                dragStateRef.current = stateForItem;
            }

            if (stateForItem.key !== itemKey) {
                stateForItem = {
                    key: itemKey,
                    baseOffset: currentOffset,
                    movementAtBase: my,
                    anchor: currentHeight > 0 ? Math.min(currentHeight / 2, currentHeight) : 0,
                };
                dragStateRef.current = stateForItem;
            }

            const movementDelta = my - stateForItem.movementAtBase;
            const rawDesiredOffset = stateForItem.baseOffset + movementDelta;
            const desiredOffset = clamp(rawDesiredOffset, 0, maxOffset);
            const pointerPosition = clamp(desiredOffset + stateForItem.anchor, 0, total + currentHeight);
            const targetIndex = indexFromOffset(order.current, pointerPosition, getHeight, itemGap);

            if (targetIndex !== currentIndex) {
                const newOrder = order.current.slice();
                newOrder.splice(currentIndex, 1);
                newOrder.splice(targetIndex, 0, itemKey);
                order.current = newOrder;
                orderChangedRef.current = true;
            }

            const { map: updatedMap, total: updatedTotal } = buildOffsets(order.current, getHeight, itemGap);
            if (Math.abs(listHeightRef.current - updatedTotal) > 1) {
                listHeightRef.current = updatedTotal;
                setListHeight(updatedTotal);
            }

            const maxActiveOffset = Math.max(updatedTotal - currentHeight, 0);
            const activeOffset = clamp(desiredOffset, 0, maxActiveOffset);

            dragStateRef.current = {
                key: itemKey,
                baseOffset: activeOffset,
                movementAtBase: my,
                anchor: stateForItem.anchor,
            };
            const isActiveDrag = active && isDraggingRef.current;

            api.start((index) => {
                const key = keysRef.current[index];
                const offset = updatedMap.get(key) ?? index * (itemHeight + itemGap);
                
                if (key === itemKey) {
                    return {
                        y: isActiveDrag ? activeOffset : offset,
                        scale: isActiveDrag ? 1.015 : 1,
                        zIndex: isActiveDrag ? 12 : 0,
                        opacity: isActiveDrag ? 0.97 : 1,
                        immediate: isActiveDrag ? (prop) => prop === 'y' : false,
                        config: isActiveDrag ? SIDE_ACTIVE_CONFIG : RESTING_CONFIG,
                    };
                }
                return {
                    y: offset,
                    scale: 1,
                    zIndex: 0,
                    opacity: 1,
                    immediate: false,
                    config: RESTING_CONFIG,
                };
            });

            if (!active && isDraggingRef.current) {
                isDraggingRef.current = false;
                
                // Snap all items to their final grid positions
                const { map: finalMap } = buildOffsets(order.current, getHeight, itemGap);
                api.start((index) => {
                    const key = keysRef.current[index];
                    const offset = finalMap.get(key) ?? index * (itemHeight + itemGap);
                    return {
                        y: offset,
                        scale: 1,
                        zIndex: 0,
                        opacity: 1,
                        immediate: false,
                        config: RESTING_CONFIG,
                    };
                });
                
                if (orderChangedRef.current) {
                    const reorderedItems = order.current
                        .map((key) => {
                            const sourceIndex = keysRef.current.indexOf(key);
                            return itemsRef.current[sourceIndex];
                        })
                        .filter((item) => item !== undefined);
                    onReorder?.(reorderedItems);
                    orderChangedRef.current = false;
                }
                dragCancelledRef.current = false;
                dragStateRef.current = { key: null, baseOffset: 0, movementAtBase: 0, anchor: 0 };
            }
        },
        {
            filterTaps: true,
            pointer: { touch: true },
            preventScroll: true,
            axis: 'y',
        }
    );

    const needsScroll = typeof maxContainerHeight === 'number' && maxContainerHeight > 0 && listHeight > maxContainerHeight;
    const containerHeight = needsScroll ? maxContainerHeight : listHeight;

    return (
        <div
            style={{
                position: 'relative',
                height: containerHeight,
                overflowY: needsScroll ? 'auto' : 'visible',
                paddingRight: needsScroll ? 6 : 0,
            }}
        >
            <div style={{ position: 'relative', height: listHeight }}>
                {springs.map(({ y, scale, zIndex, opacity }, index) => {
                    const item = items[index];
                    const key = keysRef.current[index];
                    const isDragging = (zIndex.get ? zIndex.get() : zIndex) > 0;
                    const rawHandleProps = bind(key);
                    const handleProps = {
                        ...rawHandleProps,
                        'data-drag-handle': 'true',
                        'aria-grabbed': isDragging ? 'true' : 'false',
                    };
                    const dragMeta = {
                        handleProps,
                        handleStyle: { cursor: isDragging ? 'grabbing' : 'grab' },
                        isDragging,
                    };

                    return (
                        <animated.div
                            key={key}
                            data-drag-container
                            style={{
                                position: 'absolute',
                                width: '100%',
                                y,
                                scale,
                                zIndex,
                                opacity,
                                touchAction: isDragging ? 'none' : 'auto',
                                willChange: isDragging ? 'transform' : 'auto',
                            }}
                        >
                            <div ref={registerNode(key)} style={{ width: '100%' }}>
                                {renderItem(item, isDragging, dragMeta)}
                            </div>
                        </animated.div>
                    );
                })}
            </div>
            {footer ? (
                <div style={{ paddingTop: itemGap > 0 ? itemGap : 8 }}>
                    {footer}
                </div>
            ) : null}
        </div>
    );
};


/**
 * DraggableHandle - A visual grab handle component
 * 
 * Usage:
 * <DraggableHandle isDragging={isDragging} />
 */
export const DraggableHandle = ({ isDragging }) => {
    const spring = useSpring({
        to: { scale: isDragging ? 1.2 : 1 },
        config: config.wobbly,
    });

    return (
        <animated.div
            aria-hidden="true"
            style={{
                ...spring,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                fontSize: '16px',
                opacity: isDragging ? 1 : 0.6,
                transition: 'opacity 0.2s',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
            }}
        >
            ⋮⋮
        </animated.div>
    );
};

/**
 * SimpleDraggable - For when you just want to make a single element draggable
 * 
 * Usage:
 * <SimpleDraggable onDragEnd={(x, y) => console.log('Dropped at', x, y)}>
 *   <div>Drag me!</div>
 * </SimpleDraggable>
 */
export const SimpleDraggable = ({ children, onDragEnd, bounds }) => {
    const [spring, api] = useSpring(() => ({
        x: 0,
        y: 0,
        scale: 1,
        config: config.wobbly,
    }));

    const bind = useDrag(
        ({ offset: [x, y], active, movement: [mx, my] }) => {
            // Apply bounds if specified
            let finalX = x;
            let finalY = y;
            
            if (bounds) {
                finalX = clamp(x, bounds.left || -Infinity, bounds.right || Infinity);
                finalY = clamp(y, bounds.top || -Infinity, bounds.bottom || Infinity);
            }

            api.start({
                x: active ? mx : finalX,
                y: active ? my : finalY,
                scale: active ? 1.1 : 1,
                immediate: (key) => active && (key === 'x' || key === 'y'),
            });

            if (!active && onDragEnd) {
                onDragEnd(finalX, finalY);
            }
        },
        {
            from: () => [spring.x.get(), spring.y.get()],
        }
    );

    return (
        <animated.div
            {...bind()}
            style={{
                ...spring,
                touchAction: 'none',
                cursor: spring.scale.to((s) => (s > 1 ? 'grabbing' : 'grab')),
                willChange: 'transform',
            }}
        >
            {children}
        </animated.div>
    );
};
