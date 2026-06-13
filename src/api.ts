import { Request, Response, Router } from "express";
import { requireAuth, AuthRequest } from "./middleware/auth.ts";
import { db } from "./db/index.ts";
import { subjects, chapters, notes, users, studySessions, revisions } from "./db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "./db/users.ts";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export const apiRouter = Router();

apiRouter.use(requireAuth);

// Ensure user exists before handling requests
apiRouter.use(async (req: AuthRequest, res: Response, next) => {
  if (req.user) {
    await getOrCreateUser(req.user.uid, req.user.email || '');
  }
  next();
});

// --- Subjects ---
apiRouter.get("/subjects", async (req: AuthRequest, res) => {
  try {
    const data = await db.select().from(subjects).where(eq(subjects.userId, req.user!.uid));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/subjects", async (req: AuthRequest, res) => {
  try {
    const { name, color } = req.body;
    const result = await db.insert(subjects).values({
      userId: req.user!.uid,
      name,
      color: color || '#3b82f6'
    }).returning();
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete("/subjects/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(subjects).where(and(eq(subjects.id, parseInt(id)), eq(subjects.userId, req.user!.uid)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Chapters ---
apiRouter.get("/subjects/:subjectId/chapters", async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const data = await db.select().from(chapters)
      .where(and(eq(chapters.subjectId, parseInt(subjectId)), eq(chapters.userId, req.user!.uid)));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/subjects/:subjectId/chapters", async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const { title } = req.body;
    const result = await db.insert(chapters).values({
      userId: req.user!.uid,
      subjectId: parseInt(subjectId),
      title
    }).returning();
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete("/chapters/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(chapters).where(and(eq(chapters.id, parseInt(id)), eq(chapters.userId, req.user!.uid)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Notes ---
apiRouter.get("/chapters/:chapterId/notes", async (req: AuthRequest, res) => {
  try {
    const { chapterId } = req.params;
    const data = await db.select().from(notes)
      .where(and(eq(notes.chapterId, parseInt(chapterId)), eq(notes.userId, req.user!.uid)));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/chapters/:chapterId/notes", async (req: AuthRequest, res) => {
  try {
    const { chapterId } = req.params;
    const { content } = req.body;
    
    const existing = await db.select().from(notes).where(and(eq(notes.chapterId, parseInt(chapterId)), eq(notes.userId, req.user!.uid)));
    
    if (existing.length > 0) {
      const result = await db.update(notes)
        .set({ content, updatedAt: new Date() })
        .where(eq(notes.id, existing[0].id))
        .returning();
      res.json(result[0]);
    } else {
      const result = await db.insert(notes).values({
        userId: req.user!.uid,
        chapterId: parseInt(chapterId),
        content
      }).returning();
      res.json(result[0]);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Study Sessions ---
apiRouter.get("/study-sessions", async (req: AuthRequest, res) => {
  try {
    const data = await db.select().from(studySessions)
      .where(eq(studySessions.userId, req.user!.uid))
      .orderBy(desc(studySessions.createdAt));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/study-sessions", async (req: AuthRequest, res) => {
  try {
    const { durationMinutes, subjectId } = req.body;
    const result = await db.insert(studySessions).values({
      userId: req.user!.uid,
      subjectId: subjectId ? parseInt(subjectId) : null,
      durationMinutes: parseInt(durationMinutes)
    }).returning();
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Revisions ---
apiRouter.get("/revisions", async (req: AuthRequest, res) => {
  try {
    const data = await db.select({
      id: revisions.id,
      dueDate: revisions.dueDate,
      status: revisions.status,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
      subjectColor: subjects.color,
      chapterId: chapters.id,
    })
    .from(revisions)
    .innerJoin(chapters, eq(revisions.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(revisions.userId, req.user!.uid))
    .orderBy(desc(revisions.dueDate));
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/revisions", async (req: AuthRequest, res) => {
  try {
    const { chapterId, days } = req.body;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days));

    // Remove any existing pending revision for this chapter to avoid duplicates
    await db.delete(revisions).where(and(
      eq(revisions.chapterId, parseInt(chapterId)),
      eq(revisions.userId, req.user!.uid),
      eq(revisions.status, 'pending')
    ));

    const result = await db.insert(revisions).values({
      userId: req.user!.uid,
      chapterId: parseInt(chapterId),
      dueDate
    }).returning();
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/revisions/:id/complete", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await db.update(revisions)
      .set({ status: 'done' })
      .where(and(eq(revisions.id, parseInt(id)), eq(revisions.userId, req.user!.uid)))
      .returning();
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- AI Mode Quiz & Summary ---
apiRouter.post("/ai/quiz", async (req: AuthRequest, res) => {
  try {
    const { chapterId } = req.body;
    const noteData = await db.select().from(notes).where(and(eq(notes.chapterId, parseInt(chapterId)), eq(notes.userId, req.user!.uid)));
    
    const content = noteData.length > 0 && noteData[0].content.trim() ? noteData[0].content : "Sem conteúdo específico cadastrado ainda. Crie algumas anotações primeiro!";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Gere um resumo estruturado e um simulado de estudos com base nestas anotações do aluno:
      "${content}"`,
      config: {
        systemInstruction: "Você é um professor nativo de português especialista em vestibulares, concursos e estudos de alta performance. Crie explicações claras, amigáveis, precisas e objetivas em português.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Um resumo detalhado em markdown focado nos pontos cruciais do conteúdo."
            },
            flashcards: {
              type: Type.ARRAY,
              description: "Array de exatamente 3 a 5 flashcards contendo conceitos fundamentais.",
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: "Termo ou pergunta curta." },
                  back: { type: Type.STRING, description: "Definição resumida ou resposta direta." }
                },
                required: ["front", "back"]
              }
            },
            questions: {
              type: Type.ARRAY,
              description: "Array de 3 perguntas de múltipla escolha para praticar.",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "Enunciado da questão." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctOptionIndex: { type: Type.INTEGER, description: "Código de resposta (0 a 3)." },
                  explanation: { type: Type.STRING, description: "Explicação rápida de por que a resposta está correta." }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
              }
            },
            trueFalse: {
              type: Type.ARRAY,
              description: "Array de 2 perguntas de Verdadeiro ou Falso.",
              items: {
                type: Type.OBJECT,
                properties: {
                  statement: { type: Type.STRING },
                  isTrue: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING }
                },
                required: ["statement", "isTrue", "explanation"]
              }
            }
          },
          required: ["summary", "flashcards", "questions", "trueFalse"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- AI Mode Custom Exam (Chapter or Full Subject) ---
apiRouter.post("/ai/exam", async (req: AuthRequest, res) => {
  try {
    const { mode, chapterId, subjectId } = req.body;
    let combinedContent = "";
    let titleStr = "";

    if (mode === "chapter") {
      const chapterData = await db.select().from(chapters).where(and(eq(chapters.id, parseInt(chapterId)), eq(chapters.userId, req.user!.uid)));
      if (chapterData.length === 0) {
        return res.status(404).json({ error: "Capítulo não encontrado" });
      }
      titleStr = chapterData[0].title;
      const noteData = await db.select().from(notes).where(and(eq(notes.chapterId, parseInt(chapterId)), eq(notes.userId, req.user!.uid)));
      combinedContent = noteData.length > 0 && noteData[0].content.trim() 
        ? `Capítulo: ${titleStr}\nConteúdo: ${noteData[0].content}` 
        : "";
    } else if (mode === "subject") {
      const subjectData = await db.select().from(subjects).where(and(eq(subjects.id, parseInt(subjectId)), eq(subjects.userId, req.user!.uid)));
      if (subjectData.length === 0) {
        return res.status(404).json({ error: "Matéria não encontrada" });
      }
      titleStr = subjectData[0].name;

      // Pegar todos os capítulos desse caderno
      const chaps = await db.select().from(chapters).where(and(eq(chapters.subjectId, parseInt(subjectId)), eq(chapters.userId, req.user!.uid)));
      
      const contentsList: string[] = [];
      for (const ch of chaps) {
        const noteData = await db.select().from(notes).where(and(eq(notes.chapterId, ch.id), eq(notes.userId, req.user!.uid)));
        if (noteData.length > 0 && noteData[0].content.trim()) {
          contentsList.push(`Capítulo: ${ch.title}\nConteúdo:\n${noteData[0].content}`);
        }
      }
      combinedContent = contentsList.join("\n\n---\n\n");
    } else {
      return res.status(400).json({ error: "Modo de simulação inválido." });
    }

    if (!combinedContent || combinedContent.trim().length < 15) {
      return res.status(400).json({ 
        error: "Suas anotações para este conteúdo estão vazias ou muito curtas. Escreva e salve algumas anotações primeiro!" 
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Gere uma prova de vestibular/concurso avaliativa profissional e de alto nível baseada exclusivamente neste conteúdo do aluno:
      "${combinedContent}"`,
      config: {
        systemInstruction: "Você é um avaliador de provas acadêmicas sênior das principais bancas de concurso do Brasil. Crie uma prova formal, difícil, inteligente, motivadora e totalmente em português sobre os tópicos indicados.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Título oficial e elegante da prova (ex: Provão de Fixação Avançada - BIOLOGIA ou Exame de Nível Geral)."
            },
            questions: {
              type: Type.ARRAY,
              description: "Array de exatamente 5 ou 6 perguntas desafiadoras de múltipla escolha.",
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "O enunciado rigoroso e completo da questão." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista de 4 opções correspondentes às alternativas de resposta."
                  },
                  correctOptionIndex: { type: Type.INTEGER, description: "Apenas o índice da alternativa correta (0 a 3)." },
                  explanation: { type: Type.STRING, description: "Explicação minuciosa da fundamentação teórica da resposta correta." }
                },
                required: ["question", "options", "correctOptionIndex", "explanation"]
              }
            },
            trueFalse: {
              type: Type.ARRAY,
              description: "Array de exatamente 4 afirmações do tipo Verdadeiro ou Falso para julgamento rápido.",
              items: {
                type: Type.OBJECT,
                properties: {
                  statement: { type: Type.STRING, description: "Afirmação complexa sobre o assunto." },
                  isTrue: { type: Type.BOOLEAN, description: "Se o fato julgado é Verdadeiro ou Falso." },
                  explanation: { type: Type.STRING, description: "Análise da verdade ou erro envolvido." }
                },
                required: ["statement", "isTrue", "explanation"]
              }
            }
          },
          required: ["title", "questions", "trueFalse"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- AI Mode Custom Flashcards (Chapter or Full Subject) ---
apiRouter.post("/ai/flashcards", async (req: AuthRequest, res) => {
  try {
    const { mode, chapterId, subjectId } = req.body;
    let combinedContent = "";

    if (mode === "chapter") {
      const chapterData = await db.select().from(chapters).where(and(eq(chapters.id, parseInt(chapterId)), eq(chapters.userId, req.user!.uid)));
      if (chapterData.length === 0) {
        return res.status(404).json({ error: "Capítulo não encontrado" });
      }
      const noteData = await db.select().from(notes).where(and(eq(notes.chapterId, parseInt(chapterId)), eq(notes.userId, req.user!.uid)));
      combinedContent = noteData.length > 0 && noteData[0].content.trim() 
        ? `Capítulo: ${chapterData[0].title}\nConteúdo: ${noteData[0].content}` 
        : "";
    } else if (mode === "subject") {
      const subjectData = await db.select().from(subjects).where(and(eq(subjects.id, parseInt(subjectId)), eq(subjects.userId, req.user!.uid)));
      if (subjectData.length === 0) {
        return res.status(404).json({ error: "Matéria não encontrada" });
      }

      // Pegar todos os capítulos desse caderno
      const chaps = await db.select().from(chapters).where(and(eq(chapters.subjectId, parseInt(subjectId)), eq(chapters.userId, req.user!.uid)));
      
      const contentsList: string[] = [];
      for (const ch of chaps) {
        const noteData = await db.select().from(notes).where(and(eq(notes.chapterId, ch.id), eq(notes.userId, req.user!.uid)));
        if (noteData.length > 0 && noteData[0].content.trim()) {
          contentsList.push(`Capítulo: ${ch.title}\nConteúdo:\n${noteData[0].content}`);
        }
      }
      combinedContent = contentsList.join("\n\n---\n\n");
    } else {
      return res.status(400).json({ error: "Modo inválido." });
    }

    if (!combinedContent || combinedContent.trim().length < 15) {
      return res.status(400).json({ 
        error: "Suas anotações para este conteúdo estão vazias ou muito curtas (precisam ter ao menos 15 caracteres). Escreva e salve algumas anotações primeiro!" 
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analise as seguintes anotações do aluno e gere de 8 a 15 de flashcards de alta qualidade, focados na memorização eficiente de conceitos fundamentais, fórmulas ou dados cruciais:
      "${combinedContent}"`,
      config: {
        systemInstruction: "Você é um professor universitário dedicado a criar ótimos recursos autodidáticos para memorização eficiente por flashcards de repetição espaçada. Forneça perguntas claras na frente e respostas objetivas mas completas no verso, totalmente em português brasileiro.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              description: "Array de flashcards recomendados para memorização ativa.",
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: "Conceito, termo ou pergunta curta." },
                  back: { type: Type.STRING, description: "Explicação ou resposta direta para o verso do card." }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["flashcards"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Reset Data ---
apiRouter.post("/reset", async (req: AuthRequest, res) => {
  try {
    await db.delete(revisions).where(eq(revisions.userId, req.user!.uid));
    await db.delete(studySessions).where(eq(studySessions.userId, req.user!.uid));
    await db.delete(notes).where(eq(notes.userId, req.user!.uid));
    await db.delete(chapters).where(eq(chapters.userId, req.user!.uid));
    await db.delete(subjects).where(eq(subjects.userId, req.user!.uid));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

