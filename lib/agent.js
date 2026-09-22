import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export const mastra = new Mastra({
  agents: {
    blogWriter: new Agent({
      id: "blog-writer",
      name: "Blog Writer",
      model: "openai/gpt-4o-mini",
      instructions: `
Você é um redator sênior de um blog de tecnologia.
A partir de uma ideia fornecida pelo usuário, escreva uma postagem COMPLETA em Markdown.

Regras:
- Crie um título claro, atrativo e objetivo.
- O campo content deve ser uma postagem completa em Markdown, com introdução, desenvolvimento e conclusão.
- Use títulos (##, ###), listas e trechos de código quando fizer sentido.
- Escreva em português do Brasil, salvo se a ideia pedir outro idioma.
- Não inclua o título dentro do content.
- Retorne estritamente os campos "title" e "content".
`,
    }),
  },
});

export async function generatePostFromIdea(idea) {
  const agent = mastra.getAgent("blogWriter");
  const response = await agent.generate(idea, {
    structuredOutput: {
      schema: postSchema,
    },
  });

  return response.object;
}
