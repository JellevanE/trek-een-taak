import { useSprings, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

/**
 * AnimatedList - List with stagger animations and drag reordering
 * 
 * This shows a more advanced pattern for lists with spring-based animations.
 * You can adapt this for your quest list.
 * 
 * Features:
 * - Staggered entrance animations
 * - Spring-based reordering
 * - Smooth transitions
 */

const fn = (order, active = false, originalIndex = 0, curIndex = 0, y = 0) => (index) => {
    return active && index === originalIndex
        ? {
              y: curIndex * 100 + y,
              scale: 1.05,
              zIndex: 1,
              shadow: 15,
              immediate: (key) => key === 'y' || key === 'zIndex',
          }
        : {
              y: order.indexOf(index) * 100,
              scale: 1,
              zIndex: 0,
              shadow: 1,
              immediate: false,
          };
};

export const AnimatedList = ({ items, renderItem }) => {
    const order = items.map((_, index) => index);
    
    const [springs, api] = useSprings(items.length, fn(order));

    const bind = useDrag(({ args: [originalIndex], active, movement: [, y] }) => {
        const curIndex = order.indexOf(originalIndex);
        const curRow = Math.round((curIndex * 100 + y) / 100);
        const newOrder = [...order];
        
        if (curIndex !== curRow) {
            newOrder.splice(curIndex, 1);
            newOrder.splice(curRow, 0, originalIndex);
        }
        
        api.start(fn(newOrder, active, originalIndex, curIndex, y));
    });

    return (
        <div style={{ position: 'relative', height: items.length * 100 }}>
            {springs.map(({ y, scale, shadow, zIndex }, i) => (
                <animated.div
                    {...bind(i)}
                    key={i}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '90px',
                        y,
                        scale,
                        zIndex,
                        boxShadow: shadow.to(
                            (s) => `rgba(0, 0, 0, 0.15) 0px ${s}px ${2 * s}px 0px`
                        ),
                        touchAction: 'none',
                        cursor: 'grab',
                    }}
                >
                    {renderItem(items[i], i)}
                </animated.div>
            ))}
        </div>
    );
};

/**
 * StaggeredList - Simple staggered entrance for lists
 * 
 * Perfect for when quests first load or when filtering changes.
 * Each item appears with a slight delay creating a wave effect.
 */
export const StaggeredList = ({ items, renderItem, stagger = 50 }) => {
    const springs = useSprings(
        items.length,
        items.map((_, i) => ({
            from: { 
                opacity: 0, 
                transform: 'translateY(20px) scale(0.95)',
            },
            to: { 
                opacity: 1, 
                transform: 'translateY(0px) scale(1)',
            },
            delay: i * stagger,
            config: config.gentle,
        }))
    );

    return (
        <>
            {springs.map((spring, i) => (
                <animated.div key={items[i].id || i} style={spring}>
                    {renderItem(items[i], i)}
                </animated.div>
            ))}
        </>
    );
};

/**
 * Example: How to use in your App.js
 * 
 * Replace your quest list rendering with:
 * 
 * <StaggeredList 
 *   items={quests}
 *   renderItem={(quest) => (
 *     <div className="quest">
 *       {your existing quest card JSX}
 *     </div>
 *   )}
 * />
 */
