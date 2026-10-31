import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Book, Chapter, Bookmark, ReaderSettings, DEFAULT_SETTINGS } from '../types/book';

interface BookeraDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { 'by-date': number };
  };
  book_chapters: {
    key: string;
    value: Chapter[];
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { 'by-book': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'bookera_reader_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<BookeraDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<BookeraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('by-date', 'lastReadTimestamp');
        }
        if (!db.objectStoreNames.contains('book_chapters')) {
          db.createObjectStore('book_chapters');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarkStore.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  const books = await db.getAllFromIndex('books', 'by-date');

  // Seamless migration for books stored in v1 with inline chapters
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    if (b.chapters && b.chapters.length > 0) {
      await db.put('book_chapters', b.chapters, b.id);
      const lightweightBook: Book = { ...b, chapters: [] };
      await db.put('books', lightweightBook);
      books[i] = lightweightBook;
    }
  }

  return books.reverse();
}

export async function getBookWithChapters(id: string): Promise<Book | undefined> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (!book) return undefined;

  if (book.chapters && book.chapters.length > 0) {
    return book;
  }

  const chapters = await db.get('book_chapters', id);
  return {
    ...book,
    chapters: chapters || [],
  };
}

export async function saveBook(book: Book): Promise<void> {
  const db = await getDB();
  const chapters = book.chapters || [];
  const lightweightBook: Book = {
    ...book,
    chapters: [],
  };

  const tx = db.transaction(['books', 'book_chapters'], 'readwrite');
  await tx.objectStore('books').put(lightweightBook);
  await tx.objectStore('book_chapters').put(chapters, book.id);
  await tx.done;
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['books', 'book_chapters', 'bookmarks'], 'readwrite');
  await tx.objectStore('books').delete(id);
  await tx.objectStore('book_chapters').delete(id);

  const bookmarkIndex = tx.objectStore('bookmarks').index('by-book');
  let cursor = await bookmarkIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function updateReadingProgress(
  bookId: string,
  chapterId: string,
  chapterIndex: number,
  scrollPercentage: number,
  paragraphIndex: number
): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', bookId);
  if (!book) return;

  book.currentChapterId = chapterId;
  book.currentChapterIndex = chapterIndex;
  book.scrollPercentage = scrollPercentage;
  book.currentParagraphIndex = paragraphIndex;
  book.lastReadTimestamp = Date.now();

  // Ensure we only write lightweight metadata
  if (book.chapters && book.chapters.length > 0) {
    await db.put('book_chapters', book.chapters, bookId);
    book.chapters = [];
  }

  await db.put('books', book);
}

export async function getBookmarksForBook(bookId: string): Promise<Bookmark[]> {
  const db = await getDB();
  const bookmarks = await db.getAllFromIndex('bookmarks', 'by-book', bookId);
  bookmarks.sort((a, b) => b.timestamp - a.timestamp);

  // Deduplicate bookmarks at the same chapter + paragraph
  const seen = new Set<string>();
  const unique: Bookmark[] = [];
  const duplicateIds: string[] = [];

  for (const bm of bookmarks) {
    const key = `${bm.chapterId}_${bm.paragraphIndex}`;
    if (seen.has(key)) {
      duplicateIds.push(bm.id);
    } else {
      seen.add(key);
      unique.push(bm);
    }
  }

  if (duplicateIds.length > 0) {
    const tx = db.transaction('bookmarks', 'readwrite');
    for (const dupId of duplicateIds) {
      await tx.store.delete(dupId);
    }
    await tx.done;
  }

  return unique;
}

export async function addBookmark(bookmark: Bookmark): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getAllFromIndex('bookmarks', 'by-book', bookmark.bookId);
  const duplicate = existing.find(
    (b) => b.chapterId === bookmark.chapterId && b.paragraphIndex === bookmark.paragraphIndex
  );
  if (duplicate) {
    return false;
  }
  await db.put('bookmarks', bookmark);
  return true;
}

export async function removeBookmark(bookmarkId: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', bookmarkId);
}

export async function isDemoInitialized(): Promise<boolean> {
  const db = await getDB();
  const val = await db.get('settings', 'demo_initialized');
  return Boolean(val);
}

export async function markDemoInitialized(): Promise<void> {
  const db = await getDB();
  await db.put('settings', true, 'demo_initialized');
}

export async function loadSettings(): Promise<ReaderSettings> {
  const db = await getDB();
  const saved = (await db.get('settings', 'user_settings')) as ReaderSettings | undefined;
  if (!saved) return DEFAULT_SETTINGS;

  const migratedV5 = await db.get('settings', 'default_colors_migrated_v5');
  const merged: ReaderSettings = { ...DEFAULT_SETTINGS, ...saved };

  // Ensure hex colors always start with '#'
  if (merged.customBgColor && !merged.customBgColor.startsWith('#')) {
    merged.customBgColor = '#' + merged.customBgColor.replace(/[^0-9a-fA-F]/g, '');
  }
  if (merged.customTextColor && !merged.customTextColor.startsWith('#')) {
    merged.customTextColor = '#' + merged.customTextColor.replace(/[^0-9a-fA-F]/g, '');
  }

  if (!migratedV5) {
    const bgLower = merged.customBgColor.toLowerCase();
    const textLower = merged.customTextColor.toLowerCase();
    if (bgLower === '#000000' || bgLower === '#141414') {
      merged.customBgColor = '#0a0a0a';
    }
    if (textLower === '#ffffff' || textLower === '#dddddd' || textLower === '#d4d4d4') {
      merged.customTextColor = '#bdbdbd';
    }
    await db.put('settings', merged, 'user_settings');
    await db.put('settings', true, 'default_colors_migrated_v5');
  }

  return merged;
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'user_settings');
}
