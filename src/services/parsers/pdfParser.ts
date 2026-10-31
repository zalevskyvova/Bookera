import * as pdfjsLib from 'pdfjs-dist';
import { Book, Chapter } from '../../types/book';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function parsePdfFile(
  fileName: string,
  arrayBuffer: ArrayBuffer,
  checkCancelled?: () => boolean,
  onProgress?: (current: number, total: number) => void
): Promise<Book> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const title = fileName.replace(/\.[^/.]+$/, "");
  const chapters: Chapter[] = [];

  // Group pages into chapters (e.g. 5-10 pages per section, or 1 page = 1 section if few pages)
  const pagesPerChapter = numPages > 50 ? 5 : 1;

  let currentChapterParagraphs: string[] = [];
  let currentChapterNum = 1;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (checkCancelled && checkCancelled()) {
      loadingTask.destroy();
      throw new Error('Сканування скасовано користувачем');
    }

    if (onProgress && pageNum % 2 === 0) {
      onProgress(pageNum, numPages);
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items into lines and paragraphs
    let lastY: number | null = null;
    let currentLine = '';
    const pageLines: string[] = [];

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const y = textItem.transform[5];
        
        if (lastY !== null && Math.abs(y - lastY) > 8) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = textItem.str;
        } else {
          currentLine += (currentLine ? ' ' : '') + textItem.str;
        }
        lastY = y;
      }
    }
    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    if (pageLines.length > 0) {
      currentChapterParagraphs.push(...pageLines);
    }

    if (pageNum % pagesPerChapter === 0 || pageNum === numPages) {
      if (currentChapterParagraphs.length > 0) {
        const startPage = pageNum - (pageNum % pagesPerChapter || pagesPerChapter) + 1;
        const chTitle = pagesPerChapter === 1 ? `Сторінка ${pageNum}` : `Сторінки ${startPage} - ${pageNum}`;
        
        chapters.push({
          id: `ch_${currentChapterNum}`,
          title: chTitle,
          order: currentChapterNum,
          content: [...currentChapterParagraphs],
        });
        currentChapterNum++;
        currentChapterParagraphs = [];
      }
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'ch_1',
      title: 'Вміст',
      order: 1,
      content: ['Не вдалося вилучити текстовий шар із PDF файлу.'],
    });
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  return {
    id: bookId,
    title,
    author: 'PDF Документ',
    format: 'pdf',
    totalChapters: chapters.length,
    currentChapterId: chapters[0].id,
    currentChapterIndex: 0,
    scrollPercentage: 0,
    currentParagraphIndex: 0,
    lastReadTimestamp: Date.now(),
    addedTimestamp: Date.now(),
    chapters,
  };
}
