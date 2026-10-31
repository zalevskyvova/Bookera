import { useState, useEffect, useCallback } from 'react';
import { Book, ReaderSettings, DEFAULT_SETTINGS } from './types/book';
import {
  getAllBooks,
  getBookWithChapters,
  saveBook,
  deleteBook,
  loadSettings,
  isDemoInitialized,
  markDemoInitialized,
} from './services/storage';
import { SAMPLE_NOVEL } from './services/sampleNovel';
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
    const demoInit = await isDemoInitialized();
    if (list.length === 0 && !demoInit) {
      // First run only: save demo novel
      await saveBook(SAMPLE_NOVEL);
      await markDemoInitialized();
      setBooks([{ ...SAMPLE_NOVEL, chapters: [] }]);
    } else {
      setBooks(list);
    }
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
    const [latestSettings] = await Promise.all([loadSettings(), refreshBooks()]);
    setSettings(latestSettings);
    setActiveBook(null);
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
            className="w-14 h-14 rounded-2xl shadow-xl shadow-[#0d3d8a]/30 animate-pulse"
          />
          <p className="text-xs font-mono text-neutral-400">Ініціалізація Bookera...</p>
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
      onOpenBook={handleOpenBook}
      onAddBook={handleAddBook}
      onDeleteBook={handleDeleteBook}
    />
  );
}

export default App;
