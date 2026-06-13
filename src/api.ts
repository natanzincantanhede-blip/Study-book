import { Request, Response, Router } from "express";
import { requireAuth, AuthRequest } from "./middleware/auth.ts";
import { db } from "./db/index.ts";
import { subjects, chapters, notes, users, studySessions, revisions } from "./db/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateUser } from "./db/users.ts";

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

