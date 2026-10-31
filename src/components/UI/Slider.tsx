import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  hasIndicator?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hasIndicator,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
          {hasIndicator && <span className="w-2 h-2 rounded-full bg-[#2196f3] shrink-0" />}
          <span>{label}</span>
        </div>
        <span className="text-sm text-neutral-400 font-mono">
          {value}{unit}
        </span>
      </div>
      <div className="relative w-full flex items-center h-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer z-10"
        />
        <div className="w-full h-1.5 bg-[#383b44] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2196f3] transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute w-5 h-5 bg-white rounded-full shadow-md pointer-events-none transform -translate-x-1/2 transition-transform"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
