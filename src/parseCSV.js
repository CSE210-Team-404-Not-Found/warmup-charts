// Read quoted fields (including escaped quotes and newlines) without a dependency.
function readRows(text) {
  const rows = [];
  let fields = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  let line = 1;
  let rowLine = 1;
  const finishField = () => {
    fields.push(field.trim());
    field = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (fields.some(value => value !== "") || fields.length > 1) {
      rows.push({ fields, line: rowLine });
    }
    fields = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else {
        field += char;
        if (char === "\n") line++;
      }
    } else if (char === ",") {
      finishField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finishRow();
      line++;
      rowLine = line;
    } else if (char === '"') {
      if (field.trim() !== "" || closedQuote) {
        throw new Error(`CSV row ${line}: unexpected quote.`);
      }
      field = "";
      quoted = true;
    } else {
      if (closedQuote && char.trim() !== "") {
        throw new Error(`CSV row ${line}: unexpected text after closing quote.`);
      }
      field += char;
    }
  }
  if (quoted) throw new Error(`CSV row ${rowLine}: unclosed quoted field.`);
  finishRow();
  return rows;
}

function coordinate(value, column, line) {
  // Accept decimal and scientific notation; reject blanks, hex, NaN and Infinity.
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  if (!decimal.test(value) || !Number.isFinite(Number(value))) {
    throw new Error(`CSV row ${line}, column ${column}: expected a finite number.`);
  }
  return Number(value);
}

/** Parse x,y or series,x,y CSV into [{ name, points: [{ x, y }] }]. */
export function parseCSV(text) {
  if (typeof text !== "string") throw new TypeError("CSV input must be a string.");
  const rows = readRows(text.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return [];
  const header = rows.shift().fields;
  const multi = header.length === 3 && header.join(",") === "series,x,y";
  if (!multi && !(header.length === 2 && header.join(",") === "x,y")) {
    throw new Error("CSV header must be x,y or series,x,y.");
  }
  const series = new Map();
  for (const { fields, line } of rows) {
    if (fields.length !== header.length) {
      throw new Error(`CSV row ${line}: expected ${header.length} columns, got ${fields.length}.`);
    }
    const name = multi ? fields[0] : "Series 1";
    if (!name) throw new Error(`CSV row ${line}, column series: name cannot be empty.`);
    const offset = multi ? 1 : 0;
    const point = {
      x: coordinate(fields[offset], "x", line),
      y: coordinate(fields[offset + 1], "y", line),
    };
    if (!series.has(name)) series.set(name, { name, points: [] });
    series.get(name).points.push(point);
  }
  return [...series.values()];
}
