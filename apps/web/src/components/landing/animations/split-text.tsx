'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

interface SplitTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  staggerChildren?: number;
  delay?: number;
}

export function SplitText({
  text,
  className = '',
  as = 'span',
  staggerChildren = 0.04,
  delay = 0,
}: SplitTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Tag = as;
  const words = text.split(' ');

  const container: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren, delayChildren: delay },
    },
  };

  const child: Variants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring' as const, damping: 20, stiffness: 100 },
    },
  };

  return (
    <Tag className={className}>
      <motion.span
        ref={ref}
        variants={container}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="inline"
        aria-label={text}
      >
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            variants={child}
            className="inline-block mr-[0.3em]"
            style={{ willChange: 'transform, opacity, filter' }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
