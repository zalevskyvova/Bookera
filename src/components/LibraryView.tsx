import React, { useState, useRef, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  X,
  Globe,
} from 'lucide-react';
import { Book, ReaderSettings, DEFAULT_SETTINGS } from '../types/book';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { TopStatusBarSpacer } from './TopStatusBarSpacer';
import { RanobeSettingsModal } from './RanobeSettingsModal';
import { t } from '../services/i18n';

interface LibraryViewProps {
  books: Book[];
  settings?: ReaderSettings;
  onUpdateSettings?: (settings: ReaderSettings) => void;
  onOpenBook: (book: Book) => void;
  onAddBook: (book: Book) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  settings,
  onUpdateSettings,
  onOpenBook,
  onAddBook,
  onDeleteBook,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const lang = settings?.language || 'uk';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  const filteredBooks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }, [books, searchTerm]);

  const handleCancelUpload = () => {
    isCancelledRef.current = true;
    setIsLoading(false);
    setStatusMessage(null);
    setErrorMessage(t('cancelScan', lang));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    isCancelledRef.current = false;
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(`${t('statusReadingFile', lang)}: ${file.name}...`);

    try {
      const lowerName = file.name.toLowerCase();
      let ext = lowerName.split('.').pop() || '';
      const isFb2Zip = lowerName.endsWith('.fb2.zip');
      let newBook: Book | null = null;

      const checkCancelled = () => isCancelledRef.current;

      if (isFb2Zip || (ext === 'zip' && lowerName.includes('fb2'))) {
        setStatusMessage(t('statusUnpackingZip', lang));
        const [JSZipMod, { parseFb2Content }] = await Promise.all([
          import('jszip'),
          import('../services/parsers/fb2Parser'),
        ]);
        const buffer = await file.arrayBuffer();
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        const zip = await JSZipMod.default.loadAsync(buffer);
        const fb2Entry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.fb2'));
        if (!fb2Entry) {
          throw new Error(t('statusZipNoFb2', lang));
        }
        const text = await fb2Entry.async('text');
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        newBook = parseFb2Content(fb2Entry.name, text);
      } else if (ext === 'fb2') {
        setStatusMessage(t('statusReadingFb2', lang));
        const [{ parseFb2Content }, text] = await Promise.all([
          import('../services/parsers/fb2Parser'),
          file.text(),
        ]);
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        newBook = parseFb2Content(file.name, text);
      } else if (ext === 'txt') {
        setStatusMessage(t('statusSplittingTxt', lang));
        const [{ parseTxtContent }, text] = await Promise.all([
          import('../services/parsers/txtParser'),
          file.text(),
        ]);
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        newBook = parseTxtContent(file.name, text);
      } else if (ext === 'epub') {
        setStatusMessage(t('statusParsingEpub', lang));
        const [{ parseEpubFile }, buffer] = await Promise.all([
          import('../services/parsers/epubParser'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        newBook = await parseEpubFile(
          file.name,
          buffer,
          checkCancelled,
          (curr, total) => {
            setStatusMessage(`EPUB: ${curr} / ${total}...`);
          }
        );
      } else if (ext === 'pdf') {
        setStatusMessage(t('statusExtractingPdf', lang));
        const [{ parsePdfFile }, buffer] = await Promise.all([
          import('../services/parsers/pdfParser'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        newBook = await parsePdfFile(
          file.name,
          buffer,
          checkCancelled,
          (curr, total) => {
            setStatusMessage(`PDF: ${curr} / ${total}...`);
          }
        );
      } else if (ext === 'zip') {
        setStatusMessage(t('statusUnpackingZip', lang));
        const [JSZipMod, buffer] = await Promise.all([
          import('jszip'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error(t('statusScanCancelled', lang));
        const zip = await JSZipMod.default.loadAsync(buffer);
        const fb2Entry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.fb2'));
        if (fb2Entry) {
          const [{ parseFb2Content }, text] = await Promise.all([
            import('../services/parsers/fb2Parser'),
            fb2Entry.async('text'),
          ]);
          newBook = parseFb2Content(fb2Entry.name, text);
        } else {
          const mime = await zip.file('mimetype')?.async('text');
          if (mime && mime.includes('epub')) {
            const { parseEpubFile } = await import('../services/parsers/epubParser');
            newBook = await parseEpubFile(file.name, buffer, checkCancelled);
          } else {
            throw new Error(t('statusUnsupportedFormat', lang));
          }
        }
      } else {
        throw new Error(t('statusUnsupportedFormat', lang));
      }

      if (checkCancelled()) {
        throw new Error(t('statusScanCancelled', lang));
      }

      if (newBook) {
        setStatusMessage('...');
        await onAddBook(newBook);
      }
    } catch (err: any) {
      if (err.message !== t('statusScanCancelled', lang)) {
        setErrorMessage(err.message || 'Error');
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatLastRead = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('timeJustNow', lang);
    if (mins < 60) return `${mins} ${t('timeMinsAgo', lang)}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t('timeHoursAgo', lang)}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t('timeDaysAgo', lang)}`;
  };

  return (
    <div className="min-h-screen bg-[#121316] text-neutral-200 flex flex-col">
      {/* Safe Area Notch Shield (Gray Bar at top) */}
      <TopStatusBarSpacer bgColor="#16171b" />

      {/* Top Navbar */}
      <header
        className="sticky top-0 z-30 bg-[#16171b]/95 border-b border-[#282a33] backdrop-blur-md px-4 py-3 sm:px-8 flex items-center justify-between transition-all"
        style={{ marginTop: 'max(env(safe-area-inset-top, 0px), 38px)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <img
            src="/logo.png"
            alt="Bookera Logo"
            className="w-9 h-9 rounded-xl object-contain shadow-md shadow-[#0d3d8a]/40 border border-[#1e58b8]/40 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight truncate">Bookera</h1>
            <p className="text-[10px] text-neutral-400 font-medium leading-tight truncate">{t('librarySubtitle', lang)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onUpdateSettings && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 px-2.5 bg-[#20222a] hover:bg-[#282a34] text-neutral-300 hover:text-white border border-[#2b2d37] rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              title={t('settings', lang)}
            >
              <Globe className="w-4 h-4 text-[#2196f3]" />
              <span className="text-[11px] font-bold uppercase font-mono text-neutral-300">
                {lang}
              </span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="*/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-[128px] sm:w-[132px] px-2.5 bg-[#2196f3] hover:bg-[#1e88e5] text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            )}
            <span className="truncate">{t('addBook', lang)}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 space-y-5"
        style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 32px)' }}
      >
        {/* Active Scanning Status with CANCEL Button */}
        {isLoading && statusMessage && (
          <div className="p-3.5 bg-[#1a2130] border border-[#2196f3]/50 rounded-xl flex items-center justify-between gap-3 text-xs text-[#64b5f6] shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2.5 truncate">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#2196f3]" />
              <span className="font-medium truncate">{statusMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="shrink-0 px-3 py-1.5 bg-[#252c3d] hover:bg-[#2f384d] text-white border border-[#3b4661] rounded-lg text-xs font-semibold transition-colors active:scale-95"
            >
              {t('cancel', lang)}
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center justify-between gap-2.5 text-xs text-red-300 animate-in fade-in">
            <div className="flex items-center gap-2.5 truncate">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search bar and counter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchPlaceholder', lang)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1c1d22] border border-[#2c2e37] rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#2196f3] transition-colors"
            />
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-2 self-end sm:self-center font-mono">
            <span>{t('totalBooks', lang)} {books.length}</span>
          </div>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-[#17181d] rounded-2xl border border-[#252731]">
            <div className="w-16 h-16 rounded-full bg-[#22242d] flex items-center justify-center text-neutral-500 mb-4">
              <FileText className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-neutral-200 mb-1">
              {searchTerm ? t('notFoundTitle', lang) : t('emptyTitle', lang)}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
              {searchTerm
                ? t('notFoundDesc', lang)
                : t('emptyDesc', lang)}
            </p>

            {!searchTerm && (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-[#2196f3] hover:bg-[#1e88e5] text-white text-xs font-semibold rounded-lg shadow-md transition-colors flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('selectFileFromDevice', lang)}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBooks.map((book) => {
              const progressPct = Math.round(
                ((book.currentChapterIndex + 1) / book.totalChapters) * 100
              );

              return (
                <div
                  key={book.id}
                  onClick={() => onOpenBook(book)}
                  className="group relative bg-[#1c1d22] border border-[#2b2d37] sm:hover:border-neutral-600 rounded-xl overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-200 active:scale-[0.99] hover:shadow-xl shadow-black/40 select-none"
                  style={{
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Book Cover */}
                  <div className="relative w-full aspect-[2/3] bg-[#242630] overflow-hidden flex items-center justify-center select-none">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                      />
                    ) : (
                      <div className="w-full h-full p-4 pt-11 flex flex-col justify-between bg-gradient-to-br from-[#1f2937] via-[#111827] to-[#0f172a] text-neutral-300 select-none">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                            Bookera
                          </div>
                        </div>
                        <div className="font-serif text-sm font-bold line-clamp-3 leading-snug my-auto">
                          {book.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">{book.author}</div>
                      </div>
                    )}

                    {/* Format Badge */}
                    <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-mono uppercase px-2 py-0.5 rounded text-neutral-200 border border-white/10 pointer-events-none select-none">
                      {book.format}
                    </span>

                    {/* Delete action button - always touch-accessible on mobile! */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookToDelete(book);
                      }}
                      className="absolute top-2 left-2 p-1.5 bg-black/80 hover:bg-red-900/90 backdrop-blur-md rounded-lg text-neutral-300 hover:text-white border border-white/10 transition-all active:scale-95"
                      title={t('deleteBook', lang)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info block */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2 select-none">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-200 line-clamp-2 sm:group-hover:text-white transition-colors leading-snug">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{book.author}</p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {/* Progress bar */}
                      <div className="w-full h-1 bg-[#2b2d37] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2196f3]"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>{t('chapterShort', lang)} {book.currentChapterIndex + 1}/{book.totalChapters}</span>
                        <span>{progressPct}%</span>
                      </div>

                      <div className="flex items-center gap-1 text-[9px] text-neutral-500 pt-0.5 border-t border-[#2b2d37]/50">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatLastRead(book.lastReadTimestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!bookToDelete}
        book={bookToDelete}
        language={lang}
        onConfirm={async () => {
          if (bookToDelete) {
            await onDeleteBook(bookToDelete.id);
            setBookToDelete(null);
          }
        }}
        onCancel={() => setBookToDelete(null)}
      />

      {/* Settings Modal */}
      {onUpdateSettings && (
        <RanobeSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings || DEFAULT_SETTINGS}
          onUpdateSettings={onUpdateSettings}
        />
      )}
    </div>
  );
};
