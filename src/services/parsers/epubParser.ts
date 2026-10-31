import JSZip from 'jszip';
import { Book, Chapter } from '../../types/book';

export async function parseEpubFile(
  fileName: string,
  fileData: ArrayBuffer,
  checkCancelled?: () => boolean,
  onProgress?: (current: number, total: number) => void
): Promise<Book> {
  const zip = await JSZip.loadAsync(fileData);

  // 1. Find rootfile in container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Невалідний EPUB: відсутній META-INF/container.xml');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'text/xml');
  const rootfileEl = containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');
  if (!opfPath) {
    throw new Error('Не знайдено full-path в container.xml');
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Read OPF file
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) {
    throw new Error(`Не вдалося завантажити OPF файл: ${opfPath}`);
  }

  const opfDoc = parser.parseFromString(opfXml, 'text/xml');

  // Metadata
  const title = opfDoc.querySelector('metadata > title, metadata > dc\\:title')?.textContent?.trim() ||
    fileName.replace(/\.[^/.]+$/, "");
  const author = opfDoc.querySelector('metadata > creator, metadata > dc\\:creator')?.textContent?.trim() ||
    'Невідомий автор';

  // Manifest items map: id -> { href, mediaType }
  const manifest: Record<string, { href: string; mediaType: string }> = {};
  const itemEls = opfDoc.querySelectorAll('manifest > item');
  itemEls.forEach((el) => {
    const id = el.getAttribute('id');
    const href = el.getAttribute('href');
    const mediaType = el.getAttribute('media-type');
    if (id && href && mediaType) {
      manifest[id] = { href, mediaType };
    }
  });

  // Extract cover image if available
  let coverUrl: string | undefined = undefined;
  const coverMeta = opfDoc.querySelector('metadata > meta[name="cover"]');
  const coverId = coverMeta?.getAttribute('content') || 'cover' || 'cover-image';
  const coverItem = manifest[coverId] || Object.values(manifest).find(m => m.href.toLowerCase().includes('cover'));

  if (coverItem) {
    const fullCoverPath = opfDir + coverItem.href;
    const coverFile = zip.file(fullCoverPath) || zip.file(coverItem.href);
    if (coverFile) {
      const base64 = await coverFile.async('base64');
      coverUrl = `data:${coverItem.mediaType};base64,${base64}`;
    }
  }

  // Pre-load images to map for chapter inline references
  const imagesMap: Record<string, string> = {};
  for (const item of Object.values(manifest)) {
    if (item.mediaType.startsWith('image/')) {
      const fullImgPath = opfDir + item.href;
      const imgFile = zip.file(fullImgPath) || zip.file(item.href);
      if (imgFile) {
        const base64 = await imgFile.async('base64');
        imagesMap[item.href] = `data:${item.mediaType};base64,${base64}`;
        // Also map just filename
        const fn = item.href.split('/').pop();
        if (fn) imagesMap[fn] = `data:${item.mediaType};base64,${base64}`;
      }
    }
  }

  // 3. Spine (reading order)
  const spineItems = opfDoc.querySelectorAll('spine > itemref');
  const chapters: Chapter[] = [];
  let chIndex = 1;

  for (let i = 0; i < spineItems.length; i++) {
    if (checkCancelled && checkCancelled()) {
      throw new Error('Сканування скасовано користувачем');
    }
    if (onProgress && i % 3 === 0) {
      onProgress(i + 1, spineItems.length);
    }
    const idref = spineItems[i].getAttribute('idref');
    if (!idref || !manifest[idref]) continue;

    const href = manifest[idref].href;
    const fullChapterPath = opfDir + href;
    const chapterFile = zip.file(fullChapterPath) || zip.file(href);
    if (!chapterFile) continue;

    const chapterHtml = await chapterFile.async('text');
    const doc = parser.parseFromString(chapterHtml, 'text/html');

    const chapterRegex = /^\s*(?:глава|розділ|том|часть|частина|chapter|act|акт|эпизод|інтерлюдія|интерлюдия|пролог|эпилог|епілог)\s*[\dIVXLCDM.:\s_-]*/i;

    let chapterTitle = doc.querySelector('h1, h2, h3, title')?.textContent?.trim() || `Розділ ${chIndex}`;
    chapterTitle = chapterTitle.replace(/\s+/g, ' ').substring(0, 80);

    let paragraphs: string[] = [];
    const elements = doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, img');

    elements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        const src = el.getAttribute('src');
        if (src) {
          const fn = src.split('/').pop() || '';
          if (imagesMap[fn] || imagesMap[src]) {
            paragraphs.push(`[IMG:${fn}]`);
          }
        }
      } else {
        const text = el.textContent?.trim();
        if (text && text.length > 0) {
          const isHeading =
            (tag === 'h1' || tag === 'h2' || chapterRegex.test(text)) &&
            text.length < 100 &&
            !text.includes(',') &&
            !text.endsWith('.');

          if (isHeading && paragraphs.length > 0) {
            chapters.push({
              id: `ch_${chIndex}`,
              title: chapterTitle,
              order: chIndex,
              content: [...paragraphs],
              images: imagesMap,
            });
            chIndex++;
            paragraphs = [];
            chapterTitle = text.replace(/\s+/g, ' ').substring(0, 80);
          } else {
            paragraphs.push(text);
          }
        }
      }
    });

    if (paragraphs.length > 0) {
      chapters.push({
        id: `ch_${chIndex}`,
        title: chapterTitle,
        order: chIndex,
        content: paragraphs,
        images: imagesMap,
      });
      chIndex++;
    }
  }

  if (chapters.length === 0) {
    chapters.push({
      id: 'ch_1',
      title: title,
      order: 1,
      content: ['Вміст книги не знайдено або порожній.'],
    });
  }

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  return {
    id: bookId,
    title,
    author,
    coverUrl,
    format: 'epub',
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
