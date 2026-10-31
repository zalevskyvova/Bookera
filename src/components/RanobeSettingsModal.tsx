import React from 'react';
import { X, ChevronDown, Globe } from 'lucide-react';
import { ReaderSettings, ThemePreset, THEME_PALETTES, DEFAULT_SETTINGS, Language } from '../types/book';
import { Toggle } from './UI/Toggle';
import { Slider } from './UI/Slider';
import { SegmentedControl } from './UI/SegmentedControl';
import { t } from '../services/i18n';

interface RanobeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: ReaderSettings) => void;
}

export const RanobeSettingsModal: React.FC<RanobeSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const handleThemeSelect = (preset: ThemePreset) => {
    const palette = THEME_PALETTES[preset];
    onUpdateSettings({
      ...settings,
      theme: preset,
      customBgColor: palette.bg,
      customTextColor: palette.text,
    });
  };

  const normalizeHexInput = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    return '#' + cleaned;
  };

  const handleCustomBgChange = (color: string) => {
    onUpdateSettings({
      ...settings,
      customBgColor: normalizeHexInput(color),
    });
  };

  const handleCustomTextChange = (color: string) => {
    onUpdateSettings({
      ...settings,
      customTextColor: normalizeHexInput(color),
    });
  };

  const themeList: { preset: ThemePreset; bg: string; text: string }[] = [
    { preset: 'white', bg: '#ffffff', text: '#000000' },
    { preset: 'light', bg: '#e5e7eb', text: '#111827' },
    { preset: 'sepia', bg: '#fbf0d9', text: '#3c2c1e' },
    { preset: 'parchment', bg: '#e8d8b8', text: '#34251a' },
    { preset: 'slate', bg: '#0a0a0a', text: '#c8c2b8' },
    { preset: 'black', bg: '#0a0a0a', text: '#bdbdbd' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-[#191a1e] border border-[#2c2e36] text-neutral-200 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2c2e36]">
          <h2 className="text-lg font-bold text-white tracking-wide">{t('settings', settings.language)}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282a33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 py-3 space-y-4 text-sm divide-y divide-[#2c2e36]/60">
          {/* Language Selector */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-[#2196f3]" />
              <span className="text-sm font-medium text-neutral-200">{t('language', settings.language)}</span>
            </div>
            <SegmentedControl
              options={[
                { value: 'uk', label: 'Українська' },
                { value: 'en', label: 'English' },
                { value: 'ru', label: 'Русский' },
              ]}
              value={settings.language || 'uk'}
              onChange={(val) => update('language', val as Language)}
            />
          </div>

          {/* Preset Selector */}
          <div className="pt-3">
            <div className="relative">
              <select
                value="default"
                onChange={(e) => {
                  if (e.target.value === 'reset') {
                    onUpdateSettings({ ...DEFAULT_SETTINGS, language: settings.language });
                  }
                }}
                className="w-full appearance-none bg-[#24262e] border border-[#343743] rounded-lg px-4 py-2.5 text-neutral-200 text-sm font-medium focus:outline-none focus:border-[#2196f3]"
              >
                <option value="default">{t('defaultPreset', settings.language)}</option>
                <option value="reset">{t('resetSettings', settings.language)}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Color Themes */}
          <div className="pt-3">
            <label className="block text-sm font-medium text-neutral-300 mb-3">{t('colorTheme', settings.language)}</label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {themeList.map((t) => {
                const isSelected = settings.theme === t.preset;
                return (
                  <button
                    key={t.preset}
                    type="button"
                    onClick={() => handleThemeSelect(t.preset)}
                    className={`h-11 rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-95 border-2 ${
                      isSelected ? 'border-[#2196f3] ring-2 ring-[#2196f3]/40 scale-105' : 'border-transparent hover:opacity-90'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    A
                  </button>
                );
              })}
            </div>

            {/* Custom Interactive Color Pickers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5 p-2.5 bg-[#22242c] rounded-lg border border-[#2e313b]">
                <span className="text-xs text-neutral-400 font-medium">{t('customBg', settings.language)}</span>
                <div className="flex items-center gap-2">
                  <label className="relative w-8 h-8 rounded-lg border border-neutral-600 shadow-inner overflow-hidden cursor-pointer shrink-0 block">
                    <input
                      type="color"
                      value={settings.customBgColor.startsWith('#') && settings.customBgColor.length === 7 ? settings.customBgColor : '#141414'}
                      onChange={(e) => handleCustomBgChange(e.target.value)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer opacity-0"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: settings.customBgColor }}
                    />
                  </label>
                  <div className="flex items-center flex-1 min-w-0 bg-[#18191d] border border-[#343743] rounded px-2 py-1 focus-within:border-[#2196f3]">
                    <span className="text-xs font-mono text-neutral-500 select-none mr-0.5">#</span>
                    <input
                      type="text"
                      value={settings.customBgColor.replace(/^#/, '')}
                      maxLength={7}
                      onChange={(e) => handleCustomBgChange(e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-mono text-neutral-200 lowercase focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 p-2.5 bg-[#22242c] rounded-lg border border-[#2e313b]">
                <span className="text-xs text-neutral-400 font-medium">{t('customText', settings.language)}</span>
                <div className="flex items-center gap-2">
                  <label className="relative w-8 h-8 rounded-lg border border-neutral-600 shadow-inner overflow-hidden cursor-pointer shrink-0 block">
                    <input
                      type="color"
                      value={settings.customTextColor.startsWith('#') && settings.customTextColor.length === 7 ? settings.customTextColor : '#dddddd'}
                      onChange={(e) => handleCustomTextChange(e.target.value)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer opacity-0"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: settings.customTextColor }}
                    />
                  </label>
                  <div className="flex items-center flex-1 min-w-0 bg-[#18191d] border border-[#343743] rounded px-2 py-1 focus-within:border-[#2196f3]">
                    <span className="text-xs font-mono text-neutral-500 select-none mr-0.5">#</span>
                    <input
                      type="text"
                      value={settings.customTextColor.replace(/^#/, '')}
                      maxLength={7}
                      onChange={(e) => handleCustomTextChange(e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-mono text-neutral-200 lowercase focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Padding Toggle */}
          <div className="pt-3">
            <SegmentedControl
              label={t('sidePadding', settings.language)}
              options={[
                { value: true, label: t('enabled', settings.language) },
                { value: false, label: t('disabled', settings.language) },
              ]}
              value={settings.sidePadding}
              onChange={(val) => update('sidePadding', val)}
            />
          </div>

          {/* Text Alignment */}
          <div className="pt-3">
            <SegmentedControl
              label={t('textAlign', settings.language)}
              options={[
                { value: 'left', label: t('alignLeft', settings.language) },
                { value: 'justify', label: t('alignJustify', settings.language) },
              ]}
              value={settings.textAlign}
              onChange={(val) => update('textAlign', val)}
            />
          </div>

          {/* Menu Trigger */}
          <div className="pt-3">
            <SegmentedControl
              label={t('menuTrigger', settings.language)}
              options={[
                { value: 'tap', label: t('triggerTap', settings.language) },
                { value: 'scroll', label: t('triggerScroll', settings.language) },
              ]}
              value={settings.menuTrigger}
              onChange={(val) => update('menuTrigger', val)}
            />
          </div>

          {/* Font Family */}
          <div className="pt-3">
            <label className="block mb-2 text-sm font-medium text-neutral-200">{t('fontFamily', settings.language)}</label>
            <div className="relative">
              <select
                value={settings.fontFamily}
                onChange={(e) => update('fontFamily', e.target.value as ReaderSettings['fontFamily'])}
                className="w-full appearance-none bg-[#24262e] border border-[#343743] rounded-lg px-4 py-2.5 text-neutral-200 text-sm font-medium focus:outline-none focus:border-[#2196f3]"
              >
                <option value="default">{t('fontDefault', settings.language)}</option>
                <option value="serif">{t('fontSerif', settings.language)}</option>
                <option value="pt-serif">PT Serif / Merriweather</option>
                <option value="georgia">Georgia</option>
                <option value="sans-serif">{t('fontSans', settings.language)}</option>
                <option value="monospace">{t('fontMonospace', settings.language)}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-3 space-y-1">
            <Toggle
              label={t('disableImagesOpt', settings.language)}
              checked={settings.disableImages}
              onChange={(val) => update('disableImages', val)}
            />
            <Toggle
              label={t('hideChapterHeaderOpt', settings.language)}
              checked={settings.hideChapterHeader}
              onChange={(val) => update('hideChapterHeader', val)}
            />
          </div>

          {/* Sliders */}
          <div className="pt-3 space-y-1">
            <Slider
              label={t('fontSize', settings.language)}
              value={settings.fontSize}
              min={12}
              max={32}
              step={1}
              unit="px"
              onChange={(val) => update('fontSize', val)}
            />
            <Slider
              label={t('lineHeight', settings.language)}
              value={settings.lineHeight}
              min={1.0}
              max={2.5}
              step={0.1}
              unit=""
              onChange={(val) => update('lineHeight', Math.round(val * 10) / 10)}
            />
            <Slider
              label={t('paragraphSpacing', settings.language)}
              value={settings.paragraphSpacing}
              min={0}
              max={30}
              step={2}
              unit="px"
              onChange={(val) => update('paragraphSpacing', val)}
            />
            <Slider
              label={t('containerWidth', settings.language)}
              value={settings.containerWidth}
              min={70}
              max={100}
              step={5}
              unit="%"
              onChange={(val) => update('containerWidth', val)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2c2e36] bg-[#141518] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-[#2196f3] hover:bg-[#1e88e5] text-white font-medium text-sm rounded-lg transition-colors shadow"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};