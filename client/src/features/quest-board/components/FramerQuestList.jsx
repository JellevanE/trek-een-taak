import PropTypes from 'prop-types';
import React from 'react';
import { Reorder } from 'framer-motion';
import { useQuestMotionTokens } from '../hooks/useQuestMotionTokens.js';
import { getItemKey, reconcileOrder, useNeonDragHandle } from './listUtils.js';

const QuestListRow = ({ item, renderItem, motionTokens }) => {
    const { controls, dragMeta, setIsDragging } = useNeonDragHandle();

    return (
        <Reorder.Item
            as="div"
            value={item}
            dragControls={controls}
            dragListener={false}
            dragElastic={0.12}
            dragMomentum={false}
            dragTransition={{ power: 0.2, timeConstant: 120, bounceStiffness: 520, bounceDamping: 32 }}
            layout
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            transition={{
                duration: motionTokens.durations.drag,
                ease: motionTokens.easing.drag
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
    itemGap,
    itemHeight,
    renderItem,
    refreshToken,
    themeName
}) => {
    const motionTokens = useQuestMotionTokens(themeName);
    const [order, setOrder] = React.useState(() => (Array.isArray(items) ? items : []));

    React.useEffect(() => {
        setOrder((prev) => reconcileOrder(items, prev));
    }, [items, refreshToken]);

    const handleReorder = React.useCallback((next) => {
        setOrder(next);
        if (typeof onReorder === 'function') {
            onReorder(next);
        }
    }, [onReorder]);

    if (!order || order.length === 0) {
        return null;
    }

    return (
        <Reorder.Group
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
                minHeight: itemHeight > 0 ? itemHeight : undefined
            }}
        >
            {order.map((item, index) => (
                <QuestListRow
                    key={getItemKey(item, index)}
                    item={item}
                    renderItem={renderItem}
                    motionTokens={motionTokens}
                />
            ))}
        </Reorder.Group>
    );
};

FramerQuestList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.any).isRequired,
    onReorder: PropTypes.func,
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
    themeName: 'dark'
};

export default FramerQuestList;
