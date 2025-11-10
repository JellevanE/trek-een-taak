import PropTypes from 'prop-types';
import React from 'react';
import { Reorder } from 'framer-motion';
import { useQuestMotionTokens } from '../hooks/useQuestMotionTokens.js';
import { getItemKey, reconcileOrder, useNeonDragHandle } from './listUtils.js';

const SideQuestRow = ({ item, renderItem, motionTokens }) => {
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
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            transition={{
                duration: motionTokens.durations.drag,
                ease: motionTokens.easing.drag
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
    itemGap,
    itemHeight,
    renderItem,
    maxContainerHeight,
    refreshToken,
    themeName
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const [order, setOrder] = React.useState(() => (Array.isArray(sideQuests) ? sideQuests : []));
    const containerRef = React.useRef(null);
    const [isOverflowing, setIsOverflowing] = React.useState(false);

    React.useEffect(() => {
        setOrder((prev) => reconcileOrder(sideQuests, prev));
    }, [sideQuests, refreshToken, questId]);

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

    const handleReorder = React.useCallback((next) => {
        setOrder(next);
        if (typeof onReorder === 'function') {
            onReorder(next);
        }
    }, [onReorder]);

    const wrapperStyle = {
        maxHeight: typeof maxContainerHeight === 'number' && maxContainerHeight > 0
            ? maxContainerHeight
            : undefined,
        overflowY: typeof maxContainerHeight === 'number' && maxContainerHeight > 0
            ? 'auto'
            : 'visible',
        paddingRight: isOverflowing ? 6 : 0
    };

    return (
        <div ref={containerRef} style={wrapperStyle}>
            <Reorder.Group
                key={`sidequest-list-${questId}-${refreshToken}`}
                axis="y"
                values={order}
                onReorder={handleReorder}
                layoutScroll
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: itemGap,
                    minHeight: itemHeight > 0 ? itemHeight : undefined
                }}
            >
                {order.map((item, index) => (
                    <SideQuestRow
                        key={getItemKey(item, index)}
                        item={item}
                        renderItem={renderItem}
                        motionTokens={motionTokens}
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
    themeName: 'dark'
};

export default FramerSideQuestList;
