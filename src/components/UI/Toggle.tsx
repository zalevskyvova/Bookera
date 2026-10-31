import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hasIndicator?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, hasIndicator }) => {
  return (
    <div
      className="flex items-center justify-between py-2 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      {label && (
        <div className="flex items-center gap-2 pr-4 text-sm font-medium text-neutral-200">
          {hasIndicator && <span className="w-2 h-2 rounded-full bg-[#2196f3] shrink-0" />}
          <span>{label}</span>
        </div>
      )}
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
