import { Book, Chapter, Language } from '../../types/book';
import { t } from '../i18n';

export function parseFb2Content(fileName: string, content: string, lang: Language = 'uk'): Book {
  // 1. Extract metadata with fast regex
  const titleMatch = content.match(/<book-title[^>]*>([\s\S]*?)<\/book-title>/i);
  let title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : fileName.replace(/\.[^/.]+$/, "");

  // Author
  const firstMatch = content.match(/<author[^>]*>[\s\S]*?<first-name[^>]*>([\s\S]*?)<\/first-name>/i);
  const lastMatch = content.match(/<author[^>]*>[\s\S]*?<last-name[^>]*>([\s\S]*?)<\/last-name>/i);
  let author = t('unknownAuthor', lang);
  if (firstMatch || lastMatch) {
    const fn = firstMatch ? firstMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const ln = lastMatch ? lastMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    author = `${fn} ${ln}`.trim() || t('unknownAuthor', lang);
  }

  // 2. Extract binary images
  const imagesMap: Record<string, string> = {};
  const binaryRegex = /<binary[^>]*id=["']([^"']+)["'][^>]*content-type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/binary>/gi;
  let bMatch;
  while ((bMatch = binaryRegex.exec(content)) !== null) {
    const id = bMatch[1];
    const type = bMatch[2] || 'image/jpeg';
    const b64 = bMatch[3].replace(/\s+/g, '');
    if (id && b64) {
      imagesMap[id] = `data:${type};base64,${b64}`;
    }
  }

  // Cover image
  let coverUrl: string | undefined = undefined;
  const coverMatch = content.match(/<coverpage[^>]*>[\s\S]*?<image[^>]*[\s:](?:href|src)=["']#?([^"']+)["']/i);
  if (coverMatch && imagesMap[coverMatch[1]]) {
    coverUrl = imagesMap[coverMatch[1]];
  } else if (imagesMap['img_0']) {
    coverUrl = imagesMap['img_0'];
  } else if (imagesMap['cover']) {
    coverUrl = imagesMap['cover'];
  } else {
    const firstImg = Object.values(imagesMap)[0];
    if (firstImg) coverUrl = firstImg;
  }

  // 3. Extract main body (ignore notes body if present)
  let bodyContent = content;
  const bodyMatch = content.match(/<body(?:\s+[^>]*)?>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }

  // Strip binary section from bodyContent if any remained
  bodyContent = bodyContent.replace(/<binary[^>]*>[\s\S]*?<\/binary>/gi, '');

  // 4. Pattern for chapter headers
  const chapterRegex = /^\s*(?:глава|розділ|том|часть|частина|chapter|act|акт|эпизод|інтерлюдія|интерлюдия|пролог|эпилог|епілог)\s*[\dIVXLCDM.:\s_-]*/i;
  const isEnglish = /[a-zA-Z]{4,}/.test(title);
  const defaultPrefix = isEnglish ? 'Chapter' : t('chapter', lang);

  const itemRegex = /<(p|title|subtitle|empty-line)[^>]*>([\s\S]*?)<\/\1>|<empty-line\s*\/>/gi;

  const chapters: Chapter[] = [];
  let currentTitle = '';
  let currentParagraphs: string[] = [];
  let chOrder = 1;

  let match;
  while ((match = itemRegex.exec(bodyContent)) !== null) {
    const tag = (match[1] || 'empty-line').toLowerCase();
    const raw = match[2] || '';

    // Check for inline images
    const imgMatch = raw.match(/<image[^>]*[\s:](?:href|src)=["']#?([^"']+)["']/i);
    let paraText = '';
    if (imgMatch) {
      const imgId = imgMatch[1];
      if (imagesMap[imgId]) {
        paraText = `[IMG:${imgId}]`;
      }
    } else {
      paraText = raw
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (!paraText) continue;

    // Check if this tag or text looks like a chapter header
    const isExplicitTitleTag = tag === 'title' || tag === 'subtitle';
    const matchesHeaderRegex = chapterRegex.test(paraText) && paraText.length < 100;

    if (isExplicitTitleTag || matchesHeaderRegex) {
      if (currentParagraphs.length > 0) {
        chapters.push({
          id: `ch_${chOrder}`,
          title: currentTitle || `${defaultPrefix} ${chOrder}`,
          order: chOrder,
          content: [...currentParagraphs],
          images: imagesMap,
        });
        chOrder++;
        currentParagraphs = [];
      }
      currentTitle = paraText.substring(0, 80);
    } else {
      currentParagraphs.push(paraText);
    }
  }

  // Push remaining paragraphs
  if (currentParagraphs.length > 0) {
    chapters.push({
      id: `ch_${chOrder}`,
      title: currentTitle || `${defaultPrefix} ${chOrder}`,
      order: chOrder,
      content: currentParagraphs,
      images: imagesMap,
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'ch_1',
      title: title || (isEnglish ? 'Chapter 1' : `${t('chapter', lang)} 1`),
      order: 1,
      content: [t('statusEmptyContent', lang)],
    });
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  return {
    id: bookId,
    title,
    author,
    coverUrl,
    format: 'fb2',
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
