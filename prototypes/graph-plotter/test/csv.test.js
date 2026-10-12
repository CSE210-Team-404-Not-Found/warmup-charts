import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { parseCsv } from '../src/csv.js';
import { DATASETS } from '../demo/datasets.js';

test('single-series decimal measurements retain numeric values and supplied order', () => {
  assert.deepEqual(parseCsv('x,y\n5,1e0\n .5 , +2.50 \n0,0\n', { defaultSeriesName: 'Trial' }), [
    { name: 'Trial', points: [{ x: 5, y: 1 }, { x: 0.5, y: 2.5 }, { x: 0, y: 0 }] },
  ]);
});

test('interleaved series preserve first appearance and each series row order', () => {
  assert.deepEqual(parseCsv('series,x,y\nB,5,1\nA,1,4\nB,0,2\n A ,3,3'), [
    { name: 'B', points: [{ x: 5, y: 1 }, { x: 0, y: 2 }] },
    { name: 'A', points: [{ x: 1, y: 4 }, { x: 3, y: 3 }] },
  ]);
});

test('CSV quotes, commas, escaped quotes, BOM and CRLF are handled', () => {
  assert.deepEqual(parseCsv('\uFEFFseries,x,y\r\n"Trial, ""A""","1","2"\r\n"Trial, ""A""",3,4\r\n'), [
    { name: 'Trial, "A"', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
  ]);
});

test('a quoted multiline name is one field and errors use physical row numbers', () => {
  assert.deepEqual(parseCsv('series,x,y\n"Trial\nA",1,2'), [{ name: 'Trial\nA', points: [{ x: 1, y: 2 }] }]);
  assert.throws(() => parseCsv('series,x,y\n"Trial\nA",1,2\nB,2,no'), /row 4, column y/);
});

test('header-only CSV contains no measurements', () => {
  assert.deepEqual(parseCsv('x,y\n'), []);
  assert.deepEqual(parseCsv('series,x,y'), []);
});

const failures = [
  ['missing header', '', /row 1.*header/],
  ['unsupported header', 'time,distance\n1,2', /header/],
  ['extra column', 'x,y\n1,2,3', /row 2.*2 columns/],
  ['missing column', 'x,y\n1', /row 2.*2 columns/],
  ['blank data row', 'x,y\n1,2\n\n3,4', /row 3.*columns/],
  ['missing coordinate', 'x,y\n1,', /row 2, column y.*missing/],
  ['text coordinate', 'x,y\n1,hello', /row 2, column y.*finite decimal/],
  ['infinity', 'x,y\n1,Infinity', /finite decimal/],
  ['overflow', 'x,y\n1,1e999', /finite decimal/],
  ['hexadecimal', 'x,y\n0x1,2', /finite decimal/],
  ['missing series', 'series,x,y\n ,1,2', /row 2, column series/],
  ['unclosed quote', 'x,y\n"1,2', /row 2.*not closed/],
  ['quote in unquoted field', 'x,y\n1"2,3', /row 2.*quote/],
  ['text after quote', 'x,y\n"1"a,2', /row 2.*closing quote/],
  ['late invalid coordinate', 'x,y\n0,0\n1,2\n4,no', /row 4, column y/],
  ['out-of-range coordinate', 'x,y\n6,2', /row 2, column x.*0–5/],
];
for (const [name, text, message] of failures) {
  test(`invalid CSV fails as a whole: ${name}`, () => assert.throws(() => parseCsv(text), message));
}

test('repeatable sample files match the documented measurements', async () => {
  const motion = await readFile(new URL('../examples/data/motion.csv', import.meta.url), 'utf8');
  assert.deepEqual(parseCsv(motion), DATASETS.motion.series);
  const empty = await readFile(new URL('../examples/data/empty.csv', import.meta.url), 'utf8');
  assert.deepEqual(parseCsv(empty), []);
});
