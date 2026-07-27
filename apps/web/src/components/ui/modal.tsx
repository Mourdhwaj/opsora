"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, HTMLAttributes } from "react";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  className,
  ...props
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-white rounded-xl border border-[#EAEAEA] shadow-modal w-full animate-scale-in",
          sizes[size],
          className
        )}
        {...props}
      >
        {(title || description) && (
          <div className="px-6 py-4 border-b border-[#EAEAEA]">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h2 className="text-lg font-bold text-[#111111]">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-[#787774] mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-[#A0A0A0] hover:text-[#111111] hover:bg-[#F7F6F3] transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {}

function ModalContent({ className, children, ...props }: ModalContentProps) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

function ModalFooter({ className, children, ...props }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Modal, ModalContent, ModalFooter };
