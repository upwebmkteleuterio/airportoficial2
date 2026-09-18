"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, User, UserPlus } from "lucide-react";
import { type ComponentType, useEffect, useId, useRef, useState } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;

export const SPRING_SWAP = {
  type: "spring",
  stiffness: 460,
  damping: 30,
  mass: 0.55,
} as const;

export const SPRING_PANEL = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 0.5,
} as const;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const;

export const SPRING_MOUSE = {
  stiffness: 200,
  damping: 15,
  mass: 0.3,
} as const;

const SPRING_FOLDER = {
  type: "spring",
  stiffness: 320,
  damping: 24,
  mass: 0.9,
} as const;

export type MenuItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const ITEMS: MenuItem[] = [
  { label: "Adicionar aluno existente", icon: User },
  { label: "Cadastrar novo aluno", icon: UserPlus },
];

export interface CreateMenuProps {
  items?: MenuItem[];
  onSelect?: (label: string) => void;
  className?: string;
  label?: string;
  triggerLabel?: string;
  anchor?: "left" | "right";
}

export function CreateMenu({
  items = ITEMS,
  onSelect,
  className,
  label = "Quando clicar em adicionar aluno",
  triggerLabel = "Adicionar Aluno",
  anchor = "left",
}: CreateMenuProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const layoutId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };

    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    firstItemRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const morph = reduce ? { duration: 0.15 } : SPRING_FOLDER;

  return (
    <div ref={ref} className={cn("relative inline-flex z-40", className)}>
      <div className="h-10 w-[155px]" aria-hidden />

      <div className={cn(
        "pointer-events-none absolute top-1/2 z-50 grid h-[260px] w-[min(86vw,380px)] -translate-y-1/2 items-center [&>*]:pointer-events-auto",
        anchor === "right" ? "right-0 justify-items-end" : "left-0 justify-items-start"
      )}>
        <AnimatePresence initial={false} mode="popLayout">
          {open ? (
            <motion.div
              key="panel"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 18 }}
              className="w-[min(86vw,380px)] overflow-hidden border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
            >
              <motion.div
                role="menu"
                aria-label={label}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.12, duration: 0.2 }}
              >
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-5 py-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {label}
                  </span>

                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Fechar menu de cadastro"
                    className="rounded p-1 text-gray-400 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <motion.div
                  initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
                  animate={{ clipPath: "inset(0 0 0% 0)" }}
                  transition={{
                    delay: reduce ? 0 : 0.1,
                    duration: 0.4,
                    ease: EASE_OUT,
                  }}
                  className="grid grid-cols-2"
                >
                  {items.map((item, i) => (
                    <button
                      key={item.label}
                      ref={i === 0 ? firstItemRef : undefined}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onSelect?.(item.label);
                        closeMenu();
                      }}
                      className={cn(
                        "flex items-center justify-center px-4 py-8 text-gray-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white",
                        i % 2 !== 1 && "border-r border-gray-100 dark:border-slate-800",
                        i < items.length - 2 && "border-b border-gray-100 dark:border-slate-800"
                      )}
                    >
                      <motion.span
                        initial={
                          reduce
                            ? { opacity: 0 }
                            : { opacity: 0, scale: 0.85, filter: "blur(6px)" }
                        }
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        transition={{
                          delay: reduce ? 0 : 0.14 + i * 0.04,
                          type: "spring",
                          stiffness: 460,
                          damping: 30,
                        }}
                        className="flex flex-col items-center text-center gap-3"
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </motion.span>
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.button
              ref={triggerRef}
              key="trigger"
              type="button"
              layoutId={layoutId}
              transition={morph}
              style={{ borderRadius: 8 }}
              onClick={() => setOpen(true)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={triggerLabel}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="inline-flex h-[40px] w-[155px] px-4 items-center justify-center bg-slate-900 dark:bg-teal-600 hover:bg-slate-850 dark:hover:bg-teal-500 text-sm font-semibold text-white shadow-sm transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <motion.span
                layout
                className="inline-flex items-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                {triggerLabel}
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
