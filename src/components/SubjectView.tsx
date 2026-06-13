import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, FileText, ChevronRight, Sparkles, GraduationCap } from 'lucide-react';
import NotesEditor from './NotesEditor';
import AIEnhancedExam from './AIEnhancedExam';

interface SubjectViewProps {
  user: User;
  subject: any;
  studySessions?: any[];
  onBack: () => void;
}

export default function SubjectView({ user, subject, studySessions = [], onBack }: SubjectViewProps) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [newChapter, setNewChapter] = useState('');
  const [activeChapter, setActiveChapter] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chapters' | 'exams'>('chapters');

  const subjectMinutes = studySessions
    .filter((s: any) => s.subjectId === subject.id)
    .reduce((acc: number, curr: any) => acc + (curr.durationMinutes || 0), 0);
  const subjectHours = (subjectMinutes / 60).toFixed(1);

  useEffect(() => {
    // Carregar capítulos cacheados na memória do celular imediatamente para carregamento imediato
    const cached = localStorage.getItem(`studybook_chapters_${subject.id}`);
    if (cached) {
      try {
        setChapters(JSON.parse(cached));
      } catch (e) {
        console.error("Erro ao carregar capítulos cacheados:", e);
      }
    }
    fetchChapters();
  }, [subject.id]);

  const fetchChapters = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/subjects/${subject.id}/chapters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao carregar capítulos da matéria.');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setChapters(data);
        localStorage.setItem(`studybook_chapters_${subject.id}`, JSON.stringify(data));

        // CRITICAL: Se o usuário estiver editando um capítulo otimista (ID negativo),
        // sincroniza o ID dele com o ID real persistido no banco de dados e migra seu localStorage.
        if (activeChapter && activeChapter.id < 0) {
          const synced = data.find((c: any) => c.title === activeChapter.title);
          if (synced) {
            const tempId = activeChapter.id;
            const realId = synced.id;

            // Migra Notas
            const notesVal = localStorage.getItem(`studybook_notes_${tempId}`);
            if (notesVal !== null) {
              localStorage.setItem(`studybook_notes_${realId}`, notesVal);
              localStorage.removeItem(`studybook_notes_${tempId}`);
            }

            // Migra Flashcards
            const fcVal = localStorage.getItem(`studybook_manual_flashcards_${tempId}`);
            if (fcVal !== null) {
              localStorage.setItem(`studybook_manual_flashcards_${realId}`, fcVal);
              localStorage.removeItem(`studybook_manual_flashcards_${tempId}`);
            }

            setActiveChapter(synced);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Membro não pôde se comunicar com o banco de dados.');
    }
  };

  const createChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapter.trim()) return;
    setError(null);

    // Adição otimista instantânea no celular
    const tempId = -Date.now();
    const optimisticChapter = {
      id: tempId,
      title: newChapter,
      subjectId: subject.id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedChapters = [...chapters, optimisticChapter];
    setChapters(updatedChapters);
    localStorage.setItem(`studybook_chapters_${subject.id}`, JSON.stringify(updatedChapters));
    setNewChapter('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/subjects/${subject.id}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: optimisticChapter.title })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ops! Erro de comunicação ou banco de dados.');
      }

      fetchChapters();
    } catch (err: any) {
      console.error(err);
      if (!navigator.onLine) {
        // Se estiver off-line, mantém o capítulo localmente e adiciona na fila
        const pending = JSON.parse(localStorage.getItem(`studybook_pending_chapters_${subject.id}`) || '[]');
        pending.push(optimisticChapter);
        localStorage.setItem(`studybook_pending_chapters_${subject.id}`, JSON.stringify(pending));
      } else {
        // Reverter se der errado e houver internet
        const rolledBack = chapters.filter(c => c.id !== tempId);
        setChapters(rolledBack);
        localStorage.setItem(`studybook_chapters_${subject.id}`, JSON.stringify(rolledBack));
        setError(err.message || 'Houve um erro ao tentar salvar o capítulo. Ele foi removido.');
      }
    }
  };

  const deleteChapter = async (id: number) => {
    setError(null);
    // Deleção otimista instantânea no celular
    const filtered = chapters.filter(c => c.id !== id);
    setChapters(filtered);
    localStorage.setItem(`studybook_chapters_${subject.id}`, JSON.stringify(filtered));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chapters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao excluir o capítulo.');
      }

      fetchChapters();
    } catch (err: any) {
      console.error(err);
      // Se falhar de verdade, o próximo fetch atualiza o estado
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-[#F9F8F3] w-full">
      <AnimatePresence mode="wait">
        {activeChapter ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full w-full"
          >
            <NotesEditor user={user} chapter={activeChapter} subject={subject} onBack={() => setActiveChapter(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-12 w-full max-w-5xl mx-auto flex-1 flex flex-col"
          >
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={onBack}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1 font-medium">
                  <span>Matérias</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-indigo-600">{subject.name}</span>
                </div>
                <h1 className="text-3xl font-serif font-bold text-slate-900">{subject.name}</h1>
              </div>
            </div>

            {/* Tabs de Navegação da Matéria */}
            <div className="flex border-b border-slate-200 mb-6 gap-6">
              <button
                type="button"
                onClick={() => setViewMode('chapters')}
                className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
                  viewMode === 'chapters' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Capítulos ({chapters.length})
                {viewMode === 'chapters' && (
                  <motion.div layoutId="subjectViewUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewMode('exams')}
                className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'exams' ? 'text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Provão Simulados IA
                {viewMode === 'exams' && (
                  <motion.div layoutId="subjectViewUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Content Panel */}
              <div className="md:col-span-8 flex flex-col gap-6">
                {viewMode === 'chapters' ? (
                  <>
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-800 text-xs py-3.5 px-4 rounded-xl flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold">Ocorreu um problema:</p>
                          <p className="mt-0.5 opacity-90">{error}</p>
                        </div>
                        <button 
                          onClick={() => setError(null)} 
                          className="ml-3 font-semibold text-red-400 hover:text-red-700 transition-colors"
                        >
                          Dispensar
                        </button>
                      </div>
                    )}

                    <form onSubmit={createChapter} className="flex gap-2">
                      <input
                         type="text"
                         placeholder="Novo capítulo (ex: Frações)"
                         className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                         value={newChapter}
                         onChange={(e) => setNewChapter(e.target.value)}
                      />
                      <button type="submit" disabled={!newChapter.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center">
                        <Plus className="w-5 h-5" />
                      </button>
                    </form>

                    <div className="flex flex-col gap-3">
                      <AnimatePresence>
                        {chapters.map((chapter, index) => (
                          <motion.div
                            key={chapter.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            onClick={() => setActiveChapter(chapter)}
                            className="group flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm hover:border-indigo-200 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-slate-300 font-mono text-sm w-6 text-center font-bold">
                                {index + 1}
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900">{chapter.title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Última edição hoje</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {chapters.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                          <p className="text-slate-500 font-medium">Nenhum capítulo ainda.</p>
                          <p className="text-xs text-slate-400 mt-1">Crie o primeiro capítulo acima.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <AIEnhancedExam user={user} subject={subject} chapters={chapters} />
                )}
              </div>

              {/* Sidebar Info */}
              <div className="md:col-span-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider text-[10px]">Estatísticas da Matéria</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-400 font-medium font-mono uppercase">Capítulos</p>
                        <p className="text-2xl font-bold text-slate-900 font-serif">{chapters.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium font-mono uppercase">Horas Estudadas</p>
                        <p className="text-2xl font-bold text-slate-900 font-serif">{subjectHours}h</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'chapters' ? 'exams' : 'chapters')}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        viewMode === 'exams'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      {viewMode === 'exams' ? (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Voltar para Capítulos</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span>Iniciar Provão IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
