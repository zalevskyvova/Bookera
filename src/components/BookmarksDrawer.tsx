import React from 'react';
import { X, Bookmark, Trash2, ArrowRight } from 'lucide-react';
import { Bookmark as BookmarkType } from '../types/book';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkType[];
  onSelectBookmark: (bookmark: BookmarkType) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSelectBookmark,
  onDeleteBookmark,
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('uk-UA')} ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[#191a1e] border-l border-[#2c2e36] text-neutral-200 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pb-4 border-b border-[#2c2e36]"
          style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 24px) + 12px)' }}
        >
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#2196f3]" />
            <h2 className="text-lg font-bold text-white tracking-wide">Закладки</h2>
            <span className="text-xs font-mono bg-[#282a33] text-neutral-300 px-2 py-0.5 rounded-full ml-1">
              {bookmarks.length}
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

        {/* List of bookmarks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <div className="w-16 h-16 rounded-full bg-[#23252d] flex items-center justify-center mb-4 text-neutral-500">
                <Bookmark className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-base font-medium text-neutral-300 mb-1">У вас ще немає закладок</p>
              <p className="text-xs text-neutral-500 max-w-xs">
                Торкніться значка закладки у верхньому меню під час читання, щоб зафіксувати потрібний фрагмент.
              </p>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="group p-3.5 bg-[#202228] hover:bg-[#262831] border border-[#2d303a] rounded-xl transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-[#2196f3] font-medium mb-1.5">
                    <span>{bm.chapterTitle}</span>
                    <span className="text-[11px] text-neutral-500 font-mono">{formatDate(bm.timestamp)}</span>
                  </div>
                  <p className="text-sm text-neutral-300 line-clamp-3 italic bg-[#17181d] p-2.5 rounded-lg border border-[#262730]">
                    "{bm.snippet}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#2d303a]/50">
                  <button
                    type="button"
                    onClick={() => onDeleteBookmark(bm.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Видалити</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectBookmark(bm)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#2196f3] hover:text-[#42a5f5] px-2.5 py-1 bg-[#2196f3]/10 hover:bg-[#2196f3]/20 rounded-md transition-colors"
                  >
                    <span>Перейти</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
