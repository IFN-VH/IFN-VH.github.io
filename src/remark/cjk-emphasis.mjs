const hanCharacter = /\p{Script=Han}/u;

function splitCjkEmphasis(value) {
  const nodes = [];
  const pattern = /_([^_\n]+?)_/gu;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value))) {
    const content = match[1];
    const before = value[match.index - 1] || '';
    const after = value[match.index + match[0].length] || '';
    const touchesHanText = hanCharacter.test(before) || hanCharacter.test(after);
    const validContent = content.trim() === content && content.length > 0;

    if (!touchesHanText || !validContent) continue;

    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }
    nodes.push({
      type: 'emphasis',
      children: [{ type: 'text', value: content }],
    });
    cursor = match.index + match[0].length;
  }

  if (cursor === 0) return null;
  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) });
  return nodes;
}

function transform(parent) {
  if (!Array.isArray(parent.children)) return;

  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index];
    if (child.type === 'text') {
      const replacement = splitCjkEmphasis(child.value);
      if (replacement) {
        parent.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
      continue;
    }
    transform(child);
  }
}

export default function remarkCjkEmphasis() {
  return transform;
}
