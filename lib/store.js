import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { nanoid } from "nanoid";

const DEFAULT_DATA = { posts: [], comments: [], suggestions: [] };

function getDbFile() {
  return path.resolve(process.cwd(), process.env.DB_FILE || "./data/db.json");
}

function ensureStorage() {
  const file = getDbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    writeAll(DEFAULT_DATA);
  }
}

function readAll() {
  ensureStorage();
  const raw = fs.readFileSync(getDbFile(), "utf-8");
  try {
    const data = JSON.parse(raw);
    data.posts = Array.isArray(data.posts) ? data.posts : [];
    data.comments = Array.isArray(data.comments) ? data.comments : [];
    data.suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    return data;
  } catch {
    throw new Error("Arquivo de dados corrompido: " + getDbFile());
  }
}

function writeAll(data) {
  const file = getDbFile();
  const tmp = file + ".tmp";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function newId() {
  return crypto.randomUUID();
}

function createPost({ title, content, author }) {
  const now = new Date().toISOString();
  const post = {
    id: newId(),
    title,
    content,
    author: author || "Anônimo",
    createdAt: now,
    updatedAt: now,
  };

  const data = readAll();
  data.posts.push(post);
  writeAll(data);

  return post;
}

function findPostById(id) {
  return readAll().posts.find((post) => post.id === id) || null;
}

function listPosts() {
  return readAll().posts;
}

function createComment({ postId, content, author }) {
  const post = findPostById(postId);
  if (!post) return null;

  const now = new Date().toISOString();
  const comment = {
    id: newId(),
    postId,
    content,
    author: author || "Anônimo",
    createdAt: now,
  };

  const data = readAll();
  data.comments.push(comment);
  writeAll(data);

  return comment;
}

function listComments(filters = {}) {
  let comments = readAll().comments;

  if (filters.postId) {
    comments = comments.filter((comment) => comment.postId === filters.postId);
  }

  if (filters.author) {
    const term = filters.author.toLowerCase();
    comments = comments.filter((comment) => comment.author.toLowerCase().includes(term));
  }

  if (filters.content) {
    const term = filters.content.toLowerCase();
    comments = comments.filter((comment) => comment.content.toLowerCase().includes(term));
  }

  return comments;
}

function listCommentsByPost(postId) {
  return listComments({ postId });
}

function deletePost(id) {
  const data = readAll();
  const index = data.posts.findIndex((post) => post.id === id);
  if (index === -1) return null;

  const [post] = data.posts.splice(index, 1);
  data.comments = data.comments.filter((comment) => comment.postId !== id);
  writeAll(data);

  return post;
}

function deleteComment(id) {
  const data = readAll();
  const index = data.comments.findIndex((comment) => comment.id === id);
  if (index === -1) return null;

  const [comment] = data.comments.splice(index, 1);
  writeAll(data);

  return comment;
}

function createSuggestion({ title, content }) {
  const postTitle = typeof title === "string" ? title.trim() : "";
  const postContent = typeof content === "string" ? content.trim() : "";
  if (!postTitle || !postContent) {
    throw new Error("O agente não retornou title e content válidos");
  }

  const suggestion = {
    id: nanoid(),
    title: postTitle,
    content: postContent,
    published_at: null,
    created_at: new Date().toISOString(),
    approved_at: null,
    rejected_at: null,
  };

  const data = readAll();
  data.suggestions.push(suggestion);
  writeAll(data);

  return suggestion;
}

function listSuggestions() {
  return readAll().suggestions;
}

ensureStorage();

export {
  createPost,
  findPostById,
  listPosts,
  deletePost,
  createComment,
  deleteComment,
  listComments,
  listCommentsByPost,
  createSuggestion,
  listSuggestions,
};
