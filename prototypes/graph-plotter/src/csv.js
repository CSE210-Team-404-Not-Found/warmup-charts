import { AXIS_RANGES } from './config.js';

function readRecords(text) {
  const records = [];
  let fields = [];
  let field = '';
  let state = 'start';
  let line = 1;
  let recordLine = 1;
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (const character of source) {
    if (state === 'quoted') {
      if (character === '"') state = 'closed';
      else field += character;
      if (character === '\n') line++;
      continue;
    }
    if (state === 'closed' && character === '"') {
      field += '"';
      state = 'quoted';
      continue;
    }
    if (character === ',' || character === '\n') {
      fields.push(field);
      field = '';
      state = 'start';
      if (character === '\n') {
        records.push({ fields, line: recordLine });
        fields = [];
        line++;
        recordLine = line;
      }
      continue;
    }
    if (state === 'closed') throw new Error(`CSV row ${line}: unexpected text after a closing quote.`);
    if (character === '"') {
      if (state !== 'start') throw new Error(`CSV row ${line}: a quote must begin a field.`);
      state = 'quoted';
    } else {
      field += character;
      state = 'unquoted';
    }
  }
  if (state === 'quoted') throw new Error(`CSV row ${recordLine}: quoted field is not closed.`);
  // Ignore a final newline, but keep blank rows inside the file for validation.
  if (fields.length || field.length || state !== 'start') records.push({ fields: [...fields, field], line: recordLine });
  return records;
}

function coordinate(value, column, line) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`CSV row ${line}, column ${column}: coordinate is missing.`);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw new Error(`CSV row ${line}, column ${column}: expected a finite decimal number.`);
  }
  const number = Number(normalized);
  const range = AXIS_RANGES[column];
  if (number < range.min || number > range.max) {
    throw new Error(`CSV row ${line}, column ${column}: value is outside the supported range ${range.min}–${range.max}.`);
  }
  return number;
}

/**
 * Parse x,y or series,x,y CSV into named series.
 * Keep series in first-appearance order and points in row order.
 * @param {string} text
 * @param {{defaultSeriesName?: string}} [options]
 * @returns {{name: string, points: {x: number, y: number}[]}[]}
 */
export function parseCsv(text, { defaultSeriesName = 'CSV data' } = {}) {
  if (typeof text !== 'string') throw new Error('CSV contents must be text.');
  if (typeof defaultSeriesName !== 'string' || !defaultSeriesName.trim()) throw new Error('CSV series name must be nonempty.');
  const records = readRecords(text);
  const header = records.shift()?.fields.map(value => value.trim());
  const multiple = header?.join(',') === 'series,x,y' && header.length === 3;
  const single = header?.join(',') === 'x,y' && header.length === 2;
  if (!multiple && !single) throw new Error('CSV row 1: header must be x,y or series,x,y.');
  const byName = new Map();
  for (const record of records) {
    if (record.fields.length !== header.length) {
      throw new Error(`CSV row ${record.line}: expected ${header.length} columns; found ${record.fields.length}.`);
    }
    const name = multiple ? record.fields[0].trim() : defaultSeriesName.trim();
    if (!name) throw new Error(`CSV row ${record.line}, column series: name is missing.`);
    const offset = multiple ? 1 : 0;
    const point = {
      x: coordinate(record.fields[offset], 'x', record.line),
      y: coordinate(record.fields[offset + 1], 'y', record.line),
    };
    if (!byName.has(name)) byName.set(name, { name, points: [] });
    byName.get(name).points.push(point);
  }
  return [...byName.values()];
}
