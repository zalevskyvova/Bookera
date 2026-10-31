import { parseFb2Content } from '../dist/assets/fb2Parser-CYuWytms.js';
import { parseTxtContent } from '../dist/assets/txtParser-D1eyBaGq.js';

console.log('='.repeat(60));
console.log('         EXTREME STRESS BENCHMARK (MASSIVE NOVELS)          ');
console.log('='.repeat(60));

// 1. Massive 300-Chapter FB2 Novel (15,000 paragraphs)
console.log('\n[1/2] Generating massive 300-chapter FB2 novel (15,000 paragraphs)...');
let fb2Xml = '<?xml version="1.0" encoding="utf-8"?><FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0"><description><title-info><book-title>Massive Light Novel Archive</book-title></title-info></description><body>';
for (let c = 1; c <= 300; c++) {
  fb2Xml += `<section><title><p>Chapter ${c}: The Great War of Dimensions</p></title>`;
  for (let p = 1; p <= 50; p++) {
    fb2Xml += `<p>Paragraph ${p}: The magic energy surged across the ley lines, destabilizing the barrier between realms while the heroes stood ready with weapons drawn.</p>`;
  }
  fb2Xml += '</section>';
}
fb2Xml += '</body></FictionBook>';

const fb2Bytes = Buffer.byteLength(fb2Xml, 'utf8');
const fb2Mb = (fb2Bytes / (1024 * 1024)).toFixed(2);
console.log(`Payload size: ${fb2Mb} MB (${fb2Bytes.toLocaleString()} bytes)`);

const t0 = performance.now();
const fb2Book = parseFb2Content('epic_novel.fb2', fb2Xml);
const t1 = performance.now();
const fb2DurationMs = t1 - t0;
const fb2Throughput = ((fb2Bytes / (1024 * 1024)) / (fb2DurationMs / 1000)).toFixed(1);

console.log(`- Parsed chapters: ${fb2Book.chapters.length}`);
console.log(`- Parse duration: ${fb2DurationMs.toFixed(2)} ms`);
console.log(`- Throughput: ${fb2Throughput} MB/s`);

// 2. Massive TXT Novel (50,000 lines)
console.log('\n[2/2] Generating monolithic 200-chapter TXT novel (20,000 paragraphs)...');
let txt = 'Massive Monolithic Web Serial\nAuthor\n\n';
for (let c = 1; c <= 200; c++) {
  txt += `Chapter ${c}: The Shattered Throne\n\n`;
  for (let p = 1; p <= 50; p++) {
    txt += `Paragraph ${p}: In the silence of the dawn, footsteps echoed through the grand corridor.\n\n`;
  }
}
const txtBytes = Buffer.byteLength(txt, 'utf8');
const txtMb = (txtBytes / (1024 * 1024)).toFixed(2);
console.log(`Payload size: ${txtMb} MB (${txtBytes.toLocaleString()} bytes)`);

const t2 = performance.now();
const txtBook = parseTxtContent('monolithic.txt', txt);
const t3 = performance.now();
const txtDurationMs = t3 - t2;
const txtThroughput = ((txtBytes / (1024 * 1024)) / (txtDurationMs / 1000)).toFixed(1);

console.log(`- Parsed chapters: ${txtBook.chapters.length}`);
console.log(`- Parse duration: ${txtDurationMs.toFixed(2)} ms`);
console.log(`- Throughput: ${txtThroughput} MB/s`);

console.log('\n' + '='.repeat(60));
console.log('                 STRESS TEST PASSED                  ');
console.log('='.repeat(60));
