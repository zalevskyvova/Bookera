export interface Chapter {
  id: string;
  title: string;
  order: number;
  content: string[]; // array of paragraphs or HTML strings
  images?: Record<string, string>; // base64 images referenced by paragraphs
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  paragraphIndex: number;
  snippet: string;
  timestamp: number;
  scrollPercentage?: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  format: 'epub' | 'fb2' | 'txt' | 'pdf' | 'custom';
  totalChapters: number;
  currentChapterId: string;
  currentChapterIndex: number;
  scrollPercentage: number;
  currentParagraphIndex: number;
  lastReadTimestamp: number;
  addedTimestamp: number;
  chapters: Chapter[];
}

export type ThemePreset = 'white' | 'light' | 'sepia' | 'parchment' | 'slate' | 'black';

export type Language = 'uk' | 'en' | 'ru';

export interface ReaderSettings {
  language: Language;
  theme: ThemePreset;
  customBgColor: string;
  customTextColor: string;
  sidePadding: boolean; // "Отступ: Включен | Выключен"
  textAlign: 'left' | 'justify'; // "Выравнивание текста: По левому краю | По ширине"
  menuTrigger: 'tap' | 'scroll'; // "Показать или скрыть меню: Нажатием | Скроллом"
  fontFamily: 'default' | 'serif' | 'sans-serif' | 'georgia' | 'pt-serif' | 'monospace';
  disableImages: boolean; // "Отключить изображения для экономии трафика"
  hideChapterHeader: boolean; // "Отключить номер и название главы"
  fontSize: number; // in px, e.g. 16
  lineHeight: number; // multiplier, e.g. 1.6
  paragraphSpacing: number; // in px, e.g. 10
  containerWidth: number; // percentage, e.g. 100
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  language: 'uk',
  theme: 'black',
  customBgColor: '#0a0a0a',
  customTextColor: '#bdbdbd',
  sidePadding: true,
  textAlign: 'left',
  menuTrigger: 'tap',
  fontFamily: 'default',
  disableImages: false,
  hideChapterHeader: false,
  fontSize: 16,
  lineHeight: 1.6,
  paragraphSpacing: 12,
  containerWidth: 100,
};

export const THEME_PALETTES: Record<ThemePreset, { bg: string; text: string; name: string }> = {
  white: { bg: '#ffffff', text: '#111111', name: 'Біла' },
  light: { bg: '#f5f5f7', text: '#212121', name: 'Світло-сіра' },
  sepia: { bg: '#fbf0d9', text: '#3c2c1e', name: 'Сепія' },
  parchment: { bg: '#e8d8b8', text: '#382b1d', name: 'Бежева' },
  slate: { bg: '#0a0a0a', text: '#c8c2b8', name: 'Темна кремова' },
  black: { bg: '#0a0a0a', text: '#bdbdbd', name: 'Темна' },
};
