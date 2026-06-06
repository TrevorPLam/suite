import type { CSSProperties } from 'react';

type SkeletonProps = {
  height?: CSSProperties['height'];
  width?: CSSProperties['width'];
  variant?: 'text' | 'rectangular' | 'circular';
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({
  height = '1em',
  width = '100%',
  variant = 'text',
  className = '',
  style = {},
}: SkeletonProps) {
  const baseStyle: CSSProperties = {
    height,
    width,
    background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: variant === 'circular' ? '50%' : variant === 'rectangular' ? '8px' : '4px',
    ...style,
  };

  return (
    <div
      className={className}
      style={baseStyle}
      role="status"
      aria-label="Loading"
    >
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
