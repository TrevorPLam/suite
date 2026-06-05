import { motion, AnimatePresence, LazyMotion, domAnimation } from 'motion/react';

/**
 * Common motion patterns for the AI Command Center
 * Use these patterns consistently across all components
 */

// Reduced motion check hook
export const useReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Base transition configurations
export const transitions = {
  // Primary interactions (navigation, state changes, user feedback)
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },

  // Secondary elements (tooltips, hover details)
  fade: {
    duration: 0.15,
    ease: 'easeOut' as const,
  },

  // Instant changes for reduced motion
  instant: {
    duration: 0,
  },
};

// Container variants for staggered animations
export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

// Item variants for staggered animations
export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

// Grid variants for bento layouts
export const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// Grid item variants with hover lift
export const gridItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  hover: { y: -4 },
};

// Modal variants
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Drawer/slide-in variants
export const drawerVariants = {
  hidden: { x: '100%' },
  show: {
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.15 },
  },
};

// Button interaction patterns
export const buttonVariants = {
  hover: { scale: 1.02, y: -1 },
  tap: { scale: 0.98 },
  focus: { y: -1 },
};

// LED border glow effect
export const ledBorderVariants = {
  initial: { boxShadow: '0 0 0 0 rgba(0, 102, 255, 0.7)' },
  focus: {
    boxShadow: '0 0 0 2px rgba(0, 102, 255, 0.7), 0 0 20px rgba(0, 102, 255, 0.3)',
    transition: { duration: 0.1 },
  },
  active: {
    boxShadow: '0 0 0 2px rgba(0, 102, 255, 0.7), 0 0 30px rgba(0, 102, 255, 0.5)',
    transition: { duration: 0.1 },
  },
};

// Pulse animation for status indicators
export const pulseVariants = {
  initial: { scale: 1, opacity: 1 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Loading skeleton animation
export const skeletonVariants = {
  initial: { opacity: 0.7 },
  animate: {
    opacity: [0.7, 0.3, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Staggered list component
export const StaggeredList: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div className={className} variants={containerVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
};

// Staggered list item component
export const StaggeredListItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
};

// Animated button component
export const AnimatedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}> = ({ children, onClick, disabled, className, variant = 'primary' }) => {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? transitions.instant : transitions.spring;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={className}
      variants={buttonVariants}
      whileHover={!disabled ? 'hover' : undefined}
      whileTap={!disabled ? 'tap' : undefined}
      whileFocus={!disabled ? 'focus' : undefined}
      transition={transition}
    >
      {children}
    </motion.button>
  );
};

// Modal wrapper component
export const AnimatedModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ isOpen, onClose, children, className }) => {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? transitions.instant : transitions.spring;

  return (
    <AnimatePresence mode="popLayout">
      {isOpen && (
        <motion.div
          className={className}
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          transition={transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Grid container for bento layouts
export const AnimatedGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={shouldReduceMotion ? undefined : gridVariants}
      initial={shouldReduceMotion ? undefined : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'show'}
    >
      {children}
    </motion.div>
  );
};

// Grid item for bento layouts
export const AnimatedGridItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ children, className, size = 'medium' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={shouldReduceMotion ? undefined : gridItemVariants}
      whileHover={shouldReduceMotion ? undefined : 'hover'}
    >
      {children}
    </motion.div>
  );
};

// Status indicator with pulse
export const StatusIndicator: React.FC<{
  status: 'online' | 'offline' | 'busy';
  className?: string;
}> = ({ status, className }) => {
  const shouldReduceMotion = useReducedMotion();
  const isPulsing = status === 'online' && !shouldReduceMotion;

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-red-500',
  };

  return (
    <motion.div
      className={`w-2 h-2 rounded-full ${statusColors[status]} ${className}`}
      variants={isPulsing ? pulseVariants : undefined}
      animate={isPulsing ? 'animate' : undefined}
    />
  );
};

// Loading skeleton component
export const LoadingSkeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className, width = 'w-full', height = 'h-4' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`bg-gray-700 rounded ${width} ${height} ${className}`}
      variants={shouldReduceMotion ? undefined : skeletonVariants}
      animate={shouldReduceMotion ? undefined : 'animate'}
    />
  );
};

// Lazy motion wrapper for performance
export const LazyMotionWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
};
