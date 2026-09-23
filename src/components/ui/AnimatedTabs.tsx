import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';

export interface AnimatedTab<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface AnimatedTabsProps<T extends string> {
  tabs: readonly AnimatedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  idPrefix?: string;
}

export function AnimatedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className = '',
  idPrefix,
}: AnimatedTabsProps<T>) {
  const generatedId = useId().replace(/:/g, '');
  const instanceId = idPrefix ?? `animated-tabs-${generatedId}`;
  const [hoveredTab, setHoveredTab] = useState<T | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;

    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentIndex = enabledTabs.findIndex((tab) => tab.id === value);
    if (currentIndex < 0 || enabledTabs.length === 0) return;

    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabledTabs.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % enabledTabs.length
          : (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    const nextTab = enabledTabs[nextIndex];
    onChange(nextTab.id);
    window.setTimeout(() => {
      document.getElementById(`${instanceId}-${nextTab.id}`)?.focus();
    }, 0);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={`flex overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        const isHovered = tab.id === hoveredTab;
        const showBackground = isActive || isHovered;

        return (
          <button
            key={tab.id}
            id={`${instanceId}-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${instanceId}-${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005f5f] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isActive
                ? 'border-[#005f5f] text-[#005f5f] dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {showBackground && (
              <motion.span
                layoutId={`${instanceId}-${tab.id}-background`}
                className="absolute inset-1 z-0 bg-[#005f5f]/10"
                style={{ borderRadius: 8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {isActive && (
              <motion.span
                layoutId={`${instanceId}-active-indicator`}
                className="absolute inset-x-0 -bottom-px z-20 h-0.5 bg-[#005f5f] dark:bg-teal-400"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                aria-hidden="true"
              />
            )}
            {isHovered && (
              <motion.span
                layoutId={`${instanceId}-hover-indicator`}
                className="absolute inset-x-0 -bottom-px z-20 h-0.5 bg-[#005f5f] dark:bg-teal-400"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
