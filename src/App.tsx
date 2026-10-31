import { useState, useEffect, useCallback } from 'react';
import { Book, ReaderSettings, DEFAULT_SETTINGS } from './types/book';
import {
  getAllBooks,
  getBookWithChapters,
  saveBook,
  deleteBook,
  loadSettings,
  saveSettings,
} from './services/storage';
import { t } from './services/i18n';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';

export function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize books and settings
  const refreshBooks = useCallback(async () => {
    const list = await getAllBooks();
    setBooks(list);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [loadedSettings] = await Promise.all([loadSettings(), refreshBooks()]);
        setSettings(loadedSettings);
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, [refreshBooks]);

  const handleOpenBook = async (book: Book) => {
    if (book.chapters && book.chapters.length > 0) {
      setActiveBook(book);
      return;
    }
    const fullBook = await getBookWithChapters(book.id);
    if (fullBook) {
      setActiveBook(fullBook);
    }
  };

  const handleBackToLibrary = async () => {
    const [latestSettings, list] = await Promise.all([loadSettings(), getAllBooks()]);
    setSettings(latestSettings);
    setBooks(list);
    setActiveBook(null);
  };

  const handleUpdateSettings = async (newSettings: ReaderSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleAddBook = async (newBook: Book) => {
    await saveBook(newBook);
    await refreshBooks();
    setActiveBook(newBook);
  };

  const handleDeleteBook = async (bookId: string) => {
    await deleteBook(bookId);
    await refreshBooks();
    if (activeBook?.id === bookId) {
      setActiveBook(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="w-full h-screen bg-[#0a0a0a] text-neutral-300 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Bookera"
            className="w-16 h-16 rounded-2xl shadow-xl shadow-[#0d3d8a]/40 border border-[#1e58b8]/30 animate-pulse object-contain"
          />
          <p className="text-xs font-mono text-neutral-400">{t('initializing', settings.language)}</p>
        </div>
      </div>
    );
  }

  if (activeBook) {
    return (
      <ReaderView
        book={activeBook}
        onBack={handleBackToLibrary}
        initialSettings={settings}
      />
    );
  }

  return (
    <LibraryView
      books={books}
      settings={settings}
      onUpdateSettings={handleUpdateSettings}
      onOpenBook={handleOpenBook}
      onAddBook={handleAddBook}
      onDeleteBook={handleDeleteBook}
    />
  );
}

export default App;
