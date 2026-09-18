import React, { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';

interface TruncatedInfoTooltipProps {
  text: string;
  title: string;
  icon: LucideIcon;
  className?: string;
}

type TooltipPosition = {
  left: number;
  top: number;
  below: boolean;
};

export function TruncatedInfoTooltip({ text, title, icon: Icon, className = '' }: TruncatedInfoTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [isTruncated, setIsTruncated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ left: 0, top: 0, below: false });

  const measure = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return;
    const truncated = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
    setIsTruncated(truncated);
    if (!truncated) setIsVisible(false);
  }, []);

  const updatePosition = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const maxTooltipWidth = Math.min(320, Math.max(0, window.innerWidth - 32));
    const halfTooltipWidth = maxTooltipWidth / 2;
    const center = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(center, halfTooltipWidth + 16),
      window.innerWidth - halfTooltipWidth - 16,
    );
    const below = rect.top < 128;
    setPosition({ left, top: below ? rect.bottom + 8 : rect.top - 8, below });
  }, []);

  useLayoutEffect(() => {
    measure();
    const element = triggerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, text]);

  useLayoutEffect(() => {
    if (!isVisible || !isTruncated) return;
    updatePosition();
    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isVisible, isTruncated, updatePosition]);

  const showTooltip = () => {
    if (!isTruncated) return;
    updatePosition();
    setIsVisible(true);
  };

  return (
    <span
      ref={triggerRef}
      className={`block min-w-0 truncate ${className}`}
      tabIndex={isTruncated ? 0 : undefined}
      aria-label={isTruncated ? `${title}: ${text}` : undefined}
      aria-describedby={isVisible ? tooltipId : undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={showTooltip}
      onBlur={() => setIsVisible(false)}
    >
      {text}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[9999] flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] items-start gap-2 overflow-y-auto rounded-md bg-slate-800 px-3 py-2 text-left text-xs text-slate-100 shadow-lg"
          style={{
            left: position.left,
            top: position.top,
            transform: position.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
          }}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-bold text-white">{title}</span>
            <span className="block whitespace-normal break-words">{text}</span>
          </span>
        </div>,
        document.body,
      )}
    </span>
  );
}
