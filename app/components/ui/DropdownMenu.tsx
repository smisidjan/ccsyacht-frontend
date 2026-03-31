"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  buttonClassName?: string;
  menuClassName?: string;
}

export default function DropdownMenu({
  items,
  buttonClassName = "",
  menuClassName = "",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calculate menu position
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const estimatedMenuHeight = items.length * 48 + 8; // ~48px per item + padding

      // Open upwards if not enough space below
      const shouldOpenUpwards = spaceBelow < estimatedMenuHeight && buttonRect.top > estimatedMenuHeight;

      // Calculate fixed position
      const top = shouldOpenUpwards
        ? buttonRect.top - estimatedMenuHeight
        : buttonRect.bottom + 8;
      const right = window.innerWidth - buttonRect.right;

      setMenuPosition({ top, right });
    }
  }, [isOpen, items.length]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${buttonClassName}`}
        aria-label="Open menu"
      >
        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div
          className={`fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 ${menuClassName}`}
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const variantClasses =
              item.variant === "danger"
                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${variantClasses} ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
