'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface TextTypeProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
  loop?: boolean;
}

export function TextType({
  texts,
  typingSpeed = 60,
  deletingSpeed = 30,
  pauseDuration = 2000,
  className = '',
  loop = true,
}: TextTypeProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isComplete = !isDeleting && displayText.length === texts[currentIndex]?.length && !loop;

  const tick = useCallback(() => {
    const currentText = texts[currentIndex];

    if (prefersReducedMotion) {
      setDisplayText(currentText);
      return;
    }

    if (!isDeleting) {
      if (displayText.length < currentText.length) {
        setDisplayText(currentText.slice(0, displayText.length + 1));
        timeoutRef.current = setTimeout(tick, typingSpeed);
      } else {
        if (!loop && currentIndex === texts.length - 1) return;
        timeoutRef.current = setTimeout(() => setIsDeleting(true), pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1));
        timeoutRef.current = setTimeout(tick, deletingSpeed);
      } else {
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % texts.length);
      }
    }
  }, [displayText, currentIndex, isDeleting, texts, typingSpeed, deletingSpeed, pauseDuration, loop, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(texts[0] || '');
      return;
    }
    timeoutRef.current = setTimeout(tick, 500);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [tick, prefersReducedMotion, texts]);

  return (
    <span className={className} aria-live="polite">
      {displayText}
      {!isComplete && (
        <span
          className="inline-block w-[3px] h-[1em] bg-current ml-[2px] align-middle"
          style={{ animation: 'blink 1s step-end infinite' }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
