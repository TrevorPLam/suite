import React from 'react';
import { motion } from 'motion/react';

/**
 * ComponentName - Brief description of component purpose
 *
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value"
 *   prop2={true}
 * />
 * ```
 */
export interface ComponentNameProps {
  /** Description of prop1 */
  prop1: string;
  /** Description of prop2 */
  prop2: boolean;
  /** Optional callback function */
  onAction?: () => void;
  /** Children content */
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  onAction,
  children,
}) => {
  // Component logic here

  return (
    <motion.div
      className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileHover={{ y: -1 }}
    >
      {/* Component content */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Component Title</h2>

        <div className="text-gray-300">{prop1}</div>

        {prop2 && <div className="text-blue-400">Conditional content</div>}

        {children && <div className="mt-4">{children}</div>}

        {onAction && (
          <motion.button
            onClick={onAction}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-150 ease-out"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Action Button
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// For components that need ref forwarding
export const ComponentWithRef = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ prop1, prop2, onAction, children }, ref) => {
    return (
      <div
        ref={ref}
        className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6"
        role="region"
        aria-label="Component description"
      >
        {/* Component content */}
      </div>
    );
  }
);

ComponentWithRef.displayName = 'ComponentWithRef';
