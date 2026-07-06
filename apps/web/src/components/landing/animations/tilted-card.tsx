'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltedCardProps {
  children: React.ReactNode;
  maxTilt?: number;
  glareEnabled?: boolean;
  className?: string;
}

export function TiltedCard({
  children,
  maxTilt = 10,
  glareEnabled = true,
  className = '',
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), { damping: 30, stiffness: 200 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), { damping: 30, stiffness: 200 });

  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [30, -30]), { damping: 30, stiffness: 200 });
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [-30, 30]), { damping: 30, stiffness: 200 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
    setIsHovering(true);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setIsHovering(false);
  }

  return (
    <>
      <style>{`
        @keyframes tilted-card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @media (max-width: 768px) and (prefers-reduced-motion: no-preference) {
          .tilted-card-float-target {
            animation: tilted-card-float 4s ease-in-out infinite;
          }
        }
      `}</style>
      <div
        ref={ref}
        className={`${className} tilted-card-float-target`}
        style={{ perspective: '1200px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {children}
          {glareEnabled && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-2xl z-10"
              style={{
                x: glareX,
                y: glareY,
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 60%)',
                opacity: isHovering ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
        </motion.div>
      </div>
    </>
  );
}
