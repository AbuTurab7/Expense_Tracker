const fs = require("fs");
const path = require("path");

const sourcePath = path.join(__dirname, "Expense_Tracker_Thesis.md");
const outputPath = path.join(__dirname, "Expense_Tracker_Thesis.html");

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatInline = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
const html = [];

const flushParagraph = (buffer) => {
  if (!buffer.length) return;
  html.push(`<p>${formatInline(buffer.join(" "))}</p>`);
  buffer.length = 0;
};

const flushList = (buffer, tag) => {
  if (!buffer.length) return;
  html.push(`<${tag}>`);
  buffer.forEach((item) => html.push(`<li>${formatInline(item)}</li>`));
  html.push(`</${tag}>`);
  buffer.length = 0;
};

const flushTable = (buffer) => {
  if (!buffer.length) return;
  const rows = buffer
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  if (!rows.length) {
    buffer.length = 0;
    return;
  }

  html.push("<table>");
  html.push("<thead><tr>");
  rows[0].forEach((cell) => html.push(`<th>${formatInline(cell)}</th>`));
  html.push("</tr></thead>");

  if (rows.length > 1) {
    html.push("<tbody>");
    rows.slice(1).forEach((row) => {
      html.push("<tr>");
      row.forEach((cell) => html.push(`<td>${formatInline(cell)}</td>`));
      html.push("</tr>");
    });
    html.push("</tbody>");
  }

  html.push("</table>");
  buffer.length = 0;
};

const paragraph = [];
const ul = [];
const ol = [];
const table = [];

const flushAll = () => {
  flushParagraph(paragraph);
  flushList(ul, "ul");
  flushList(ol, "ol");
  flushTable(table);
};

lines.forEach((line) => {
  const trimmed = line.trim();

  if (!trimmed) {
    flushAll();
    return;
  }

  if (trimmed.startsWith("|")) {
    flushParagraph(paragraph);
    flushList(ul, "ul");
    flushList(ol, "ol");
    table.push(trimmed);
    return;
  }

  if (/^#{1,6}\s/.test(trimmed)) {
    flushAll();
    const level = trimmed.match(/^#+/)[0].length;
    html.push(`<h${level}>${formatInline(trimmed.slice(level).trim())}</h${level}>`);
    return;
  }

  if (/^\d+\.\s/.test(trimmed)) {
    flushParagraph(paragraph);
    flushList(ul, "ul");
    flushTable(table);
    ol.push(trimmed.replace(/^\d+\.\s/, ""));
    return;
  }

  if (/^-\s/.test(trimmed)) {
    flushParagraph(paragraph);
    flushList(ol, "ol");
    flushTable(table);
    ul.push(trimmed.replace(/^-\s/, ""));
    return;
  }

  if (/^---+$/.test(trimmed)) {
    flushAll();
    html.push("<hr />");
    return;
  }

  flushList(ul, "ul");
  flushList(ol, "ol");
  flushTable(table);
  paragraph.push(trimmed);
});

flushAll();

const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SpendSpace Thesis</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm;
    }

    body {
      font-family: "Times New Roman", serif;
      color: #161616;
      line-height: 1.65;
      font-size: 12pt;
      margin: 0;
      background: white;
    }

    main {
      max-width: 100%;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      color: #0f3d32;
      margin-top: 1.2em;
      margin-bottom: 0.45em;
      line-height: 1.25;
    }

    h1 {
      font-size: 24pt;
      border-bottom: 2px solid #0f3d32;
      padding-bottom: 8px;
    }

    h2 {
      font-size: 18pt;
      margin-top: 1.6em;
    }

    h3 {
      font-size: 14pt;
    }

    p {
      text-align: justify;
      margin: 0 0 0.9em;
    }

    ul, ol {
      margin: 0 0 1em 1.5em;
      padding: 0;
    }

    li {
      margin: 0.25em 0;
    }

    hr {
      border: 0;
      border-top: 1px solid #b8c8c3;
      margin: 1.4em 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0 1.4em;
      font-size: 10.5pt;
    }

    th, td {
      border: 1px solid #97ada6;
      padding: 8px 9px;
      vertical-align: top;
    }

    th {
      background: #e8f1ee;
      text-align: left;
    }

    code {
      font-family: "Courier New", monospace;
      font-size: 10pt;
      background: #f1f5f4;
      padding: 1px 4px;
      border-radius: 3px;
    }

    a {
      color: #0f5f4a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <main>
    ${html.join("\n")}
  </main>
</body>
</html>`;

fs.writeFileSync(outputPath, document);
console.log(`HTML written to ${outputPath}`);
