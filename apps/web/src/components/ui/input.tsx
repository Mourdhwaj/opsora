"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId =
      id ||
      label
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#111111]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-md border bg-white text-[#111111] text-sm placeholder:text-[#A0A0A0]",
            "focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]/30",
            "transition-colors duration-150",
            error
              ? "border-[#9F2F2D] focus:ring-[#9F2F2D]/10 focus:border-[#9F2F2D]"
              : "border-[#EAEAEA]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#9F2F2D]">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#A0A0A0]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId =
      id ||
      label
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-[#111111]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full px-3 py-2.5 rounded-md border bg-white text-[#111111] text-sm placeholder:text-[#A0A0A0]",
            "focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]/30",
            "transition-colors duration-150 min-h-[100px] resize-y",
            error
              ? "border-[#9F2F2D] focus:ring-[#9F2F2D]/10 focus:border-[#9F2F2D]"
              : "border-[#EAEAEA]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#9F2F2D]">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#A0A0A0]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[#111111]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full h-10 px-3 rounded-md border bg-white text-[#111111] text-sm",
            "focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]/30",
            "transition-colors duration-150",
            error
              ? "border-[#9F2F2D] focus:ring-[#9F2F2D]/10 focus:border-[#9F2F2D]"
              : "border-[#EAEAEA]",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[#9F2F2D]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export {
  Input,
  Textarea,
  Select,
  type InputProps,
  type TextareaProps,
  type SelectProps,
};
