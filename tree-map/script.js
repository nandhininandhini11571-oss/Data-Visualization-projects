const HEADER_HEIGHT = 26, MIN_HEADER_AREA = 40, PADDING = 2;
let ctx, canvasWidth, canvasHeight;

function createRecursiveTreemapEngine(canvasEl) {
  ctx = canvasEl.getContext('2d');
  canvasWidth = canvasEl.width;
  canvasHeight = canvasEl.height;
  ctx.textBaseline = 'middle';
  return { ctx, width: canvasWidth, height: canvasHeight };
}

function calculateTreeValues(node) {
  if (!node.children || node.children.length === 0) return node.value || 0;
  let total = 0;
  for (const child of node.children) total += calculateTreeValues(child);
  node.value = total;
  return total;
}

function getWorstRatio(row, rect) {
  if (row.length === 0) return Infinity;
  const sideLength = rect.w >= rect.h ? rect.h : rect.w;
  const sum = row.reduce((s, n) => s + n._area, 0);
  if (sum <= 0 || sideLength <= 0) return Infinity;
  let max = -Infinity, min = Infinity;
  for (const n of row) {
    if (n._area > max) max = n._area;
    if (n._area < min) min = n._area;
  }
  const sideSq = sideLength * sideLength, sumSq = sum * sum;
  return Math.max((sideSq * max) / sumSq, sumSq / (sideSq * min));
}

function positionElements(row, rect) {
  const sum = row.reduce((s, n) => s + n._area, 0);
  if (sum <= 0) return;
  if (rect.w >= rect.h) {
    const colWidth = sum / rect.h;
    let curY = rect.y;
    for (const item of row) {
      const itemH = item._area / colWidth;
      item._layout = { x: rect.x, y: curY, w: colWidth, h: itemH };
      curY += itemH;
    }
  } else {
    const rowHeight = sum / rect.w;
    let curX = rect.x;
    for (const item of row) {
      const itemW = item._area / rowHeight;
      item._layout = { x: curX, y: rect.y, w: itemW, h: rowHeight };
      curX += itemW;
    }
  }
}

function cutRectSpace(row, rect) {
  const sum = row.reduce((s, n) => s + n._area, 0);
  if (rect.w >= rect.h) {
    const colWidth = sum / rect.h;
    return { x: rect.x + colWidth, y: rect.y, w: rect.w - colWidth, h: rect.h };
  } else {
    const rowHeight = sum / rect.w;
    return { x: rect.x, y: rect.y + rowHeight, w: rect.w, h: rect.h - rowHeight };
  }
}

function computeSquarifiedLayout(nodes, x, y, w, h) {
  const items = nodes.filter(n => (n.value || 0) > 0).sort((a, b) => b.value - a.value);
  if (items.length === 0) return;
  const totalValue = items.reduce((s, n) => s + n.value, 0);
  const totalArea = Math.max(w, 0) * Math.max(h, 0);
  const scale = totalValue > 0 ? totalArea / totalValue : 0;
  items.forEach(n => { n._area = n.value * scale; });
  let rect = { x, y, w, h }, row = [], i = 0;
  while (i < items.length) {
    const candidate = items[i], newRow = row.concat(candidate);
    if (row.length === 0 || getWorstRatio(newRow, rect) <= getWorstRatio(row, rect)) {
      row = newRow;
      i++;
    } else {
      positionElements(row, rect);
      rect = cutRectSpace(row, rect);
      row = [];
    }
  }
  if (row.length > 0) positionElements(row, rect);
}

function drawWrappedText(text, cx, cy, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text).split(' '), lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else current = test;
  }
  if (current) lines.push(current);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines) clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  const startY = cy - ((clipped.length - 1) * lineHeight) / 2;
  clipped.forEach((line, idx) => ctx.fillText(line, cx, startY + idx * lineHeight));
  return clipped.length;
}

function isColorDark(hex) {
  if (!hex) return true;
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

function renderNode(node, x, y, w, h, depth) {
  if (w <= 0 || h <= 0) return;
  const hasChildren = node.children && node.children.length > 0;
  if (hasChildren) {
    const canShowHeader = (w * h) > MIN_HEADER_AREA * 6 && h > HEADER_HEIGHT + 10;
    let bodyY = y, bodyH = h;
    if (canShowHeader) {
      ctx.fillStyle = node.color || '#334155';
      ctx.fillRect(x, y, w, HEADER_HEIGHT);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, HEADER_HEIGHT - 1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 4, y, w - 8, HEADER_HEIGHT);
      ctx.clip();
      ctx.fillStyle = '#f5f8ff';
      ctx.font = `700 ${depth === 0 ? 13 : 12}px -apple-system, Segoe UI, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(node.name.toUpperCase(), x + 8, y + HEADER_HEIGHT / 2 + 1);
      ctx.restore();
      bodyY = y + HEADER_HEIGHT;
      bodyH = h - HEADER_HEIGHT;
    } else ctx.fillStyle = node.color || '#334155', ctx.fillRect(x, y, w, h);
    computeSquarifiedLayout(node.children, x + PADDING, bodyY + PADDING, Math.max(w - PADDING * 2, 0), Math.max(bodyH - PADDING * 2, 0));
    for (const child of node.children) {
      if (!child._layout) continue;
      const { x: cx, y: cy, w: cw, h: ch } = child._layout;
      renderNode(child, cx, cy, cw, ch, depth + 1);
    }
  } else {
    ctx.fillStyle = node.color || '#94a3b8';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(9,13,22,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(w - 1, 0), Math.max(h - 1, 0));
    if (w > 30 && h > 20) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 4, y + 4, Math.max(w - 8, 0), Math.max(h - 8, 0));
      ctx.clip();
      const cx = x + w / 2;
      const isDark = isColorDark(node.color);
      ctx.fillStyle = isDark ? '#f4f7ff' : '#1c2436';
      ctx.textAlign = 'center';
      const nameSize = Math.max(10, Math.min(13, w / 14)), valueSize = Math.max(11, Math.min(15, w / 12));
      let cy = y + h / 2;
      if (h > 46) {
        ctx.font = `600 ${nameSize}px -apple-system, Segoe UI, Arial, sans-serif`;
        const lines = drawWrappedText(node.name, cx, y + h / 2 - valueSize, w - 12, nameSize + 4, 2);
        cy = y + h / 2 - valueSize + lines * (nameSize + 4) / 2 + valueSize + 6;
      }
      ctx.font = `700 ${valueSize}px -apple-system, Segoe UI, Arial, sans-serif`;
      ctx.fillText('$' + Math.round(node.value).toLocaleString('en-US'), cx, cy);
      ctx.restore();
    }
  }
}

function layout(rootData) {
  calculateTreeValues(rootData);
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#161d2e';
  ctx.fillRect(0, 0, canvasWidth, HEADER_HEIGHT + 6);
  ctx.fillStyle = '#f5f8ff';
  ctx.font = '700 14px -apple-system, Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(rootData.name.toUpperCase(), canvasWidth / 2, (HEADER_HEIGHT + 6) / 2 + 1);
  const top = HEADER_HEIGHT + 6 + PADDING;
  computeSquarifiedLayout(rootData.children, PADDING, top, canvasWidth - PADDING * 2, canvasHeight - top - PADDING);
  for (const child of rootData.children) {
    if (!child._layout) continue;
    const { x, y, w, h } = child._layout;
    renderNode(child, x, y, w, h, 0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('treemapCanvas');
  createRecursiveTreemapEngine(canvas);
  fetch('data.json').then(response => {
    if (!response.ok) throw new Error('Failed to load data.json');
    return response.json();
  }).then(data => layout(data));
});