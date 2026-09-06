import React, { ReactNode, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'right' | 'bottom' | 'left'; // Currently forces right for simplicity in fixed pos
}

export function Tooltip({ children, content, position = 'right' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8, // 8px offset to the right
      });
      setIsVisible(true);
    }
  };

  return (
    <div 
      ref={triggerRef}
      className={`relative ${typeof children === 'string' ? 'inline-flex' : 'flex w-full h-full'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <div 
          className="fixed bg-slate-800 p-2 rounded-md z-[9999] shadow-lg pointer-events-none flex items-center"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: 'translateY(-50%)'
          }}
        >
          <span className="text-slate-200 text-xs font-semibold whitespace-nowrap">{content}</span>
          <div className="bg-slate-800 rotate-45 w-2 h-2 absolute top-1/2 -translate-y-1/2 -left-1" />
        </div>,
        document.body
      )}
    </div>
  );
}
