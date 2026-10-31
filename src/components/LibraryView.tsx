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
  Sparkles,
  X,
} from 'lucide-react';
import { Book } from '../types/book';
import { SAMPLE_NOVEL } from '../services/sampleNovel';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { TopStatusBarSpacer } from './TopStatusBarSpacer';

interface LibraryViewProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onAddBook: (book: Book) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onOpenBook,
  onAddBook,
  onDeleteBook,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

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
    setErrorMessage('Сканування книги скасовано');
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
    setStatusMessage(`Зчитування файлу: ${file.name}...`);

    try {
      const lowerName = file.name.toLowerCase();
      let ext = lowerName.split('.').pop() || '';
      const isFb2Zip = lowerName.endsWith('.fb2.zip');
      let newBook: Book | null = null;

      const checkCancelled = () => isCancelledRef.current;

      if (isFb2Zip || (ext === 'zip' && lowerName.includes('fb2'))) {
        setStatusMessage('Розпакування FB2 з архіву ZIP...');
        const [JSZipMod, { parseFb2Content }] = await Promise.all([
          import('jszip'),
          import('../services/parsers/fb2Parser'),
        ]);
        const buffer = await file.arrayBuffer();
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        const zip = await JSZipMod.default.loadAsync(buffer);
        const fb2Entry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.fb2'));
        if (!fb2Entry) {
          throw new Error('В архіві ZIP не знайдено файлу .fb2');
        }
        const text = await fb2Entry.async('text');
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        newBook = parseFb2Content(fb2Entry.name, text);
      } else if (ext === 'fb2') {
        setStatusMessage('Читання та аналіз FB2 новели...');
        const [{ parseFb2Content }, text] = await Promise.all([
          import('../services/parsers/fb2Parser'),
          file.text(),
        ]);
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        newBook = parseFb2Content(file.name, text);
      } else if (ext === 'txt') {
        setStatusMessage('Розбиття тексту новели на глави...');
        const [{ parseTxtContent }, text] = await Promise.all([
          import('../services/parsers/txtParser'),
          file.text(),
        ]);
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        newBook = parseTxtContent(file.name, text);
      } else if (ext === 'epub') {
        setStatusMessage('Розпакування та читання EPUB...');
        const [{ parseEpubFile }, buffer] = await Promise.all([
          import('../services/parsers/epubParser'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        newBook = await parseEpubFile(
          file.name,
          buffer,
          checkCancelled,
          (curr, total) => {
            setStatusMessage(`Обробка глав EPUB: ${curr} з ${total}...`);
          }
        );
      } else if (ext === 'pdf') {
        setStatusMessage('Вилучення тексту з PDF сторінок...');
        const [{ parsePdfFile }, buffer] = await Promise.all([
          import('../services/parsers/pdfParser'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
        newBook = await parsePdfFile(
          file.name,
          buffer,
          checkCancelled,
          (curr, total) => {
            setStatusMessage(`Сканування PDF: сторінка ${curr} з ${total}...`);
          }
        );
      } else if (ext === 'zip') {
        setStatusMessage('Перевірка вмісту архіву ZIP...');
        const [JSZipMod, buffer] = await Promise.all([
          import('jszip'),
          file.arrayBuffer(),
        ]);
        if (checkCancelled()) throw new Error('Сканування скасовано користувачем');
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
            throw new Error('В архіві не знайдено книги формату .fb2 або .epub');
          }
        }
      } else {
        throw new Error(`Файл "${file.name}" має непідтримуваний формат. Оберіть .fb2, .fb2.zip, .epub, .txt або .pdf`);
      }

      if (checkCancelled()) {
        throw new Error('Сканування скасовано користувачем');
      }

      if (newBook) {
        setStatusMessage('Збереження у бібліотеку...');
        await onAddBook(newBook);
      }
    } catch (err: any) {
      if (err.message !== 'Сканування скасовано користувачем') {
        setErrorMessage(err.message || 'Помилка завантаження файлу');
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddSample = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onAddBook(SAMPLE_NOVEL);
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastRead = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Щойно';
    if (mins < 60) return `${mins} хв тому`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} год тому`;
    const days = Math.floor(hours / 24);
    return `${days} дн тому`;
  };

  return (
    <div className="min-h-screen bg-[#121316] text-neutral-200 flex flex-col">
      {/* Safe Area Notch Shield (Gray Bar at top) */}
      <TopStatusBarSpacer bgColor="#1f2127" />

      {/* Top Navbar */}
      <header
        className="sticky z-30 bg-[#16171b]/95 border-b border-[#282a33] backdrop-blur-md px-4 py-3.5 sm:px-8 flex items-center justify-between transition-all"
        style={{ marginTop: 'max(env(safe-area-inset-top, 0px), 34px)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Bookera Logo"
            className="w-8 h-8 rounded-lg object-cover shadow-md shadow-[#0d3d8a]/40 border border-[#0d3d8a]/60"
          />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Bookera</h1>
            <p className="text-[10px] text-neutral-400 font-medium">Офлайн читалка новел та книг</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2196f3] hover:bg-[#1e88e5] text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Додати книгу</span>
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
              Скасувати
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
              placeholder="Пошук за назвою або автором..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1c1d22] border border-[#2c2e37] rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#2196f3] transition-colors"
            />
          </div>

          <div className="text-xs text-neutral-400 flex items-center gap-2 self-end sm:self-center font-mono">
            <span>Всього книг: {books.length}</span>
          </div>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-[#17181d] rounded-2xl border border-[#252731]">
            <div className="w-16 h-16 rounded-full bg-[#22242d] flex items-center justify-center text-neutral-500 mb-4">
              <FileText className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-neutral-200 mb-1">
              {searchTerm ? 'Книг за вашим запитом не знайдено' : 'Ваша бібліотека порожня'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
              {searchTerm
                ? 'Спробуйте змінити пошуковий запит або скинути фільтр.'
                : 'Завантажте новелу або книгу у форматі EPUB, FB2, TXT або PDF, щоб читати офлайн.'}
            </p>

            {!searchTerm && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#2196f3] hover:bg-[#1e88e5] text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Вибрати файл з пристрою</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSample}
                  className="px-4 py-2 bg-[#23252d] hover:bg-[#2c2f3a] border border-[#343744] text-neutral-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#2196f3]" />
                  <span>Відновити приклад Re:Zero</span>
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
                  className="group relative bg-[#1c1d22] border border-[#2b2d37] hover:border-[#2196f3]/60 rounded-xl overflow-hidden cursor-pointer flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl shadow-black/40"
                >
                  {/* Book Cover */}
                  <div className="relative w-full aspect-[2/3] bg-[#242630] overflow-hidden flex items-center justify-center">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#1f2937] via-[#111827] to-[#0f172a] text-neutral-300">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-[#2196f3]">
                          Bookera
                        </div>
                        <div className="font-serif text-sm font-bold line-clamp-3 leading-snug">
                          {book.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">{book.author}</div>
                      </div>
                    )}

                    {/* Format Badge */}
                    <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-mono uppercase px-2 py-0.5 rounded text-neutral-200 border border-white/10 pointer-events-none">
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
                      title="Видалити"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info block */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-200 line-clamp-2 group-hover:text-[#2196f3] transition-colors leading-snug">
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
                        <span>Гл. {book.currentChapterIndex + 1}/{book.totalChapters}</span>
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
        onConfirm={async () => {
          if (bookToDelete) {
            await onDeleteBook(bookToDelete.id);
            setBookToDelete(null);
          }
        }}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  );
};
