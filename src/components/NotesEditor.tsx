import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Cloud, 
  Brain, 
  Calendar, 
  Check, 
  X, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Sparkles, 
  BookOpen, 
  Award, 
  Download, 
  HelpCircle,
  ThumbsUp,
  RotateCcw
} from 'lucide-react';

interface NotesEditorProps {
  user: User;
  chapter: any;
  subject: any;
  onBack: () => void;
}

type TabType = 'notes' | 'flashcards' | 'revisions';

function renderCustomMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-3 font-sans text-sm text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return <h1 key={idx} className="text-lg md:text-xl font-bold font-serif text-indigo-950 pt-3 border-b pb-1 border-indigo-100/50">{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={idx} className="text-base font-bold font-serif text-slate-850 pt-2">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={idx} className="text-sm font-bold text-slate-800 pt-2">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-500 font-bold shrink-0 mt-1">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (trimmed === '') return <div key={idx} className="h-2"></div>;
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

export default function NotesEditor({ user, chapter, subject, onBack }: NotesEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loadingNote, setLoadingNote] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errorSaving, setErrorSaving] = useState<string | null>(null);
  
  // Card progress
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Revision plan states
  const [activeRevision, setActiveRevision] = useState<any | null>(null);
  const [schedulingDays, setSchedulingDays] = useState<number | null>(null);

  // Estados dos Flashcards Manuais do Usuário
  const [manualFlashcards, setManualFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [editingCardIdx, setEditingCardIdx] = useState<number | null>(null);
  const [flashcardViewMode, setFlashcardViewMode] = useState<'study' | 'manage'>('study');

  // Gerenciador offline-first de Flashcards Manuais
  const saveManualFlashcards = (updatedCards: { front: string; back: string }[]) => {
    setManualFlashcards(updatedCards);
    localStorage.setItem(`studybook_manual_flashcards_${chapter.id}`, JSON.stringify(updatedCards));
  };

  const handleAddManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim()) return;

    const cardData = { front: newCardFront.trim(), back: newCardBack.trim() };
    let updated: { front: string; back: string }[] = [];

    if (editingCardIdx !== null) {
      updated = [...manualFlashcards];
      updated[editingCardIdx] = cardData;
      setEditingCardIdx(null);
    } else {
      updated = [...manualFlashcards, cardData];
    }

    saveManualFlashcards(updated);
    setNewCardFront('');
    setNewCardBack('');
    setShowAddCard(false);

    // Selecionar o card criado se for o primeiro, ou focar nele
    if (manualFlashcards.length === 0) {
      setCurrentCardIndex(0);
      setIsCardFlipped(false);
    }
  };

  const handleDeleteManualCard = (indexIdx: number) => {
    const updated = manualFlashcards.filter((_, idx) => idx !== indexIdx);
    saveManualFlashcards(updated);
    if (currentCardIndex >= updated.length && updated.length > 0) {
      setCurrentCardIndex(updated.length - 1);
    }
    setIsCardFlipped(false);
  };

  const handleEditManualCardBegin = (indexIdx: number) => {
    const card = manualFlashcards[indexIdx];
    setNewCardFront(card.front);
    setNewCardBack(card.back);
    setEditingCardIdx(indexIdx);
    setShowAddCard(true);
  };

  useEffect(() => {
    // Reset scroll positions of any parent container to ensure the editor is fully visible at top
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, [class*="overflow-y-auto"]');
    scrollContainers.forEach(container => {
      container.scrollTop = 0;
    });
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Carregar na memória do celular imediatamente antes de bater no banco de dados!
    const cachedNote = localStorage.getItem(`studybook_notes_${chapter.id}`);
    if (cachedNote !== null) {
      setContent(cachedNote);
      setOriginalContent(cachedNote);
      setLoadingNote(false); // Já temos algo pronto para mostrar instantaneamente!
    } else {
      setContent('');
      setOriginalContent('');
      setLoadingNote(true);
    }

    // Carregar flashcards manuais do LocalStorage
    const cachedManual = localStorage.getItem(`studybook_manual_flashcards_${chapter.id}`);
    if (cachedManual) {
      try {
        const parsed = JSON.parse(cachedManual);
        setManualFlashcards(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Erro ao ler flashcards manuais:", e);
        setManualFlashcards([]);
      }
    } else {
      setManualFlashcards([]);
    }

    // Resetar posições de estudo dos flashcards
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setFlashcardViewMode('study');
    setShowAddCard(false);

    fetchNote();
    fetchActiveRevision();
  }, [chapter.id]);

  const fetchNote = async () => {
    setErrorSaving(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chapters/${chapter.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Falha ao obter anotações.');
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setContent(data[0].content);
        setOriginalContent(data[0].content);
        localStorage.setItem(`studybook_notes_${chapter.id}`, data[0].content);
      } else {
        setContent('');
        setOriginalContent('');
        localStorage.setItem(`studybook_notes_${chapter.id}`, '');
      }
    } catch (err: any) {
      console.error(err);
      // Mantém as notas locais se falhar a rede
    } finally {
      setLoadingNote(false);
    }
  };

  const fetchActiveRevision = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/revisions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        // Find if they have a pending or active revision for this chapter
        const findRev = data.find((r: any) => r.chapterId === chapter.id && r.status === 'pending');
        setActiveRevision(findRev || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveNote = async (textToSave: string = content) => {
    setSaving(true);
    setErrorSaving(null);
    // Armazenar local primeiro por segurança na memória do celular
    localStorage.setItem(`studybook_notes_${chapter.id}`, textToSave);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chapters/${chapter.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: textToSave })
      });
      if (!res.ok) {
        throw new Error('Erro ao salvar as anotações.');
      }
      setOriginalContent(textToSave);
      setLastSaved(new Date());
    } catch (err: any) {
      console.error(err);
      setErrorSaving('Salvo localmente na memória do celular.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loadingNote) return;
    if (content === originalContent) return;

    // Salvar local no celular imediatamente ao digitar!
    localStorage.setItem(`studybook_notes_${chapter.id}`, content);

    const handler = setTimeout(() => {
      saveNote(content);
    }, 1500);

    return () => clearTimeout(handler);
  }, [content, loadingNote, originalContent]);

  const downloadNoteAsMarkdown = () => {
    try {
      const element = document.createElement("a");
      const file = new Blob([
        `# ${chapter.title}\n`,
        `**Matéria:** ${subject.name}\n`,
        `**Data de Exportação:** ${new Date().toLocaleDateString()}\n\n`,
        content || "Nenhuma anotação registrada ainda."
      ], { type: 'text/markdown;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${subject.name}_${chapter.title}.md`.replace(/\s+/g, '_');
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Falha ao baixar arquivo:", err);
    }
  };

  // Schedule a revision task
  const scheduleRevision = async (days: number) => {
    setSchedulingDays(days);
    try {
      const token = await user.getIdToken();
      await fetch('/api/revisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ chapterId: chapter.id, days })
      });
      fetchActiveRevision();
    } catch (err) {
      console.error(err);
    } finally {
      setSchedulingDays(null);
    }
  };

  const handleBack = async () => {
    if (content !== originalContent && !loadingNote) {
      try {
        await saveNote(content);
      } catch (err) {
        console.error('Falha ao salvar notas antes de sair:', err);
      }
    }
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#fdfdfc]">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white shadow-xs z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">{subject.name}</span>
            <span className="text-sm font-semibold text-slate-800 leading-none">{chapter.title}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button 
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'notes' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Anotações
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('flashcards')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'flashcards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            Flashcards
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('revisions')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'revisions' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Revisão
          </button>
        </div>

        {/* Status Indicators & Manual Save/Export Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'notes' && (
            <div className="flex items-center gap-2">
              {!loadingNote && (
                <button
                  type="button"
                  onClick={downloadNoteAsMarkdown}
                  className="px-2 py-1 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors"
                  title="Baixar anotações como Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
              )}
              {errorSaving && (
                <span className="text-xs text-red-500 bg-red-50 border border-red-100 px-2 py-1 rounded-md max-w-[120px] truncate" title={errorSaving}>
                  {errorSaving}
                </span>
              )}
              {saving ? (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium font-mono">
                  <Cloud className="w-4 h-4 animate-pulse text-indigo-500" /> Salvando...
                </span>
              ) : content !== originalContent && !loadingNote ? (
                <button
                  type="button"
                  onClick={() => saveNote(content)}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all"
                >
                  Salvar rascunho
                </button>
              ) : lastSaved ? (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium font-mono">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Salvo {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </header>

      {/* Editor Main Canvas */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col h-full min-h-[500px] max-w-4xl mx-auto w-full px-6 py-8 md:px-16 md:py-12">
            {loadingNote ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2.5 py-20 min-h-[350px]">
                <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Carregando livro de anotações...</span>
              </div>
            ) : (
              <textarea
                className="w-full flex-1 min-h-[400px] resize-none outline-none font-sans text-lg leading-relaxed text-slate-700 bg-transparent placeholder:text-slate-300"
                placeholder="Comece a digitar os pontos fortes e importantes da matéria aqui... O sistema salvará e permitirá que você organize revisões e crie flashcards!"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
            
            {/* Seletor/Controle de Flashcards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
              
              {/* Cabeçalho */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-500 shrink-0" />
                  <h3 className="text-lg font-bold text-slate-800 font-sans leading-none">Fichas de Memorização (Flashcards)</h3>
                </div>
              </div>

              {/* Botões de visualização se houver mais de 0 cards */}
              {manualFlashcards.length > 0 && !showAddCard && (
                <div className="flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFlashcardViewMode('study')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      flashcardViewMode === 'study' 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                    }`}
                  >
                    Estudar Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlashcardViewMode('manage')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                      flashcardViewMode === 'manage' 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50'
                    }`}
                  >
                    Gerenciar Cards ({manualFlashcards.length})
                  </button>
                </div>
              )}

              {/* Formulário de Adicionar/Editar */}
              {showAddCard ? (
                <form onSubmit={handleAddManualCard} className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">
                    {editingCardIdx !== null ? 'Editar Flashcard' : 'Adicionar Novo Flashcard'}
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Frente (Conceito, Pergunta ou Termo)</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-800 font-medium placeholder:text-slate-350 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-sans"
                        placeholder="Ex: O que é Citoplasma?"
                        value={newCardFront}
                        onChange={(e) => setNewCardFront(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Verso (Explicação ou Resposta)</label>
                      <textarea
                        required
                        rows={3}
                        className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-800 font-medium placeholder:text-slate-350 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none font-sans"
                        placeholder="Ex: Espaço celular delimitado pela membrana plasmática onde se encontram o citosol e as organelas."
                        value={newCardBack}
                        onChange={(e) => setNewCardBack(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 text-xs font-bold pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCard(false);
                        setEditingCardIdx(null);
                        setNewCardFront('');
                        setNewCardBack('');
                      }}
                      className="px-3 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {editingCardIdx !== null ? 'Salvar Alteração' : 'Criar Card'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Exibição normal ou Estudo ou Lista */
                <>
                  {manualFlashcards.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-150 text-center space-y-4">
                      <Brain className="w-8 h-8 text-indigo-400 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Nenhum flashcard criado</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Adicione suas próprias fórmulas, conceitos ou perguntas-chave para consolidação de estudos.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddCard(true)}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Criar Primeiro Flashcard
                      </button>
                    </div>
                  ) : flashcardViewMode === 'manage' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Minhas Fichas ({manualFlashcards.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowAddCard(true)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 py-1 px-2 rounded hover:bg-indigo-50 text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar Outro Card
                        </button>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50">
                        {manualFlashcards.map((card, idx) => (
                          <div key={idx} className="p-4 flex items-start justify-between gap-4 bg-white hover:bg-slate-50 transition-colors">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">FRENTE</span>
                                <span className="text-xs font-semibold text-slate-800 break-words">{card.front}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">VERSO</span>
                                <span className="text-xs text-slate-500 break-words">{card.back}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditManualCardBegin(idx)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                                title="Editar Card"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteManualCard(idx)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                                title="Deletar Card"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const validIdx = Math.min(currentCardIndex, manualFlashcards.length - 1);
                      const safeIdx = validIdx < 0 ? 0 : validIdx;

                      return (
                        <div className="space-y-4 font-sans">
                          <div className="flex items-center justify-between text-xs text-slate-400 font-mono font-bold px-1">
                            <span>Modo Treino Ativo</span>
                            <span>Card {safeIdx + 1} de {manualFlashcards.length}</span>
                          </div>

                          <div 
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                            className={`min-h-[200px] md:min-h-[220px] rounded-2xl border-2 flex flex-col items-center justify-center p-6 md:p-8 text-center cursor-pointer select-none transition-all duration-350 shadow-xs ${
                              isCardFlipped 
                                ? 'bg-slate-900 border-indigo-400 text-slate-50' 
                                : 'bg-indigo-50/20 border-indigo-100 hover:bg-indigo-50/35 text-slate-800'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3 font-mono">
                              {isCardFlipped ? "Resposta (Verso)" : "Conceito (Frente)"}
                            </span>
                            <p className="text-sm md:text-base font-bold text-slate-850 px-2 leading-relaxed">
                              {isCardFlipped 
                                ? manualFlashcards[safeIdx]?.back 
                                : manualFlashcards[safeIdx]?.front}
                            </p>
                            <span className="text-[10px] text-indigo-500 font-bold mt-6 animate-pulse uppercase tracking-wider font-mono">
                              Toque para {isCardFlipped ? "ver a frente" : "revelar resposta"}
                            </span>
                          </div>

                          {/* Barra de Navegação dos Cards */}
                          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <button
                              type="button"
                              disabled={safeIdx === 0}
                              onClick={() => {
                                setCurrentCardIndex(safeIdx - 1);
                                setIsCardFlipped(false);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              Anterior
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCardFlipped(!isCardFlipped);
                              }}
                              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-350 rounded-lg text-xs font-extrabold text-slate-700 transition-all cursor-pointer"
                            >
                              Girar Card
                            </button>
                            <button
                              type="button"
                              disabled={safeIdx === (manualFlashcards.length - 1)}
                              onClick={() => {
                                setCurrentCardIndex(safeIdx + 1);
                                setIsCardFlipped(false);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-850 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              Próximo <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-center pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddCard(true)}
                              className="text-xs text-indigo-600 hover:text-indigo-850 font-bold underline cursor-pointer"
                            >
                              + Adicionar outro card manual
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'revisions' && (
          <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-800">Método de Repetição Espaçada</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Para consolidar o aprendizado deste capítulo à sua memória de longo prazo, utilize a repetição espaçada. O sistema colocará avisos e tarefas de estudos no seu painel nos dias corretos.
              </p>

              {activeRevision ? (
                <div className="bg-green-50 border border-green-200 p-5 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-800">Revisão Agendada Ativa</h4>
                    <p className="text-xs text-green-600 mt-1">
                      Você agendou uma revisão para este conteúdo para o dia <span className="font-bold">{new Date(activeRevision.dueDate).toLocaleDateString()}</span>. Ela aparecerá em suas pendências.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-center">
                  <p className="text-xs text-slate-400 font-medium font-mono uppercase mb-4">Selecione o Intervalo para Revisão:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[1, 3, 7, 15, 30].map((days) => (
                      <button
                        key={days}
                        disabled={schedulingDays !== null}
                        onClick={() => scheduleRevision(days)}
                        className="py-3 px-2 border border-slate-220 rounded-xl bg-white text-xs font-bold text-slate-700 hover:border-indigo-600 hover:text-indigo-600 active:scale-95 transition-all cursor-pointer"
                      >
                        {schedulingDays === days ? "Aguarde..." : `${days} ${days === 1 ? 'Dia' : 'Dias'}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Dicas de Estudos</h4>
              <ul className="space-y-3 mt-4 text-xs text-slate-500 leading-relaxed list-disc list-inside">
                <li><strong className="text-slate-700">1 Dia:</strong> Ideal para preencher lacunas de fixação rápida inicial.</li>
                <li><strong className="text-slate-700">7 Dias:</strong> Ideal para recuperar conteúdos complexos que exigem esforço.</li>
                <li><strong className="text-slate-700">30 Dias:</strong> Perfeito para revisões gerais antes de provas maiores.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
