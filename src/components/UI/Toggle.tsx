import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  hasIndicator?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description, hasIndicator }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={checked}
      aria-label={label}
      onKeyDown={handleKeyDown}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between py-2 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2196f3] rounded-lg px-1 transition-shadow"
    >
      <div className="flex flex-col pr-4">
        {label && (
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
            {hasIndicator && <span className="w-2 h-2 rounded-full bg-[#2196f3] shrink-0" />}
            <span>{label}</span>
          </div>
        )}
        {description && (
          <span className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{description}</span>
        )}
      </div>
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? 'bg-[#2196f3]' : 'bg-[#383b44]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
};
