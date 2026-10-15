import { createServer } from 'node:http';
import { readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const toolDir = fileURLToPath(new URL('.', import.meta.url));
const projectDir = resolve(toolDir, '../..');
const articleDir = join(projectDir, 'src/content/blog');
const blogCssPath = join(projectDir, 'src/styles/global.css');
const host = '127.0.0.1';
const port = Number(process.env.MARKDOWN_WRITER_PORT || 4399);

marked.setOptions({ gfm: true, breaks: false });

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function json(response, status, value) {
  send(response, status, JSON.stringify(value));
}

function safeArticlePath(input) {
  if (typeof input !== 'string' || !/\.mdx?$/.test(input)) throw new Error('只支持 Markdown 文件');
  const absolute = resolve(articleDir, input);
  if (absolute !== articleDir && !absolute.startsWith(`${articleDir}${sep}`)) throw new Error('文件路径无效');
  return absolute;
}

function parseDocument(source) {
  if (!source.startsWith('---\n')) return { attributes: {}, body: source };
  const end = source.indexOf('\n---\n', 4);
  if (end === -1) return { attributes: {}, body: source };
  const frontmatter = source.slice(4, end);
  const attributes = {};
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    attributes[match[1]] = value;
  }
  return { attributes, body: source.slice(end + 5) };
}

async function readRequestBody(request, limit = 2_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('内容太大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function listArticles(directory = articleDir) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listArticles(absolute));
    if (entry.isFile() && /\.mdx?$/.test(entry.name)) {
      const source = await readFile(absolute, 'utf8');
      const { attributes } = parseDocument(source);
      files.push({
        path: relative(articleDir, absolute),
        title: attributes.title || entry.name,
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));
}

async function serveAsset(response, pathname) {
  const filename = pathname === '/' ? 'index.html' : pathname.slice(1);
  const absolute = resolve(toolDir, filename);
  if (!absolute.startsWith(toolDir) || !['index.html', 'editor.css', 'editor.js'].includes(filename)) return false;
  const body = await readFile(absolute);
  send(response, 200, body, contentTypes[extname(absolute)] || 'application/octet-stream');
  return true;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === 'GET' && url.pathname === '/api/files') {
      return json(response, 200, { files: await listArticles() });
    }

    if (request.method === 'GET' && url.pathname === '/api/file') {
      const path = url.searchParams.get('path');
      const absolute = safeArticlePath(path);
      const source = await readFile(absolute, 'utf8');
      return json(response, 200, { path, source });
    }

    if (request.method === 'POST' && url.pathname === '/api/render') {
      const { source = '' } = JSON.parse(await readRequestBody(request));
      const { attributes, body } = parseDocument(String(source));
      return json(response, 200, {
        title: attributes.title || '',
        html: await marked.parse(body),
      });
    }

    if (request.method === 'PUT' && url.pathname === '/api/file') {
      const { path, source } = JSON.parse(await readRequestBody(request));
      const absolute = safeArticlePath(path);
      await stat(absolute);
      const temporary = `${absolute}.saving`;
      await writeFile(temporary, String(source), 'utf8');
      await rename(temporary, absolute);
      return json(response, 200, { saved: true });
    }

    if (request.method === 'POST' && url.pathname === '/api/file') {
      const { path, title } = JSON.parse(await readRequestBody(request));
      const absolute = safeArticlePath(path);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
      const safeTitle = String(title).replace(/[\r\n]/g, ' ').trim();
      if (!safeTitle) throw new Error('请填写标题');
      const source = `---\ntitle: ${JSON.stringify(safeTitle)}\ndescription: ^.^\npubDate: ${today}\ndraft: true\n---\n\n`;
      await writeFile(absolute, source, { encoding: 'utf8', flag: 'wx' });
      return json(response, 201, { path, source });
    }

    if (request.method === 'GET' && url.pathname === '/blog.css') {
      return send(response, 200, await readFile(blogCssPath), 'text/css; charset=utf-8');
    }

    if (request.method === 'GET' && await serveAsset(response, url.pathname)) return;
    json(response, 404, { error: '没有找到' });
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : '发生错误' });
  }
});

server.listen(port, host, () => {
  console.log(`Markdown 写作工具已启动：http://${host}:${port}`);
});
