// Reads a Wayfair product page: title, price block and overall dimensions.
// Run in the gstack browser on a product page:
//   ~/.claude/skills/gstack/browse/dist/browse --headed eval tools/wayfair-extract.js
// Returns "BOT CHECK" when Wayfair's press-and-hold page is showing instead.
(() => {
  const t = document.body.innerText;
  if (/Press & Hold/i.test(t)) return 'BOT CHECK';
  const sku = t.indexOf('SKU:');
  const head = sku >= 0 ? t.slice(sku, sku + 380).replace(/\n+/g, ' | ') : '(no SKU block)';
  const color = t.indexOf('Color:');
  const colorLine = color >= 0 ? t.slice(color, color + 30).replace(/\n+/g, ' ') : '(no Color: line)';
  // The spec table is often collapsed; its values are still in the page's full text.
  const full = document.body.textContent;
  const m = full.match(/Overall Dimensions(?:\\?",\\?"value\\?":\\?")?([0-9.]+''\s*H\s*X\s*[0-9.]+''\s*W\s*X\s*[0-9.]+''\s*D)/);
  return [document.title, head, colorLine, 'Overall Dimensions: ' + (m ? m[1] : 'NOT FOUND')].join('\n---\n');
})()
