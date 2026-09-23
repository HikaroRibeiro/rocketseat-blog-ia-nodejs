import {
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
} from "./lib/store.js";
import { generatePostFromIdea } from "./lib/agent.js";
import { createApp } from "./lib/framework.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function requireStringField(body, field, res) {
  const value = typeof body[field] === "string" ? body[field].trim() : "";
  if (!value) {
    res.status(400).send({ error: `O campo "${field}" é obrigatório` });
    return null;
  }
  return value;
}

const app = createApp();

app.get("/api/health", (req, res) => {
  return res.send({ status: "ok" });
});

app.post("/api/posts", async (req, res) => {
  const title = requireStringField(req.body, "title", res);
  if (title === null) return;
  const content = requireStringField(req.body, "content", res);
  if (content === null) return;

  const post = createPost({ title, content, author: req.body.author });
  return res.status(201).send({ post });
});

app.get("/api/posts", (req, res) => {
  return res.send({ posts: listPosts() });
});

app.get("/api/posts/:id", (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).send({ error: "Postagem não encontrada" });
  return res.send({ post });
});

app.delete("/api/posts/:id", (req, res) => {
  const post = deletePost(req.params.id);
  if (!post) return res.status(404).send({ error: "Postagem não encontrada" });
  return res.send({ post });
});

app.post("/api/posts/:id/comments", async (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).send({ error: "Postagem não encontrada" });

  const content = requireStringField(req.body, "content", res);
  if (content === null) return;

  const comment = createComment({ postId: post.id, content, author: req.body.author });
  return res.status(201).send({ comment });
});

app.get("/api/posts/:id/comments", (req, res) => {
  const post = findPostById(req.params.id);
  if (!post) return res.status(404).send({ error: "Postagem não encontrada" });

  const comments = listCommentsByPost(post.id);
  return res.send({ comments, total: comments.length });
});

app.get("/api/comments", (req, res) => {
  const { postId, author, content } = req.query;
  const filters = {};
  if (postId) filters.postId = postId;
  if (author) filters.author = author;
  if (content) filters.content = content;

  const comments = listComments(filters);
  return res.send({ comments, total: comments.length });
});

app.delete("/api/comments/:id", (req, res) => {
  const comment = deleteComment(req.params.id);
  if (!comment) return res.status(404).send({ error: "Comentário não encontrado" });
  return res.send({ comment });
});

app.post("/api/suggestions", async (req, res) => {
  const idea = requireStringField(req.body, "idea", res);
  if (idea === null) return;

  const generated = await generatePostFromIdea(idea);
  const suggestion = createSuggestion({ title: generated.title, content: generated.content });
  return res.status(201).send({ suggestion });
});

app.get("/api/suggestions", (req, res) => {
  const suggestions = listSuggestions();
  return res.send({ suggestions, total: suggestions.length });
});

app.listen(PORT, HOST, () => {
  console.log(`API rodando em http://${HOST}:${PORT}`);
});
