const imageNames = ['D1-正文2.jpeg', 'D1-正文3.png', 'D1-正文4.png'];

function styleBodyPhotos(tree) {
  let reachedReference = false;
  const visit = (node) => {
    if (node.type === 'html') {
      node.value = node.value.replace(/<img\b[^>]*>/g, (markup) => {
        if (/\balt="D1-正文1\.png"/.test(markup)) reachedReference = true;
        if (!reachedReference) return markup;
        if (/\bclass="[^"]*"/.test(markup)) {
          return markup.replace(/\bclass="([^"]*)"/, 'class="$1 day-one-body-photo"');
        }
        return markup.replace('<img', '<img class="day-one-body-photo"');
      });
    }
    if (node.type === 'image') {
      if (node.alt === 'D1-正文1.png') reachedReference = true;
      if (reachedReference) {
        node.data ??= {};
        node.data.hProperties ??= {};
        const existing = node.data.hProperties.className || [];
        node.data.hProperties.className = [
          ...(Array.isArray(existing) ? existing : [existing]),
          'day-one-body-photo',
        ];
      }
    }
    for (const child of node.children || []) visit(child);
  };
  visit(tree);
}

// Photo sizing starts at Day 1's reference image; the special layout still
// applies only to the three named photos immediately after it.
// The original Markdown and all text nodes are left untouched.
export default function remarkDayOnePhotoLayout() {
  return (tree) => {
    styleBodyPhotos(tree);
    const matches = new Map();
    for (const [index, block] of tree.children.entries()) {
      const nodes = block.type === 'paragraph' ? block.children : [block];
      for (const node of nodes) {
        if (node.type !== 'html' || !/^<img\b[^>]*\/?>\s*$/.test(node.value)) continue;
        const alt = node.value.match(/\balt="([^"]*)"/)?.[1];
        if (imageNames.includes(alt)) matches.set(alt, { index, block, node });
      }
    }
    if (matches.size !== imageNames.length) return;

    const getImage = (name) => matches.get(name).node.value;
    const layout = {
      type: 'html',
      value: `<div class="day-one-photo-layout"><div class="day-one-photo-portrait">${getImage(imageNames[2])}</div><div class="day-one-photo-map">${getImage(imageNames[0])}</div><div class="day-one-photo-bridge">${getImage(imageNames[1])}</div></div>`,
    };
    const removed = new Set([...matches.values()].map(({ node }) => node));
    const first = matches.get(imageNames[0]);
    const blocks = [];
    for (const [index, block] of tree.children.entries()) {
      if (removed.has(block)) {
        if (index === first.index) blocks.push(layout);
        continue;
      }
      if (block.type === 'paragraph') {
        block.children = block.children.filter((child) => !removed.has(child));
      }
      blocks.push(block);
      if (index === first.index) blocks.push(layout);
    }
    tree.children = blocks;
  };
}
