import http from 'node:http';
import { createPost, findPostById, listPosts, deletePost, createComment, deleteComment, listComments, listCommentsByPost, createSuggestion, listSuggestions } from './lib/store.js';
import { generatePostFromIdea } from './lib/agent.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = '/api';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Corpo da requisição muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido no corpo da requisição'));
      }
    });
    req.on('error', reject);
  });
}

function requireStringField(body, field, res) {
  const value = typeof body[field] === 'string' ? body[field].trim() : '';
  if (!value) {
    sendError(res, 400, `O campo "${field}" é obrigatório`);
    return null;
  }
  return value;
}

function notFound(res) {
  sendError(res, 404, 'Rota não encontrada');
}

function methodNotAllowed(res) {
  sendError(res, 405, 'Método não permitido');
}

function createHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
}

async function routePosts(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean);

  if (req.method === 'POST' && segments.length === 2) {
    const body = await readBody(req);
    const title = requireStringField(body, 'title', res);
    if (title === null) return;
    const content = requireStringField(body, 'content', res);
    if (content === null) return;

    const post = createPost({ title, content, author: body.author });
    return sendJson(res, 201, { post });
  }

  if (req.method === 'GET' && segments.length === 2) {
    return sendJson(res, 200, { posts: listPosts() });
  }

  if (segments.length === 3) {
    const post = findPostById(segments[2]);
    if (!post) return sendError(res, 404, 'Postagem não encontrada');

    if (req.method === 'GET') {
      return sendJson(res, 200, { post });
    }

    if (req.method === 'DELETE') {
      deletePost(post.id);
      return sendJson(res, 200, { post });
    }
  }

  if (segments.length === 4 && segments[3] === 'comments') {
    const post = findPostById(segments[2]);
    if (!post) return sendError(res, 404, 'Postagem não encontrada');

    if (req.method === 'POST') {
      const body = await readBody(req);
      const content = requireStringField(body, 'content', res);
      if (content === null) return;

      const comment = createComment({ postId: post.id, content, author: body.author });
      return sendJson(res, 201, { comment });
    }

    if (req.method === 'GET') {
      const comments = listCommentsByPost(post.id);
      return sendJson(res, 200, { comments, total: comments.length });
    }
  }

  methodNotAllowed(res);
}

async function routeComments(req, res, url, pathname) {
  const segments = pathname.split('/').filter(Boolean);

  if (req.method === 'DELETE' && segments.length === 3) {
    const comment = deleteComment(segments[2]);
    if (!comment) return sendError(res, 404, 'Comentário não encontrado');
    return sendJson(res, 200, { comment });
  }

  if (req.method !== 'GET') return methodNotAllowed(res);

  const postId = url.searchParams.get('postId');
  const author = url.searchParams.get('author');
  const content = url.searchParams.get('content');

  const filters = {};
  if (postId) filters.postId = postId;
  if (author) filters.author = author;
  if (content) filters.content = content;

  const comments = listComments(filters);
  return sendJson(res, 200, { comments, total: comments.length });
}

async function routeSuggestions(req, res) {
  if (req.method === 'POST') {
    const body = await readBody(req);
    const idea = requireStringField(body, 'idea', res);
    if (idea === null) return;

    const generated = await generatePostFromIdea(idea);
    const suggestion = createSuggestion({ title: generated.title, content: generated.content });
    return sendJson(res, 201, { suggestion });
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, { suggestions: listSuggestions(), total: listSuggestions().length });
  }

  methodNotAllowed(res);
}

async function handler(req, res) {
  createHandler(req, res);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (pathname.startsWith('/api/suggestions')) {
    return routeSuggestions(req, res);
  }

  if (pathname.startsWith('/api/comments')) {
    return routeComments(req, res, url, pathname);
  }

  if (pathname.startsWith('/api/posts')) {
    return routePosts(req, res, pathname);
  }

  notFound(res);
}

const server = http.createServer((req, res) => {
  handler(req, res).catch((err) => {
    if (res.headersSent) {
      res.end();
      return;
    }
    sendError(res, err.message.includes('JSON inválido') || err.message.includes('grande') ? 400 : 500, err.message);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`API rodando em http://${HOST}:${PORT}`);
});