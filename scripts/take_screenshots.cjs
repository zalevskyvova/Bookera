const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'Screenshots');

function startServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(DIST_DIR, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // Fallback for SPA routing to index.html
        const indexPath = path.join(DIST_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      }
    });

    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

const aliceCover = '/covers/alice.png';
const sherlockCover = '/covers/sherlock.png';
const gatsbyCover = '/covers/gatsby.png';
const frankensteinCover = '/covers/frankenstein.png';

const aliceChapters = [
  {
    id: 'ch_1',
    title: 'Chapter 1: Down the Rabbit-Hole',
    order: 1,
    content: [
      "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversation?'",
      "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
      "There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.",
      "In another moment down went Alice after it, never once considering in how in the world she was to get out again.",
      "The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.",
      "Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it was labelled 'ORANGE MARMALADE', but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody underneath, so managed to put it into one of the cupboards as she fell past it.",
      "'Well!' thought Alice to herself, 'after such a fall as this, I shall think nothing of tumbling down stairs! How brave they'll all think me at home! Why, I wouldn't say anything about it, even if I fell off the top of the house!' (Which was very likely true.)",
      "Down, down, down. Would the fall never come to an end! 'I wonder how many miles I've fallen by this time?' she said aloud. 'I must be getting somewhere near the centre of the earth. Let me see: that would be four thousand miles down, I think—' (for, you see, Alice had learnt several things of this sort in her lessons in the schoolroom, and though this was not a very good opportunity for showing off her knowledge, as there was no one to listen to her, still it was good practice to say it over)."
    ]
  },
  { id: 'ch_2', title: 'Chapter 2: The Pool of Tears', order: 2, content: ['Curiouser and curiouser! cried Alice...'] },
  { id: 'ch_3', title: 'Chapter 3: A Caucus-Race and a Long Tale', order: 3, content: ['They were indeed a queer-looking party that assembled on the bank...'] },
  { id: 'ch_4', title: 'Chapter 4: The Rabbit Sends in a Little Bill', order: 4, content: ['It was the White Rabbit, trotting slowly back again...'] },
  { id: 'ch_5', title: 'Chapter 5: Advice from a Caterpillar', order: 5, content: ['The Caterpillar and Alice looked at each other for some time in silence...'] },
  { id: 'ch_6', title: 'Chapter 6: Pig and Pepper', order: 6, content: ['For a minute or two she stood looking at the house...'] },
  { id: 'ch_7', title: 'Chapter 7: A Mad Tea-Party', order: 7, content: ['There was a table set out under a tree in front of the house...'] },
  { id: 'ch_8', title: 'Chapter 8: The Queen\'s Croquet-Ground', order: 8, content: ['A large rose-tree stood near the entrance of the garden...'] },
  { id: 'ch_9', title: 'Chapter 9: The Mock Turtle\'s Story', order: 9, content: ['You can\'t think how glad I am to see you again, dear old thing! said the Duchess...'] },
  { id: 'ch_10', title: 'Chapter 10: The Lobster Quadrille', order: 10, content: ['The Mock Turtle sighed deeply, and drew the back of one flapper across his eyes...'] },
  { id: 'ch_11', title: 'Chapter 11: Who Stole the Tarts?', order: 11, content: ['The King and Queen of Hearts were seated on their throne...'] },
  { id: 'ch_12', title: 'Chapter 12: Alice\'s Evidence', order: 12, content: ['Here! cried Alice, quite forgetting in the flurry of the moment how large she had grown...'] }
];

const aliceBook = {
  id: 'book_alice_wonderland',
  title: "Alice's Adventures in Wonderland",
  author: 'Lewis Carroll',
  coverUrl: aliceCover,
  format: 'epub',
  totalChapters: 12,
  currentChapterId: 'ch_1',
  currentChapterIndex: 0,
  scrollPercentage: 14,
  currentParagraphIndex: 2,
  lastReadTimestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
  addedTimestamp: Date.now() - 1000 * 3600 * 24,
  chapters: []
};

const sherlockBook = {
  id: 'book_sherlock_holmes',
  title: 'The Adventures of Sherlock Holmes',
  author: 'Arthur Conan Doyle',
  coverUrl: sherlockCover,
  format: 'fb2',
  totalChapters: 12,
  currentChapterId: 'ch_3',
  currentChapterIndex: 2,
  scrollPercentage: 45,
  currentParagraphIndex: 12,
  lastReadTimestamp: Date.now() - 1000 * 3600 * 4, // 4 hours ago
  addedTimestamp: Date.now() - 1000 * 3600 * 48,
  chapters: []
};

const gatsbyBook = {
  id: 'book_great_gatsby',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  coverUrl: gatsbyCover,
  format: 'txt',
  totalChapters: 9,
  currentChapterId: 'ch_1',
  currentChapterIndex: 0,
  scrollPercentage: 0,
  currentParagraphIndex: 0,
  lastReadTimestamp: Date.now() - 1000 * 3600 * 24, // 1 day ago
  addedTimestamp: Date.now() - 1000 * 3600 * 72,
  chapters: []
};

const frankensteinBook = {
  id: 'book_frankenstein',
  title: 'Frankenstein',
  author: 'Mary Shelley',
  coverUrl: frankensteinCover,
  format: 'pdf',
  totalChapters: 24,
  currentChapterId: 'ch_4',
  currentChapterIndex: 3,
  scrollPercentage: 28,
  currentParagraphIndex: 5,
  lastReadTimestamp: Date.now() - 1000 * 3600 * 48, // 2 days ago
  addedTimestamp: Date.now() - 1000 * 3600 * 96,
  chapters: []
};

const sampleBookmarks = [
  {
    id: 'bm_1',
    bookId: 'book_alice_wonderland',
    chapterId: 'ch_1',
    chapterTitle: 'Chapter 1: Down the Rabbit-Hole',
    paragraphIndex: 0,
    snippet: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading...",
    timestamp: Date.now() - 1000 * 60 * 35
  },
  {
    id: 'bm_2',
    bookId: 'book_alice_wonderland',
    chapterId: 'ch_1',
    chapterTitle: 'Chapter 1: Down the Rabbit-Hole',
    paragraphIndex: 2,
    snippet: "There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!'...",
    timestamp: Date.now() - 1000 * 60 * 20
  },
  {
    id: 'bm_3',
    bookId: 'book_alice_wonderland',
    chapterId: 'ch_1',
    chapterTitle: 'Chapter 1: Down the Rabbit-Hole',
    paragraphIndex: 7,
    snippet: "Down, down, down. Would the fall never come to an end! 'I wonder how many miles I've fallen by this time?' she said aloud...",
    timestamp: Date.now() - 1000 * 60 * 5
  }
];

const appSettings = {
  fontSize: 18,
  lineHeight: 1.75,
  paragraphSpacing: 1.25,
  fontFamily: 'serif',
  colorTheme: 'dark',
  customBgColor: '#121316',
  customTextColor: '#dedede',
  sidePadding: true,
  textAlign: 'left',
  menuTrigger: 'tap',
  disableImages: false,
  hideChapterHeader: false,
  containerWidth: 100,
  language: 'en'
};

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const server = await startServer(4173);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--force-device-scale-factor=2.5',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 412,
    height: 915,
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
  });

  console.log('Navigating to http://localhost:4173 ...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  // Seed IndexedDB
  console.log('Seeding IndexedDB with books and English settings...');
  await page.evaluate(async (data) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('bookera_reader_db', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('books')) {
          const bs = db.createObjectStore('books', { keyPath: 'id' });
          bs.createIndex('by-date', 'lastReadTimestamp');
        }
        if (!db.objectStoreNames.contains('book_chapters')) {
          db.createObjectStore('book_chapters');
        }
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bms = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bms.createIndex('by-book', 'bookId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };

      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['books', 'book_chapters', 'bookmarks', 'settings'], 'readwrite');
        
        // Put settings
        tx.objectStore('settings').put(data.appSettings, 'user_settings');
        tx.objectStore('settings').put(true, 'default_colors_migrated_v5');

        // Put books
        for (const b of data.books) {
          tx.objectStore('books').put(b);
        }

        // Put Alice chapters
        tx.objectStore('book_chapters').put(data.aliceChapters, data.aliceBook.id);

        // Put bookmarks
        for (const bm of data.bookmarks) {
          tx.objectStore('bookmarks').put(bm);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = (err) => reject(err);
      };

      req.onerror = (err) => reject(err);
    });
  }, {
    appSettings,
    books: [aliceBook, sherlockBook, gatsbyBook, frankensteinBook],
    aliceBook,
    aliceChapters,
    bookmarks: sampleBookmarks
  });

  // Reload page to reflect seeded IndexedDB
  console.log('Reloading page with seeded data...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  // Wait for all images (covers and logo) to be fully loaded
  console.log('Waiting for book cover images to load...');
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = img.onerror = resolve;
        });
      })
    );
  });
  await new Promise(r => setTimeout(r, 600));

  // 1. Screenshot 01: Library View
  console.log('Capturing 01_library_view.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01_library_view.png'),
    type: 'png'
  });

  // Open Alice in Wonderland
  console.log('Opening Alice in Wonderland...');
  const aliceCard = await page.waitForSelector('h4');
  await aliceCard.click();
  await new Promise(r => setTimeout(r, 600));

  // Ensure bars are hidden for clean reading mode
  await page.evaluate(() => {
    // If top bar is visible (has translate-y-0), click canvas to hide
    const topBar = document.querySelector('div.fixed.left-0.right-0');
    if (topBar && topBar.className.includes('translate-y-0')) {
      const p = document.querySelector('p#p-1') || document.body;
      p.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));

  // 2. Screenshot 02: Reader View
  console.log('Capturing 02_reader_view.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02_reader_view.png'),
    type: 'png'
  });

  // Click canvas to show floating bars
  console.log('Toggling floating bars...');
  await page.evaluate(() => {
    const p = document.querySelector('p#p-1') || document.body;
    p.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 3. Screenshot 03: Reader Menus
  console.log('Capturing 03_reader_menus.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '03_reader_menus.png'),
    type: 'png'
  });

  // 4. Open Table of Contents Drawer
  console.log('Opening Table of Contents Drawer...');
  const tocBtn = await page.waitForSelector('button[title="Table of contents"], button[title="Зміст"]');
  await tocBtn.click();
  await new Promise(r => setTimeout(r, 600));

  console.log('Capturing 04_table_of_contents.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '04_table_of_contents.png'),
    type: 'png'
  });

  // Close TOC drawer using its header close button
  console.log('Closing TOC drawer...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fixed.inset-0.z-50 button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 5. Open Reader Settings Modal
  console.log('Opening Reader Settings Modal...');
  const settingsBtn = await page.waitForSelector('button[title="Settings"], button[title="Налаштування"]');
  await settingsBtn.click();
  await new Promise(r => setTimeout(r, 600));

  console.log('Capturing 05_reader_settings.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '05_reader_settings.png'),
    type: 'png'
  });

  // Close settings modal
  console.log('Closing Settings modal...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fixed.inset-0.z-50 button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // 6. Open Bookmarks Drawer
  console.log('Opening Bookmarks Drawer...');
  const bookmarksBtn = await page.waitForSelector('button[title="Bookmarks list"], button[title="Список закладок"]');
  await bookmarksBtn.click();
  await new Promise(r => setTimeout(r, 600));

  console.log('Capturing 06_bookmarks_drawer.png ...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '06_bookmarks_drawer.png'),
    type: 'png'
  });

  console.log('All screenshots captured successfully!');
  await browser.close();
  server.close();
}

main().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
