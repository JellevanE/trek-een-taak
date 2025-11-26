import PropTypes from 'prop-types';
import React from 'react';
import { Reorder } from 'framer-motion';
import { DEFAULT_THEME_ID } from '../../../theme';
import { useQuestMotionTokens } from '../hooks/useQuestMotionTokens.js';
import { getItemKey, reconcileOrder, useNeonDragHandle } from './listUtils.js';

const QuestListRow = ({ item, renderItem, motionTokens, onDragStart, onDragEnd }) => {
    const { controls, dragMeta, setIsDragging } = useNeonDragHandle();

    return (
        <Reorder.Item
            as="div"
            value={item}
            dragControls={controls}
            dragListener={false}
            dragElastic={0.12}
            dragMomentum={false}
            dragTransition={{ power: 0.1, timeConstant: 200, bounceStiffness: 400, bounceDamping: 40 }}
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
                scale: motionTokens.drag.scale,
                boxShadow: motionTokens.drag.shadow,
                filter: motionTokens.drag.glow === 'none'
                    ? undefined
                    : `drop-shadow(${motionTokens.drag.glow})`
            }}
            whileTap={{ scale: motionTokens.drag.scale }}
            style={{
                listStyle: 'none'
            }}
        >
            <div style={{ width: '100%' }}>
                {renderItem(item, dragMeta.isDragging, dragMeta)}
            </div>
        </Reorder.Item>
    );
};

QuestListRow.propTypes = {
    item: PropTypes.any.isRequired,
    motionTokens: PropTypes.shape({
        durations: PropTypes.object,
        easing: PropTypes.object,
        drag: PropTypes.object
    }).isRequired,
    renderItem: PropTypes.func.isRequired
};

export const FramerQuestList = ({
    items,
    onReorder,
    onDragEnd,
    itemGap,
    itemHeight,
    renderItem,
    refreshToken,
    themeName
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const containerRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dimensions, setDimensions] = React.useState(null);



    const [order, setOrder] = React.useState(() => (Array.isArray(items) ? items : []));
    const latestOrderRef = React.useRef(order);

    React.useEffect(() => {
        if (isDragging) return;
        setOrder((prev) => {
            const next = reconcileOrder(items, prev);
            latestOrderRef.current = next;
            return next;
        });
    }, [items, refreshToken, isDragging]);

    const handleDragStart = React.useCallback(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
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

    if (!order || order.length === 0) {
        return null;
    }

    return (
        <Reorder.Group
            ref={containerRef}
            key={`quest-list-${refreshToken}`}
            axis="y"
            values={order}
            onReorder={handleReorder}
            layoutScroll
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: itemGap,
                position: 'relative',
                minHeight: itemHeight > 0 ? itemHeight : undefined,
                width: isDragging && dimensions ? dimensions.width : '100%',
                // We don't lock height to allow reordering to change list height naturally,
                // but locking width prevents column jumping.
            }}
        >
            {order.map((item, index) => (
                <QuestListRow
                    key={getItemKey(item, index)}
                    item={item}
                    renderItem={renderItem}
                    motionTokens={motionTokens}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                />
            ))}
        </Reorder.Group>
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
    themeName: PropTypes.string
};

FramerQuestList.defaultProps = {
    onReorder: undefined,
    itemGap: 0,
    itemHeight: 0,
    refreshToken: 0,
    themeName: DEFAULT_THEME_ID
};

export default FramerQuestList;
