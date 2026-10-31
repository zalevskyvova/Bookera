const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const JSZip = require('jszip');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

function startServer(port = 4174) {
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
      resolve(server);
    });

    server.on('error', reject);
  });
}

// Generate realistic mock books
function generateMockFb2(chapterCount = 50, paragraphsPerChapter = 40) {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink">
  <description>
    <title-info>
      <genre>sf</genre>
      <author><first-name>Arthur</first-name><last-name>Conan Doyle</last-name></author>
      <book-title>Benchmark FictionBook Novel</book-title>
      <lang>en</lang>
    </title-info>
  </description>
  <body>`;

  for (let ch = 1; ch <= chapterCount; ch++) {
    xml += `
    <section>
      <title><p>Chapter ${ch}: The Awakening of Sector ${ch}</p></title>`;
    for (let p = 1; p <= paragraphsPerChapter; p++) {
      xml += `<p>This is paragraph number ${p} of chapter ${ch}. The character explored the intricate labyrinth of the ancient archive, looking for traces of the lost civilization.</p>`;
    }
    xml += `</section>`;
  }

  xml += `
  </body>
  <binary id="cover.jpg" content-type="image/jpeg">/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=</binary>
</FictionBook>`;

  return xml;
}

function generateMockTxt(chapterCount = 50, paragraphsPerChapter = 50) {
  let txt = `Benchmark Plain Text Novel\nby Classic Author\n\n`;
  for (let ch = 1; ch <= chapterCount; ch++) {
    txt += `Chapter ${ch}: The Great Journey Forward\n\n`;
    for (let p = 1; p <= paragraphsPerChapter; p++) {
      txt += `Paragraph ${p}: In the silence of the twilight, the expedition prepared their equipment for the final ascent through the mist.\n\n`;
    }
  }
  return txt;
}

async function generateMockEpubZip(chapterCount = 25) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  let manifestItems = '';
  let spineItems = '';

  for (let i = 1; i <= chapterCount; i++) {
    const fn = `ch_${i}.xhtml`;
    manifestItems += `<item id="ch${i}" href="${fn}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `<itemref idref="ch${i}"/>\n`;

    let chContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter ${i}</title></head>
<body>
<h1>Chapter ${i}: The Chronicles of Horizon</h1>`;
    for (let p = 1; p <= 30; p++) {
      chContent += `<p>Paragraph ${p}: Continuous observations indicated subtle shifts in the magnetic field surrounding the perimeter.</p>`;
    }
    chContent += `</body></html>`;
    zip.file(`OEBPS/${fn}`, chContent);
  }

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>EPUB Benchmark Volume</dc:title>
    <dc:creator>Lewis Carroll</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', opf);
  return await zip.generateAsync({ type: 'arraybuffer' });
}

async function runBenchmarks() {
  console.log('='.repeat(65));
  console.log('       BOOKERA AUTOMATED PERFORMANCE BENCHMARK SUITE       ');
  console.log('='.repeat(65));

  const results = [];

  // --- 1. Parser Benchmarks in Node / Browser Environment ---
  const fb2Xml = generateMockFb2(60, 40); // 60 chapters, 2,400 paragraphs
  const fb2SizeKb = (Buffer.byteLength(fb2Xml, 'utf8') / 1024).toFixed(1);
  console.log(`\n[1/3] Benchmarking Streaming File Parsers...`);
  console.log(`- Generated FB2 dataset: ${fb2SizeKb} KB (60 chapters, 2400 paragraphs)`);

  const txtData = generateMockTxt(60, 50); // 60 chapters, 3000 paragraphs
  const txtSizeKb = (Buffer.byteLength(txtData, 'utf8') / 1024).toFixed(1);
  console.log(`- Generated TXT dataset: ${txtSizeKb} KB (60 chapters, 3000 paragraphs)`);

  console.log(`- Generating EPUB dataset in memory (25 chapters)...`);
  const epubBuffer = await generateMockEpubZip(25);
  const epubSizeKb = (epubBuffer.byteLength / 1024).toFixed(1);
  console.log(`- Generated EPUB dataset: ${epubSizeKb} KB`);

  // Start HTTP server for Puppeteer client-side benchmarks
  const server = await startServer(4174);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2.5']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.5 });

  // 1. Measure Initial Load & FCP
  console.log(`\n[2/3] Measuring Mobile Client Cold Startup (Xiaomi 14T Pro 412x915)...`);
  const tStart = Date.now();
  await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });
  const loadDuration = Date.now() - tStart;

  const perfMetrics = await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    return {
      domInteractive: Math.round(timing.domInteractive),
      domContentLoaded: Math.round(timing.domContentLoadedEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      duration: Math.round(timing.duration)
    };
  });

  results.push({
    category: 'Startup & Cold Launch',
    metric: 'First Contentful Paint (FCP)',
    value: `${perfMetrics.fcp || loadDuration} ms`,
    benchmark: '< 800 ms',
    passed: (perfMetrics.fcp || loadDuration) < 800
  });

  results.push({
    category: 'Startup & Cold Launch',
    metric: 'DOM Interactive & Hydration',
    value: `${perfMetrics.domInteractive} ms`,
    benchmark: '< 500 ms',
    passed: perfMetrics.domInteractive < 500
  });

  // 2. Client-side Parsing Benchmark inside Browser Sandbox
  console.log(`\n[3/3] Running In-Browser Stress Benchmarks...`);

  const parserResults = await page.evaluate(async (data) => {
    // Dynamic import of parsers from built chunks
    const fb2Module = await import('/assets/fb2Parser-CYuWytms.js');
    const txtModule = await import('/assets/txtParser-D1eyBaGq.js');
    const epubModule = await import('/assets/epubParser-BxnTljsi.js');

    // FB2 Parse Benchmark
    const tFb2Start = performance.now();
    const fb2Book = fb2Module.parseFb2Content('benchmark.fb2', data.fb2Xml);
    const fb2Time = performance.now() - tFb2Start;

    // TXT Parse Benchmark
    const tTxtStart = performance.now();
    const txtBook = txtModule.parseTxtContent('benchmark.txt', data.txtData);
    const txtTime = performance.now() - tTxtStart;

    // EPUB Parse Benchmark (convert base64 back to ArrayBuffer)
    const binaryString = atob(data.epubBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const tEpubStart = performance.now();
    const epubBook = await epubModule.parseEpubFile('benchmark.epub', bytes.buffer);
    const epubTime = performance.now() - tEpubStart;

    return {
      fb2: { time: Math.round(fb2Time), chapters: fb2Book.chapters.length },
      txt: { time: Math.round(txtTime), chapters: txtBook.chapters.length },
      epub: { time: Math.round(epubTime), chapters: epubBook.chapters.length }
    };
  }, {
    fb2Xml,
    txtData,
    epubBase64: Buffer.from(epubBuffer).toString('base64')
  });

  results.push({
    category: 'Format Parsers',
    metric: 'FB2 Regex Parser (60 ch, 2400 para)',
    value: `${parserResults.fb2.time} ms (${parserResults.fb2.chapters} ch)`,
    benchmark: '< 150 ms',
    passed: parserResults.fb2.time < 150
  });

  results.push({
    category: 'Format Parsers',
    metric: 'TXT Regex Splitter (60 ch, 3000 lines)',
    value: `${parserResults.txt.time} ms (${parserResults.txt.chapters} ch)`,
    benchmark: '< 100 ms',
    passed: parserResults.txt.time < 100
  });

  results.push({
    category: 'Format Parsers',
    metric: 'EPUB Streaming Parser (25 zip ch)',
    value: `${parserResults.epub.time} ms (${parserResults.epub.chapters} ch)`,
    benchmark: '< 300 ms',
    passed: parserResults.epub.time < 300
  });

  // 3. IndexedDB Architecture Benchmark: Decoupled Metadata vs Large Payload
  const idbResults = await page.evaluate(async () => {
    // Open DB
    const dbReq = indexedDB.open('bookera_reader_db', 2);
    const db = await new Promise((res, rej) => {
      dbReq.onsuccess = () => res(dbReq.result);
      dbReq.onerror = () => rej(dbReq.error);
    });

    // Create 100 mock chapters
    const chapters = [];
    for (let i = 1; i <= 100; i++) {
      chapters.push({
        id: `ch_${i}`,
        title: `Chapter ${i}`,
        order: i,
        content: new Array(50).fill("A fast, high-performance offline reader test paragraph.")
      });
    }

    const testBook = {
      id: 'perf_test_book',
      title: 'Performance Benchmark Novel',
      author: 'Tester',
      format: 'epub',
      totalChapters: 100,
      currentChapterId: 'ch_1',
      currentChapterIndex: 0,
      scrollPercentage: 0,
      currentParagraphIndex: 0,
      lastReadTimestamp: Date.now(),
      addedTimestamp: Date.now(),
      chapters: []
    };

    // Benchmark 1: Write Decoupled Book + 100 Chapters to IndexedDB
    const tWriteStart = performance.now();
    const tx1 = db.transaction(['books', 'book_chapters'], 'readwrite');
    tx1.objectStore('books').put(testBook);
    tx1.objectStore('book_chapters').put(chapters, testBook.id);
    await new Promise((res) => { tx1.oncomplete = res; });
    const writeTime = performance.now() - tWriteStart;

    // Benchmark 2: Fetch Lightweight Book Metadata
    const tMetaStart = performance.now();
    const tx2 = db.transaction('books', 'readonly');
    const metaReq = tx2.objectStore('books').get(testBook.id);
    await new Promise((res) => { tx2.oncomplete = res; });
    const metaTime = performance.now() - tMetaStart;

    // Benchmark 3: Fetch Full Chapter Array (100 chapters)
    const tChStart = performance.now();
    const tx3 = db.transaction('book_chapters', 'readonly');
    const chReq = tx3.objectStore('book_chapters').get(testBook.id);
    await new Promise((res) => { tx3.oncomplete = res; });
    const chTime = performance.now() - tChStart;

    // Benchmark 4: 50 Rapid Progress Updates (Scrolling Simulation)
    const tProgStart = performance.now();
    for (let p = 1; p <= 50; p++) {
      const txProg = db.transaction('books', 'readwrite');
      testBook.scrollPercentage = p * 2;
      testBook.currentParagraphIndex = p;
      testBook.lastReadTimestamp = Date.now();
      txProg.objectStore('books').put(testBook);
      await new Promise((res) => { txProg.oncomplete = res; });
    }
    const prog50Time = performance.now() - tProgStart;

    return {
      writeTime: Math.round(writeTime),
      metaTime: Math.round(metaTime * 10) / 10,
      chTime: Math.round(chTime * 10) / 10,
      prog50Time: Math.round(prog50Time),
      avgProgUpdate: Math.round((prog50Time / 50) * 10) / 10
    };
  });

  results.push({
    category: 'IndexedDB Decoupled Engine',
    metric: 'Save Book & 100 Chapters Transaction',
    value: `${idbResults.writeTime} ms`,
    benchmark: '< 80 ms',
    passed: idbResults.writeTime < 80
  });

  results.push({
    category: 'IndexedDB Decoupled Engine',
    metric: 'Fetch Metadata Only Latency',
    value: `${idbResults.metaTime} ms`,
    benchmark: '< 5 ms',
    passed: idbResults.metaTime < 5
  });

  results.push({
    category: 'IndexedDB Decoupled Engine',
    metric: 'Fetch 100 Chapters Payload',
    value: `${idbResults.chTime} ms`,
    benchmark: '< 20 ms',
    passed: idbResults.chTime < 20
  });

  results.push({
    category: 'IndexedDB Decoupled Engine',
    metric: '50 Rapid Progress Updates (Scroll)',
    value: `${idbResults.prog50Time} ms (${idbResults.avgProgUpdate} ms/update)`,
    benchmark: '< 300 ms total',
    passed: idbResults.prog50Time < 300
  });

  // 4. Memory Heap Usage
  const heap = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedMB: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024) * 10) / 10,
        totalMB: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024) * 10) / 10,
        limitMB: Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024))
      };
    }
    return null;
  });

  if (heap) {
    results.push({
      category: 'Memory & Resource Consumption',
      metric: 'Active JS Heap Footprint',
      value: `${heap.usedMB} MB (Allocated: ${heap.totalMB} MB)`,
      benchmark: '< 50 MB',
      passed: heap.usedMB < 50
    });
  }

  // 5. Binary Artifact Footprint
  const apkPath = path.resolve(__dirname, '..', 'Bookera.apk');
  if (fs.existsSync(apkPath)) {
    const apkMb = (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2);
    results.push({
      category: 'Build & Package Footprint',
      metric: 'Android Release APK Size',
      value: `${apkMb} MB`,
      benchmark: '< 10 MB',
      passed: parseFloat(apkMb) < 10
    });
  }

  await browser.close();
  server.close();

  // Print results table
  console.log('\n' + '='.repeat(85));
  console.log(
    'CATEGORY'.padEnd(30) +
    'METRIC'.padEnd(32) +
    'RESULT'.padEnd(14) +
    'TARGET'.padEnd(12) +
    'STATUS'
  );
  console.log('='.repeat(85));

  for (const r of results) {
    const status = r.passed ? 'PASSED' : 'SLOW';
    console.log(
      r.category.padEnd(30) +
      r.metric.padEnd(32) +
      r.value.padEnd(14) +
      r.benchmark.padEnd(12) +
      status
    );
  }
  console.log('='.repeat(85));

  return results;
}

runBenchmarks().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
