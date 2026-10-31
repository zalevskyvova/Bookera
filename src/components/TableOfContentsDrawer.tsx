import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, ListOrdered, Check } from 'lucide-react';
import { Chapter, Language } from '../types/book';
import { t } from '../services/i18n';

interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterId: string;
  language?: Language;
  onSelectChapter: (chapterId: string, index: number) => void;
}

export const TableOfContentsDrawer: React.FC<TableOfContentsDrawerProps> = ({
  isOpen,
  onClose,
  chapters,
  currentChapterId,
  language = 'uk',
  onSelectChapter,
}) => {
  const [search, setSearch] = useState('');
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const indexedChapters = useMemo(
    () => chapters.map((ch, idx) => ({ ch, originalIndex: idx })),
    [chapters]
  );

  const filteredChapters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return indexedChapters;
    return indexedChapters.filter(
      ({ ch, originalIndex }) =>
        ch.title.toLowerCase().includes(q) || String(originalIndex + 1).includes(q)
    );
  }, [indexedChapters, search]);

  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-start bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full max-w-md h-full bg-[#191a1e] border-r border-[#2c2e36] text-neutral-200 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-4 border-b border-[#2c2e36]"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)' }}
        >
          <div className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-[#2196f3]" />
            <h2 className="text-lg font-bold text-white tracking-wide">{t('tableOfContents', language)}</h2>
            <span className="text-xs font-mono bg-[#282a33] text-neutral-300 px-2 py-0.5 rounded-full ml-1">
              {chapters.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#282a33] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#2c2e36]">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchChapters', language)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#22242c] border border-[#30333e] rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#2196f3]"
            />
          </div>
        </div>

        {/* Chapters list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredChapters.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              {t('noChapters', language)}
            </div>
          ) : (
            filteredChapters.map(({ ch, originalIndex }) => {
              const isCurrent = ch.id === currentChapterId;

              return (
                <button
                  key={ch.id}
                  ref={isCurrent ? activeItemRef : undefined}
                  type="button"
                  onClick={() => {
                    onSelectChapter(ch.id, originalIndex);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-all ${
                    isCurrent
                      ? 'bg-[#2196f3]/15 text-[#2196f3] border border-[#2196f3]/40 font-semibold'
                      : 'hover:bg-[#23252d] text-neutral-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className="text-xs font-mono text-neutral-500 w-7 shrink-0 text-right">
                      {originalIndex + 1}
                    </span>
                    <span className="truncate">{ch.title}</span>
                  </div>

                  {isCurrent && (
                    <span className="shrink-0 text-[#2196f3]">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
