import React from 'react';

interface Option<T> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T> {
  label?: string;
  hasIndicator?: boolean;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number | boolean>({
  label,
  hasIndicator,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="py-2.5">
      {label && (
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-neutral-200">
          {hasIndicator && <span className="w-2 h-2 rounded-full bg-[#2196f3] shrink-0" />}
          <span>{label}</span>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className="grid p-1 bg-[#1c1d21] rounded-lg border border-[#2e3038] gap-1"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={`py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-md transition-all duration-150 text-center truncate ${
                isActive
                  ? 'bg-[#383b44] text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#25272e]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
