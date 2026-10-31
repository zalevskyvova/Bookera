import { Book, Chapter } from '../../types/book';

export function parseTxtContent(fileName: string, content: string): Book {
  const lines = content.split(/\r?\n/);
  const title = fileName.replace(/\.[^/.]+$/, "");
  
  // Chapter detection patterns for light novels, web novels, books
  const chapterRegex = /^\s*(?:глава|розділ|том|часть|частина|chapter|act|акт|эпизод|інтерлюдія|интерлюдия|пролог|эпилог|епілог)\s*[\dIVXLCDM.:\s_-]*/i;
  
  const isEnglish = /[a-zA-Z]{4,}/.test(title + ' ' + content.slice(0, 500));
  const defaultPrefix = isEnglish ? 'Chapter' : 'Глава';
  
  const chapters: Chapter[] = [];
  let currentChapterTitle = "";
  let currentParagraphs: string[] = [];
  let chapterIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line looks like a chapter header
    if (chapterRegex.test(line) && line.length < 120) {
      if (currentParagraphs.length > 0) {
        chapters.push({
          id: `ch_${chapterIndex}`,
          title: currentChapterTitle || `${defaultPrefix} ${chapterIndex}`,
          order: chapterIndex,
          content: [...currentParagraphs],
        });
        chapterIndex++;
        currentParagraphs = [];
      }
      currentChapterTitle = line;
    } else {
      currentParagraphs.push(line);
    }
  }

  // Push the final chapter
  if (currentParagraphs.length > 0) {
    chapters.push({
      id: `ch_${chapterIndex}`,
      title: currentChapterTitle || `${defaultPrefix} ${chapterIndex}`,
      order: chapterIndex,
      content: currentParagraphs,
    });
  }

  // If no chapters were recognized by regex, split into chunks of ~50 paragraphs
  if (chapters.length <= 1 && currentParagraphs.length > 60) {
    const chunkedChapters: Chapter[] = [];
    const chunkSize = 50;
    const allParas = chapters.length === 1 ? chapters[0].content : currentParagraphs;
    
    for (let c = 0; c < allParas.length; c += chunkSize) {
      const chunk = allParas.slice(c, c + chunkSize);
      const chNum = Math.floor(c / chunkSize) + 1;
      chunkedChapters.push({
        id: `ch_${chNum}`,
        title: isEnglish ? `Part ${chNum}` : `Частина ${chNum}`,
        order: chNum,
        content: chunk,
      });
    }
    chapters.splice(0, chapters.length, ...chunkedChapters);
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'ch_1',
      title: title || (isEnglish ? 'Chapter 1' : 'Глава 1'),
      order: 1,
      content: [isEnglish ? 'No text content found.' : 'Текст відсутній або порожній.'],
    });
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  return {
    id: bookId,
    title,
    author: 'Невідомий автор',
    format: 'txt',
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
