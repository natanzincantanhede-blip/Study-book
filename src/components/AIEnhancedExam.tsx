import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { 
  Sparkles, 
  HelpCircle, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  X, 
  Award, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';

interface AIEnhancedExamProps {
  user: User;
  subject: any;
  chapters: any[];
  onBack?: () => void;
}

interface Question {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface TrueFalseQuestion {
  statement: string;
  isTrue: boolean;
  explanation: string;
}

interface ExamData {
  title: string;
  questions: Question[];
  trueFalse: TrueFalseQuestion[];
}

export default function AIEnhancedExam({ user, subject, chapters, onBack }: AIEnhancedExamProps) {
  const [mode, setMode] = useState<'selection' | 'testing' | 'result'>('selection');
  const [examType, setExamType] = useState<'chapter' | 'subject'>('chapter');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamData | null>(null);

  // User responses
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [tfAnswers, setTfAnswers] = useState<{ [key: number]: boolean }>({});

  const handleGenerateExam = async () => {
    if (examType === 'chapter' && !selectedChapterId) {
      setError("Por favor, selecione um capítulo antes de iniciar.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswers({});
    setTfAnswers({});
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/ai/exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: examType,
          chapterId: examType === 'chapter' ? parseInt(selectedChapterId) : undefined,
          subjectId: examType === 'subject' ? subject.id : undefined
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível gerar a prova. Verifique se suas anotações possuem conteúdo.");
      }

      const data = await res.json();
      setExamData(data);
      setMode('testing');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao gerar prova com IA. Tente salvar suas anotações primeiro.");
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = () => {
    if (!examData) return 0;
    
    let mcCorrect = 0;
    let tfCorrect = 0;

    examData.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOptionIndex) {
        mcCorrect++;
      }
    });

    examData.trueFalse.forEach((q, idx) => {
      if (tfAnswers[idx] === q.isTrue) {
        tfCorrect++;
      }
    });

    const totalQuestions = examData.questions.length + examData.trueFalse.length;
    if (totalQuestions === 0) return 0;

    // Standard school grade from 0 to 10
    const mcWeight = 6 / (examData.questions.length || 1);
    const tfWeight = 4 / (examData.trueFalse.length || 1);

    const grade = (mcCorrect * mcWeight) + (tfCorrect * tfWeight);
    return parseFloat(grade.toFixed(1));
  };

  const handleReset = () => {
    setMode('selection');
    setExamData(null);
    setAnswers({});
    setTfAnswers({});
    setError(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-850 flex items-center gap-1.5">
              Provão Inteligentemente Gerativo <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase font-mono tracking-wider">Gemini IA</span>
            </h2>
            <p className="text-xs text-slate-400">Teste de performance acadêmica sobre o seu material de estudos</p>
          </div>
        </div>
        {mode !== 'selection' && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 hover:bg-slate-150 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Outro Simulado
          </button>
        )}
      </div>

      {mode === 'selection' && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione o Alcance da Prova</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setExamType('chapter'); setError(null); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  examType === 'chapter' 
                    ? 'border-indigo-600 bg-indigo-50/10' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-xl">1️⃣</span>
                  <p className="font-bold text-sm text-slate-850">Modo 1: Capítulo Único</p>
                </div>
                <p className="text-xs text-slate-400 leading-normal">Gera uma prova de fixação cirúrgica com foco estrito em apenas uma de suas anotações.</p>
              </button>

              <button
                type="button"
                onClick={() => { setExamType('subject'); setError(null); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  examType === 'subject' 
                    ? 'border-indigo-600 bg-indigo-50/10' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-xl">🏆</span>
                  <p className="font-bold text-sm text-slate-850">Modo 2: Matéria Completa</p>
                </div>
                <p className="text-xs text-slate-400 leading-normal">Intercala conteúdos e anotações de todos os capítulos deste caderno em um exame compreensivo.</p>
              </button>
            </div>
          </div>

          {examType === 'chapter' && (
            <div className="animate-fade-in">
              <label htmlFor="chapter-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Qual capítulo você deseja testar?</label>
              <select
                id="chapter-select"
                value={selectedChapterId}
                onChange={(e) => { setSelectedChapterId(e.target.value); setError(null); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 text-sm font-medium outline-none focus:border-indigo-500 bg-white shadow-3xs"
              >
                <option value="">-- Escolha um capítulo das anotações --</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs py-3.5 px-4 rounded-xl flex items-start gap-2 max-w-xl font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono max-w-sm">
              Obs: Apenas capítulos com anotações salvas serão considerados para as questões do provão.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateExam}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer select-none transition-all active:scale-95 shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                  <span>Gerando Prova Inteligente...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>Iniciar Provão</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {mode === 'testing' && examData && (
        <div className="space-y-8 animate-fade-in">
          {/* Official Layout Exam Header */}
          <div className="bg-slate-50 border border-slate-150 p-4 md:p-6 rounded-xl text-center">
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full inline-block mb-2 font-mono">Simulação Oficial</div>
            <h3 className="text-base font-serif font-extrabold text-slate-900">{examData.title}</h3>
            <p className="text-xs text-slate-400 mt-1">Candidato: {user.email || 'Estudante Ativo'} • Matéria: {subject.name}</p>
          </div>

          {/* Part A: Multiple Choice Questions */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-indigo-850 uppercase tracking-widest border-b border-indigo-100/50 pb-1 flex items-center gap-1.5 font-mono">
              <FileText className="w-4 h-4 text-indigo-500" /> PARTE I: QUESTÕES DE MÚLTIPLA ESCOLA (Peso: 6.0)
            </h4>

            {examData.questions.map((q, qIdx) => (
              <div key={qIdx} className="border border-slate-150 rounded-xl p-5 space-y-4 bg-white hover:border-slate-300 transition-colors">
                <p className="text-sm font-bold text-slate-850 flex gap-2 leading-relaxed">
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-mono h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{qIdx + 1}</span>
                  <span>{q.question}</span>
                </p>

                <div className="grid grid-cols-1 gap-2 pl-7">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = answers[qIdx] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                        }}
                        className={`text-left text-xs p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-505 text-indigo-900 font-semibold shadow-3xs' 
                            : 'bg-slate-50 border-slate-150/50 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-[9px] leading-none shrink-0 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Part B: True/False Challenges */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-indigo-850 uppercase tracking-widest border-b border-indigo-100/50 pb-1 flex items-center gap-1.5 font-mono">
              <Award className="w-4 h-4 text-indigo-500" /> PARTE II: JULGAMENTO DE AFIRMAÇÕES DE V/F (Peso: 4.0)
            </h4>

            {examData.trueFalse.map((q, qIdx) => (
              <div key={qIdx} className="border border-slate-150 rounded-xl p-5 space-y-4 bg-white hover:border-slate-300 transition-colors">
                <p className="text-sm font-bold text-slate-850 flex gap-2 leading-relaxed">
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-mono h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{qIdx + 1}</span>
                  <span>{q.statement}</span>
                </p>

                <div className="flex gap-3 pl-7">
                  {[true, false].map((choice) => {
                    const isSelected = tfAnswers[qIdx] === choice;
                    return (
                      <button
                        key={choice ? "V" : "F"}
                        type="button"
                        onClick={() => {
                          setTfAnswers(prev => ({ ...prev, [qIdx]: choice }));
                        }}
                        className={`flex-1 text-center font-bold text-xs p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-505 text-indigo-900 font-semibold shadow-3xs' 
                            : 'bg-slate-50 border-slate-150/50 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        {choice ? "Verdadeiro" : "Falso"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action bottom */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-[10px] text-slate-400 max-w-md font-mono">
              Revise suas escolhas antes de finalizar. O professor IA corrigirá as respostas instantaneamente após o envio.
            </p>
            <button
              type="button"
              onClick={() => setMode('result')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-6 rounded-xl cursor-pointer select-none transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" /> Entregar Prova
            </button>
          </div>
        </div>
      )}

      {mode === 'result' && examData && (
        <div className="space-y-8 animate-fade-in pb-4">
          
          {/* Result Grade Card */}
          {(() => {
            const grade = calculateGrade();
            let colorClass = "from-emerald-500 to-teal-600";
            let remark = "Excelente desempenho acadêmico!";
            let sticker = "🏆";

            if (grade < 5.0) {
              colorClass = "from-red-500 to-rose-600";
              remark = "Foco e revisão necessários nas anotações.";
              sticker = "📚";
            } else if (grade < 7.5) {
              colorClass = "from-amber-500 to-orange-600";
              remark = "Parabéns! Desempenho satisfatório com pontos a ajustar.";
              sticker = "🥈";
            }

            return (
              <div className={`p-6 md:p-8 rounded-2xl bg-gradient-to-br ${colorClass} text-white shadow-md relative overflow-hidden`}>
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-15 select-none font-extrabold">{sticker}</div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left space-y-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full font-mono">Exame Corrigido pela IA</span>
                    <h3 className="text-xl md:text-2xl font-serif font-extrabold">{examData.title}</h3>
                    <p className="text-sm opacity-90 font-medium">{remark}</p>
                    <p className="text-xs opacity-75">Todas as questões foram analisadas detalhadamente com feedbacks didáticos.</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/20 text-center min-w-[130px] shrink-0">
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-85">Nota Final</p>
                    <p className="text-4xl font-serif font-extrabold mt-1">{grade}</p>
                    <p className="text-[9px] opacity-75 mt-0.5">Escala 0,0 a 10,0</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Graded Details List */}
          <div className="space-y-6">
            <h4 className="text-xs font-bold text-indigo-850 uppercase tracking-widest border-b border-indigo-100/50 pb-1 flex items-center gap-1.5 font-mono">
              <BookOpen className="w-4 h-4 text-indigo-500" /> GABARITO E CORREÇÃO COMENTADA
            </h4>

            {/* Questions review */}
            <div className="space-y-6">
              <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-2">Múltipla Escolha</h5>
              
              {examData.questions.map((q, qIdx) => {
                const userSelected = answers[qIdx];
                const isCorrect = userSelected === q.correctOptionIndex;

                return (
                  <div key={qIdx} className={`border rounded-xl p-5 space-y-4 ${
                    isCorrect ? 'border-green-200 bg-green-50/10' : 'border-red-150 bg-rose-50/10'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-850 flex gap-2 leading-relaxed">
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-mono h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{qIdx + 1}</span>
                        <span>{q.question}</span>
                      </p>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full select-none shrink-0 font-mono">
                          <Check className="w-3.5 h-3.5" /> CORRETO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-full select-none shrink-0 font-mono">
                          <X className="w-3.5 h-3.5" /> INCORRETO
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isThisCorrect = optIdx === q.correctOptionIndex;
                        const isThisSelected = userSelected === optIdx;

                        let styleClass = "border-slate-150 bg-slate-50";
                        if (isThisCorrect) {
                          styleClass = "border-green-500 bg-green-50 text-green-950 font-semibold";
                        } else if (isThisSelected) {
                          styleClass = "border-red-400 bg-rose-50 text-red-950";
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`text-xs p-3 rounded-lg border flex items-center gap-3 ${styleClass}`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] leading-none shrink-0 ${
                              isThisCorrect 
                                ? 'bg-green-600 text-white' 
                                : isThisSelected 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-slate-200 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3.5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl text-xs text-indigo-950 leading-relaxed">
                      <p className="font-bold flex items-center gap-1 mb-1 font-mono text-[10px] uppercase text-indigo-900">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" /> Explicação do Professor IA:
                      </p>
                      <p>{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* True False review */}
            <div className="space-y-6 pt-4">
              <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider pl-2 font-mono">Julgamento de Itens (V/F)</h5>
              
              {examData.trueFalse.map((q, qIdx) => {
                const userSelected = tfAnswers[qIdx];
                const isCorrect = userSelected === q.isTrue;

                return (
                  <div key={qIdx} className={`border rounded-xl p-5 space-y-4 ${
                    isCorrect ? 'border-green-200 bg-green-50/10' : 'border-red-150 bg-rose-50/10'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-850 flex gap-2 leading-relaxed">
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-mono h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{qIdx + 1}</span>
                        <span>{q.statement}</span>
                      </p>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full select-none shrink-0 font-mono">
                          <Check className="w-3.5 h-3.5" /> CORRETO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-full select-none shrink-0 font-mono">
                          <X className="w-3.5 h-3.5" /> INCORRETO
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 pl-7">
                      {[true, false].map((choice) => {
                        const isThisCorrect = choice === q.isTrue;
                        const isThisSelected = userSelected === choice;

                        let styleClass = "border-slate-150 bg-slate-50 opacity-60";
                        if (isThisCorrect) {
                          styleClass = "border-green-500 bg-green-50 text-green-950 font-bold";
                        } else if (isThisSelected) {
                          styleClass = "border-red-400 bg-rose-50 text-red-950 font-bold";
                        }

                        return (
                          <div
                            key={choice ? "T" : "F"}
                            className={`flex-1 text-center text-xs p-2.5 rounded-lg border ${styleClass}`}
                          >
                            {choice ? "Verdadeiro" : "Falso"}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3.5 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl text-xs text-indigo-950 leading-relaxed font-sans">
                      <p className="font-bold flex items-center gap-1 mb-1 font-mono text-[10px] uppercase text-indigo-900">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" /> Justificativa:
                      </p>
                      <p>{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Reset controls */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3.5 px-8 rounded-xl cursor-pointer select-none transition-all active:scale-95 shadow-xs"
            >
              Fazer Outro Provão / Resetar
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
