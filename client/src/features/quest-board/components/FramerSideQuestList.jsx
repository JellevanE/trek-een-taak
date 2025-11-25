import PropTypes from 'prop-types';
import React from 'react';
import { Reorder } from 'framer-motion';
import { DEFAULT_THEME_ID } from '../../../theme';
import { useQuestMotionTokens } from '../hooks/useQuestMotionTokens.js';
import { getItemKey, reconcileOrder, useNeonDragHandle } from './listUtils.js';

const SideQuestRow = ({ item, renderItem, motionTokens, onDragStart, onDragEnd }) => {
    const { controls, dragMeta, setIsDragging } = useNeonDragHandle();
    const dragScale = Math.max(1, motionTokens.drag.scale - 0.01);

    return (
        <Reorder.Item
            as="div"
            value={item}
            dragControls={controls}
            dragListener={false}
            dragElastic={0.1}
            dragMomentum={false}
            dragTransition={{ power: 0.18, timeConstant: 120, bounceStiffness: 520, bounceDamping: 34 }}
            layout
            onDragStart={() => {
                setIsDragging(true);
                onDragStart?.();
            }}
            onDragEnd={() => {
                setIsDragging(false);
                onDragEnd?.();
            }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1
            }}
            whileDrag={{
                scale: dragScale,
                boxShadow: motionTokens.drag.shadow,
                filter: motionTokens.drag.glow === 'none'
                    ? undefined
                    : `drop-shadow(${motionTokens.drag.glow})`
            }}
            style={{ listStyle: 'none' }}
        >
            <div style={{ width: '100%' }}>
                {renderItem(item, dragMeta.isDragging, dragMeta)}
            </div>
        </Reorder.Item>
    );
};

SideQuestRow.propTypes = {
    item: PropTypes.any.isRequired,
    motionTokens: PropTypes.shape({
        durations: PropTypes.object,
        easing: PropTypes.object,
        drag: PropTypes.object
    }).isRequired,
    renderItem: PropTypes.func.isRequired
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
    themeName
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const [order, setOrder] = React.useState(() => (Array.isArray(sideQuests) ? sideQuests : []));
    const latestOrderRef = React.useRef(order);
    const containerRef = React.useRef(null);
    const reorderGroupRef = React.useRef(null);
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

    const handleDragStart = React.useCallback(() => {
        if (reorderGroupRef.current) {
            const { width, height } = reorderGroupRef.current.getBoundingClientRect();
            setDimensions({ width, height });
        }
        setIsDragging(true);
    }, []);

    const handleDragEnd = React.useCallback(() => {
        setIsDragging(false);
        setDimensions(null);
        if (onReorder && latestOrderRef.current) {
            onReorder(latestOrderRef.current);
        }
        if (onDragEnd) {
            onDragEnd();
        }
    }, [onReorder, onDragEnd]);

    const handleReorder = React.useCallback((next) => {
        setOrder(next);
        latestOrderRef.current = next;
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
        paddingRight: isOverflowing ? 6 : 0
    };

    return (
        <div ref={containerRef} style={wrapperStyle}>
            <Reorder.Group
                ref={reorderGroupRef}
                key={`sidequest-list-${questId}-${refreshToken}`}
                axis="y"
                values={order}
                onReorder={handleReorder}
                layoutScroll
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: itemGap,
                    minHeight: itemHeight > 0 ? itemHeight : undefined,
                    width: isDragging && dimensions ? dimensions.width : '100%'
                }}
            >
                {order.map((item, index) => (
                    <SideQuestRow
                        key={getItemKey(item, index)}
                        item={item}
                        renderItem={renderItem}
                        motionTokens={motionTokens}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </Reorder.Group>
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
    themeName: PropTypes.string
};

FramerSideQuestList.defaultProps = {
    questId: null,
    onReorder: undefined,
    itemGap: 0,
    itemHeight: 0,
    maxContainerHeight: null,
    refreshToken: 0,
    themeName: DEFAULT_THEME_ID
};

export default FramerSideQuestList;
