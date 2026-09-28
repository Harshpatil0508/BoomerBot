const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const safeHref = (href: string) =>
  /^(https?:|mailto:|#|\/)/i.test(href.trim()) ? href.trim() : '#';

function renderInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-secondary text-[0.85em] font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) =>
      `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

const isHr = (line: string) => /^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line);
const isTableSeparator = (line: string) =>
  /^[\s|:-]+$/.test(line) && line.includes('-') && line.includes('|');

const splitRow = (line: string) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());

/**
 * Renders the markdown subset the asset generator emits: fenced code, GFM tables,
 * headings, lists, blockquotes, rules and paragraphs. Input is escaped before parsing.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = escapeHtml(markdown.replace(/\r\n/g, '\n')).split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block — content must survive verbatim, so no inline formatting is applied
    const fence = line.match(/^\s*```+\s*([\w+-]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```+\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++;
      const lang = fence[1]
        ? `<div class="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">${fence[1]}</div>`
        : '';
      out.push(
        `<div class="my-4 rounded-xl border border-border bg-secondary/40 p-4 overflow-x-auto">${lang}` +
        `<pre class="text-xs leading-relaxed font-mono whitespace-pre">${body.join('\n')}</pre></div>`
      );
      continue;
    }

    // GFM table
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const head = headers
        .map(h => `<th class="text-left font-semibold px-3 py-2 border-b border-border">${renderInline(h)}</th>`)
        .join('');
      const body = rows
        .map(cells =>
          `<tr class="border-b border-border/50 last:border-0">${cells
            .map(c => `<td class="px-3 py-2 align-top">${renderInline(c)}</td>`)
            .join('')}</tr>`)
        .join('');
      out.push(
        `<div class="my-4 overflow-x-auto rounded-xl border border-border">` +
        `<table class="w-full text-sm border-collapse"><thead class="bg-secondary/50"><tr>${head}</tr></thead>` +
        `<tbody>${body}</tbody></table></div>`
      );
      continue;
    }

    if (isHr(line)) {
      out.push('<hr class="border-border my-6"/>');
      i++;
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const sizes: Record<number, string> = {
        1: 'text-2xl font-bold mt-6 mb-4',
        2: 'text-xl font-bold mt-8 mb-3 border-b border-border pb-2',
        3: 'text-lg font-bold mt-6 mb-2',
        4: 'text-base font-bold mt-5 mb-2',
        5: 'text-sm font-bold mt-4 mb-1',
        6: 'text-sm font-semibold mt-4 mb-1',
      };
      out.push(`<h${level} class="${sizes[level]} text-foreground">${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote — '>' has already been escaped to '&gt;' by this point
    if (/^\s*&gt;\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*&gt;\s?/, ''));
        i++;
      }
      out.push(
        `<blockquote class="my-4 border-l-4 border-primary/40 bg-primary/5 pl-4 py-2 text-sm italic">` +
        `${renderInline(quoted.join('<br/>'))}</blockquote>`
      );
      continue;
    }

    // Lists — consecutive items of the same kind become one list, with indentation preserved
    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]);
      // Literal class names so Tailwind's scanner keeps them in the build
      const indentClasses = ['', 'ml-6', 'ml-12', 'ml-16'];
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m || /\d/.test(m[2]) !== ordered) break;
        const indent = Math.min(Math.floor(m[1].length / 2), 3);
        items.push(`<li class="${indentClasses[indent]} mb-1">${renderInline(m[3])}</li>`);
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      const style = ordered ? 'list-decimal' : 'list-disc';
      out.push(`<${tag} class="${style} pl-6 my-3 space-y-0.5 text-sm leading-relaxed">${items.join('')}</${tag}>`);
      continue;
    }

    // Paragraph — soft line breaks inside it are preserved
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isHr(lines[i]) &&
      !/^\s*(#{1,6}\s|&gt;|```)/.test(lines[i]) &&
      !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    if (paragraph.length) {
      out.push(`<p class="my-3 text-sm leading-relaxed">${renderInline(paragraph.join('<br/>'))}</p>`);
    }
  }

  return out.join('');
}
