import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Sliders,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Book, Chapter, ReaderSettings, Bookmark, Language } from '../types/book';
import { RanobeSettingsModal } from './RanobeSettingsModal';
import { BookmarksDrawer } from './BookmarksDrawer';
import { TableOfContentsDrawer } from './TableOfContentsDrawer';
import { ImageViewerModal } from './ImageViewerModal';
import { t } from '../services/i18n';
import {
  updateReadingProgress,
  addBookmark,
  removeBookmark,
  getBookmarksForBook,
  saveSettings,
} from '../services/storage';

interface ReaderViewProps {
  book: Book;
  onBack: () => void;
  initialSettings: ReaderSettings;
}

interface ChapterBodyProps {
  chapter: Chapter | undefined;
  hideChapterHeader: boolean;
  disableImages: boolean;
  paragraphSpacing: number;
  language: Language;
  onBookmarkParagraph: (idx: number, text: string) => void;
  onOpenImage: (src: string) => void;
}

const ChapterBody: React.FC<ChapterBodyProps> = memo(
  ({
    chapter,
    hideChapterHeader,
    disableImages,
    paragraphSpacing,
    language,
    onBookmarkParagraph,
    onOpenImage,
  }) => {
    if (!chapter) return null;

    return (
      <>
        {!hideChapterHeader && (
          <div className="pt-4 pb-6 border-b border-neutral-700/30 mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {chapter.title}
            </h1>
          </div>
        )}

        <div className="space-y-0">
          {chapter.content.map((paragraph, idx) => {
            if (paragraph.startsWith('[IMG:') && paragraph.endsWith(']')) {
              if (disableImages) {
                return (
                  <div
                    key={idx}
                    className="p-3 my-4 bg-black/20 rounded border border-neutral-700/20 text-center text-xs opacity-50 italic"
                  >
                    {t('imagesDisabled', language)}
                  </div>
                );
              }
              const imgKey = paragraph.slice(5, -1);
              const imgSrc = chapter.images?.[imgKey] || imgKey;
              return (
                <div key={idx} className="my-6 flex justify-center">
                  <img
                    src={imgSrc}
                    alt={t('illustration', language)}
                    loading="lazy"
                    decoding="async"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenImage(imgSrc);
                    }}
                    className="max-w-full rounded-lg shadow-md max-h-[70vh] object-contain cursor-zoom-in active:opacity-90 transition-opacity"
                  />
                </div>
              );
            }

            return (
              <p
                key={idx}
                id={`p-${idx}`}
                data-paragraph-index={idx}
                className="select-text"
                onDoubleClick={(e) => {
                  const sel = window.getSelection()?.toString().trim();
                  if (sel && sel.length > 0) return;
                  e.stopPropagation();
                  onBookmarkParagraph(idx, paragraph);
                }}
                style={{
                  marginBottom: `${paragraphSpacing}px`,
                }}
              >
                {paragraph}
              </p>
            );
          })}
        </div>
      </>
    );
  }
);

function findVisibleParagraphIndex(container: HTMLElement): { index: number; text: string } {
  const pElements = container.querySelectorAll<HTMLElement>('[data-paragraph-index]');
  if (pElements.length === 0) return { index: 0, text: '' };

  const targetY = window.innerHeight / 2;
  let low = 0;
  let high = pElements.length - 1;
  let bestIdx = 0;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const rect = pElements[mid].getBoundingClientRect();
    if (rect.top <= targetY) {
      bestIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const chosen = pElements[bestIdx];
  const parsedIdx = parseInt(chosen.getAttribute('data-paragraph-index') || '0', 10);
  return { index: parsedIdx, text: chosen.textContent || '' };
}

export const ReaderView: React.FC<ReaderViewProps> = ({ book, onBack, initialSettings }) => {
  const [settings, setSettings] = useState<ReaderSettings>(initialSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [showBars, setShowBars] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(book.currentChapterIndex || 0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const isAddingBookmarkRef = useRef(false);

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const statusBarHeight = isNative
    ? 'max(env(safe-area-inset-top, 0px), 38px)'
    : 'env(safe-area-inset-top, 0px)';

  const currentChapter: Chapter | undefined = book.chapters[currentChapterIndex];

  // Load bookmarks for current book
  const loadBookmarks = useCallback(async () => {
    const list = await getBookmarksForBook(book.id);
    setBookmarks(list);
  }, [book.id]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const saveCurrentProgressSync = useCallback(() => {
    if (scrollSaveTimerRef.current !== null) {
      window.clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = null;
    }
    if (!containerRef.current || !currentChapter) return;
    const { scrollTop: st, scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const pct = maxScroll > 0 ? (st / maxScroll) * 100 : 0;
    const { index: visiblePIndex } = findVisibleParagraphIndex(containerRef.current);
    updateReadingProgress(book.id, currentChapter.id, currentChapterIndex, pct, visiblePIndex);
  }, [book.id, currentChapter, currentChapterIndex]);

  useEffect(() => {
    return () => {
      saveCurrentProgressSync();
    };
  }, [saveCurrentProgressSync]);

  const handleBackToLibrary = () => {
    saveCurrentProgressSync();
    onBack();
  };

  const toggleBars = useCallback(() => {
    setShowBars((prev) => {
      const next = !prev;
      // Compensate scrollTop when top bar collapses or expands so visible text remains perfectly stable
      if (containerRef.current) {
        const delta = 52;
        if (!next) {
          containerRef.current.scrollTop += delta;
        } else {
          containerRef.current.scrollTop = Math.max(0, containerRef.current.scrollTop - delta);
        }
      }
      return next;
    });
  }, []);

  // Handle settings update
  const handleUpdateSettings = useCallback((newSettings: ReaderSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // Switch chapter
  const goToChapter = useCallback(
    (index: number, targetParagraphIndex: number = 0) => {
      if (index < 0 || index >= book.chapters.length) return;
      if (scrollSaveTimerRef.current !== null) {
        window.clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }

      setCurrentChapterIndex(index);
      const totalCh = book.chapters.length || 1;
      updateReadingProgress(
        book.id,
        book.chapters[index].id,
        index,
        (index / totalCh) * 100,
        targetParagraphIndex
      );

      // Scroll to top or paragraph
      setTimeout(() => {
        if (containerRef.current) {
          if (targetParagraphIndex > 0) {
            const el = document.getElementById(`p-${targetParagraphIndex}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
          }
          containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 30);
    },
    [book.chapters, book.id]
  );

  // Restore previous scroll on initial mount
  useEffect(() => {
    if (book.currentParagraphIndex && book.currentParagraphIndex > 0) {
      setTimeout(() => {
        const el = document.getElementById(`p-${book.currentParagraphIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }, 100);
    }
  }, [book.currentParagraphIndex]);

  // Debounced scroll handler with hysteresis to avoid oscillation loops
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || !currentChapter) return;
    const { scrollTop } = container;

    if (settings.menuTrigger === 'scroll') {
      const delta = scrollTop - lastScrollY.current;
      if (delta > 35 && scrollTop > 80 && showBars) {
        setShowBars(false);
        container.scrollTop += 52;
      } else if (delta < -35 && !showBars) {
        setShowBars(true);
        container.scrollTop = Math.max(0, container.scrollTop - 52);
      }
    }
    lastScrollY.current = scrollTop;

    if (scrollSaveTimerRef.current !== null) {
      window.clearTimeout(scrollSaveTimerRef.current);
    }

    const chapterId = currentChapter.id;
    const chIdx = currentChapterIndex;
    scrollSaveTimerRef.current = window.setTimeout(() => {
      if (!containerRef.current) return;
      const { scrollTop: st, scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      const pct = maxScroll > 0 ? (st / maxScroll) * 100 : 0;
      const { index: visiblePIndex } = findVisibleParagraphIndex(containerRef.current);
      updateReadingProgress(book.id, chapterId, chIdx, pct, visiblePIndex);
    }, 300);
  };

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  }, []);

  // Bookmark current position
  const handleAddBookmarkAtCurrent = useCallback(
    async (paragraphIdx?: number, snippetText?: string) => {
      if (!currentChapter || isAddingBookmarkRef.current) return;
      isAddingBookmarkRef.current = true;

      try {
        let pIndex = paragraphIdx ?? 0;
        let snippet = snippetText;

        if (snippet === undefined && containerRef.current) {
          const found = findVisibleParagraphIndex(containerRef.current);
          pIndex = found.index;
          snippet = found.text;
        }

        if (!snippet || snippet.startsWith('[IMG:')) {
          snippet = `[${t('illustration', settings.language)}]`;
        }

        const bookmark: Bookmark = {
          id: `bm_${book.id}_${currentChapter.id}_${pIndex}`,
          bookId: book.id,
          chapterId: currentChapter.id,
          chapterTitle: currentChapter.title,
          paragraphIndex: pIndex,
          snippet: snippet.substring(0, 100),
          timestamp: Date.now(),
        };

        const added = await addBookmark(bookmark);
        await loadBookmarks();
        showToast(added ? t('bookmarkAdded', settings.language) : t('bookmarkAlreadyExists', settings.language));
      } finally {
        isAddingBookmarkRef.current = false;
      }
    },
    [book.id, currentChapter, loadBookmarks, showToast, settings.language]
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      await removeBookmark(id);
      await loadBookmarks();
      showToast(t('bookmarkRemoved', settings.language));
    },
    [loadBookmarks, showToast, settings.language]
  );

  const handleSelectBookmark = useCallback(
    (bm: Bookmark) => {
      const chIdx = book.chapters.findIndex((c) => c.id === bm.chapterId);
      if (chIdx !== -1) {
        goToChapter(chIdx, bm.paragraphIndex);
      }
      setIsBookmarksOpen(false);
    },
    [book.chapters, goToChapter]
  );

  // Font family style mapping
  const getFontFamilyStyle = () => {
    switch (settings.fontFamily) {
      case 'serif':
        return 'Georgia, Cambria, "Times New Roman", Times, serif';
      case 'pt-serif':
        return '"PT Serif", "Merriweather", Georgia, serif';
      case 'georgia':
        return 'Georgia, serif';
      case 'sans-serif':
        return 'sans-serif';
      case 'monospace':
        return 'monospace';
      default:
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  };

  const isCurrentChapterBookmarked = bookmarks.some((b) => b.chapterId === currentChapter?.id);

  const resolvedBg = settings.customBgColor.startsWith('#')
    ? settings.customBgColor
    : `#${settings.customBgColor}`;
  const resolvedText = settings.customTextColor.startsWith('#')
    ? settings.customTextColor
    : `#${settings.customTextColor}`;

  if (!book.chapters || book.chapters.length === 0) {
    return (
      <div
        className="w-full h-screen flex flex-col items-center justify-center p-6 text-center select-none"
        style={{ backgroundColor: resolvedBg, color: resolvedText }}
      >
        <p className="text-base font-semibold mb-2">{t('statusEmptyContent', settings.language)}</p>
        <button
          type="button"
          onClick={handleBackToLibrary}
          className="mt-4 px-4 py-2 bg-[#2196f3] text-white rounded-lg text-sm font-medium shadow"
        >
          {t('backToLibrary', settings.language)}
        </button>
      </div>
    );
  }

  const totalChapters = book.chapters.length || 1;
  const chapterPercentage = Math.min(100, Math.round(((currentChapterIndex + 1) / totalChapters) * 100));

  return (
    <div
      className="relative w-full h-screen overflow-hidden flex flex-col select-text"
      style={{
        backgroundColor: resolvedBg,
        color: resolvedText,
      }}
    >
      {/* Camera / Status Bar Safe-Area Rectangle */}
      <div
        aria-hidden="true"
        className="w-full shrink-0 z-50 pointer-events-none select-none transition-colors duration-200"
        style={{
          backgroundColor: resolvedBg,
          height: statusBarHeight,
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed left-1/2 transform -translate-x-1/2 z-[70] bg-[#252527] text-white border border-[#333336] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200"
          style={{ top: `calc(${statusBarHeight} + 64px)` }}
        >
          <CheckCircle2 className="w-4 h-4 text-[#2196f3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top App Bar */}
      <div
        className={`w-full shrink-0 z-40 bg-[#252527] border-b border-[#303033] text-neutral-200 px-3 flex items-center justify-between transition-all duration-200 overflow-hidden ${
          showBars ? 'h-[52px] opacity-100 py-1.5' : 'h-0 opacity-0 py-0 border-b-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 truncate pr-2">
          <button
            type="button"
            onClick={handleBackToLibrary}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252730] transition-colors"
            title={t('backToLibrary', settings.language)}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <div className="text-xs text-neutral-400 truncate">{book.title}</div>
            <div className="text-sm font-semibold text-white truncate">
              {currentChapter?.title || t('chapter', settings.language)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleAddBookmarkAtCurrent()}
            className={`p-2 rounded-lg transition-colors ${
              isCurrentChapterBookmarked
                ? 'text-[#2196f3] bg-[#2196f3]/15 hover:bg-[#2196f3]/25'
                : 'text-neutral-300 hover:text-white hover:bg-[#252730]'
            }`}
            title={t('addBookmark', settings.language)}
          >
            {isCurrentChapterBookmarked ? (
              <BookmarkCheck className="w-5 h-5" />
            ) : (
              <BookmarkIcon className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsBookmarksOpen(true)}
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252730] transition-colors"
            title={t('bookmarksList', settings.language)}
          >
            <BookmarkIcon className="w-5 h-5 fill-current opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => setIsTocOpen(true)}
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252730] transition-colors"
            title={t('tableOfContents', settings.language)}
          >
            <ListOrdered className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252730] transition-colors"
            title={t('settings', settings.language)}
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Reading Canvas */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onClick={() => {
          if (settings.menuTrigger === 'tap') {
            toggleBars();
          }
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{
          paddingTop: '16px',
          paddingBottom: '24px',
        }}
      >
        <div
          className={`mx-auto ${
            settings.sidePadding ? 'px-4 sm:px-6 md:px-8' : 'px-1'
          } ${settings.textAlign === 'justify' ? 'text-justify' : 'text-left'}`}
          style={{
            maxWidth: `${settings.containerWidth}%`,
            fontFamily: getFontFamilyStyle(),
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
          }}
        >
          <ChapterBody
            chapter={currentChapter}
            hideChapterHeader={settings.hideChapterHeader}
            disableImages={settings.disableImages}
            paragraphSpacing={settings.paragraphSpacing}
            language={settings.language}
            onBookmarkParagraph={handleAddBookmarkAtCurrent}
            onOpenImage={setZoomedImageSrc}
          />

          {/* Chapter End & Enlarged Navigation Footer */}
          <div className="pt-10 pb-10 mt-10 border-t border-neutral-700/30 flex flex-col items-center gap-5">
            <div className="text-xs uppercase tracking-wider font-medium opacity-50">
              {currentChapterIndex >= book.chapters.length - 1
                ? t('endOfBook', settings.language)
                : t('endOfChapter', settings.language)}
            </div>
            <div className="grid grid-cols-2 gap-3.5 w-full max-w-md">
              <button
                type="button"
                disabled={currentChapterIndex <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  goToChapter(currentChapterIndex - 1);
                }}
                className="w-full py-4 px-5 rounded-xl bg-[#24262f] text-neutral-100 border border-[#343744] hover:bg-[#2d303b] active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span>{t('prevChapter', settings.language)}</span>
              </button>

              <button
                type="button"
                disabled={currentChapterIndex >= book.chapters.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  goToChapter(currentChapterIndex + 1);
                }}
                className="w-full py-4 px-5 rounded-xl bg-[#2196f3] text-white hover:bg-[#1e88e5] active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none text-base font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2196f3]/20"
              >
                <span>{t('nextChapter', settings.language)}</span>
                <ChevronRight className="w-5 h-5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className={`w-full shrink-0 z-40 bg-[#1c1c1c] border-t border-[#2a2a2c] text-neutral-200 px-4 flex items-center justify-between transition-all duration-200 overflow-hidden ${
          showBars ? 'h-[54px] opacity-100 py-2' : 'h-0 opacity-0 py-0 border-t-0 pointer-events-none'
        }`}
        style={{
          paddingBottom: showBars ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : '0px',
        }}
      >
        <button
          type="button"
          disabled={currentChapterIndex <= 0}
          onClick={() => goToChapter(currentChapterIndex - 1)}
          className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#2a2a2e] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title={t('prevChapter', settings.language)}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsTocOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-[#252527] border border-[#333336] text-xs font-medium text-neutral-200 hover:bg-[#2e2e32] transition-colors"
        >
          {t('chapterProgress', settings.language, {
            chapter: t('chapter', settings.language),
            current: currentChapterIndex + 1,
            total: book.chapters.length,
            pct: chapterPercentage,
          })}
        </button>

        <button
          type="button"
          disabled={currentChapterIndex >= book.chapters.length - 1}
          onClick={() => goToChapter(currentChapterIndex + 1)}
          className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-[#2a2a2e] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title={t('nextChapter', settings.language)}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Modals & Drawers */}
      <RanobeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        language={settings.language}
        onSelectBookmark={handleSelectBookmark}
        onDeleteBookmark={handleDeleteBookmark}
      />

      <TableOfContentsDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        chapters={book.chapters}
        language={settings.language}
        currentChapterId={currentChapter?.id || ''}
        onSelectChapter={(_chId, idx) => goToChapter(idx)}
      />

      <ImageViewerModal
        src={zoomedImageSrc}
        language={settings.language}
        onClose={() => setZoomedImageSrc(null)}
      />
    </div>
  );
};
