import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase';
import { 
  BookOpen, 
  LogOut, 
  Plus, 
  Trash2, 
  Folder, 
  CheckCircle2, 
  Sparkles, 
  Timer, 
  Volume2, 
  VolumeX, 
  Calendar, 
  Clock, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  LayoutDashboard,
  Download,
  X,
  Smartphone,
  Info,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import SubjectView from './components/SubjectView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F3] text-slate-550">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard user={user} />;
}

function LoginScreen() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F3] text-slate-900 border-x shrink-0 w-full max-w-lg mx-auto p-6 md:border-slate-200">
      <div className="text-center space-y-6 max-w-sm w-full font-sans">
        <div className="mx-auto w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-sm">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">StudyBook</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Seu caderno de estudos digital inteligente. Organize, revise e conquiste seus objetivos.
          </p>
        </div>
        <button
          onClick={handleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white rounded-xl py-3 px-4 font-medium transition-all hover:bg-indigo-700 active:scale-[0.98] mt-8 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </button>
      </div>
    </div>
  );
}

// Global synth state variable for easy cross-renders control
let audioCtx: AudioContext | null = null;
let currentOscillators: OscillatorNode[] = [];
let noiseBufferSource: AudioBufferSourceNode | null = null;
let noiseGainNode: GainNode | null = null;

function Dashboard({ user }: { user: User }) {
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'subjects' | 'focus' | 'revisions'>('dashboard');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [activeSubject, setActiveSubject] = useState<any | null>(null);

  // Stats states
  const [studySessions, setStudySessions] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);

  // Manual session logging state
  const [manualMinutes, setManualMinutes] = useState('30');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loggingProgress, setLoggingProgress] = useState(false);

  // Focus chronometer states
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'custom'>('pomodoro');
  const [pomodoroSelectedMinutes, setPomodoroSelectedMinutes] = useState(25);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerValueMax, setTimerValueMax] = useState(25 * 60);
  const [focusSubjectId, setFocusSubjectId] = useState('');
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'waves'>('none');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Estado off-line local
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Estados PWA e Instalação
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallTip, setShowInstallTip] = useState(false);
  const [isWebApp, setIsWebApp] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMinutes, setCelebrationMinutes] = useState(0);

  useEffect(() => {
    // Detectar se já está rodando standalone (instalado)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsWebApp(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // Salva o prompt para ser acionado sob demanda
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('Fila de instalação aceita pelo usuário');
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallTip(true);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Carregar do cache local imediatamente para evitar tela em branco ou delay de rede
    const cachedSubjects = localStorage.getItem('studybook_subjects');
    const cachedStudySessions = localStorage.getItem('studybook_study_sessions');
    const cachedRevisions = localStorage.getItem('studybook_revisions');

    if (cachedSubjects) {
      try {
        const parsed = JSON.parse(cachedSubjects);
        setSubjects(parsed);
        if (parsed.length > 0) {
          setSelectedSubjectId(parsed[0].id.toString());
          setFocusSubjectId(parsed[0].id.toString());
        }
      } catch (e) {
        console.error("Erro ao ler matérias locais:", e);
      }
    }
    if (cachedStudySessions) {
      try {
        setStudySessions(JSON.parse(cachedStudySessions));
      } catch (e) {
        console.error("Erro ao ler sessões locais:", e);
      }
    }
    if (cachedRevisions) {
      try {
        setRevisions(JSON.parse(cachedRevisions));
      } catch (e) {
        console.error("Erro ao ler revisões locais:", e);
      }
    }

    fetchSubjects();
    fetchStudySessions();
    fetchRevisions();

    if (navigator.onLine) {
      syncOfflineData();
    }
  }, [user]);

  // Função para sincronizar dados criados off-line
  const syncOfflineData = async () => {
    if (!navigator.onLine) return;
    try {
      const token = await user.getIdToken();

      // 1. Matérias pendentes
      const pendingSubjects = JSON.parse(localStorage.getItem('studybook_pending_subjects') || '[]');
      if (pendingSubjects.length > 0) {
        for (const sub of pendingSubjects) {
          try {
            await fetch('/api/subjects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ name: sub.name })
            });
          } catch (e) {
            console.error("Erro ao sincronizar matéria offline:", e);
          }
        }
        localStorage.removeItem('studybook_pending_subjects');
        fetchSubjects();
      }

      // 2. Deleções de matérias pendentes
      const pendingDeletes = JSON.parse(localStorage.getItem('studybook_pending_delete_subjects') || '[]');
      if (pendingDeletes.length > 0) {
        for (const id of pendingDeletes) {
          try {
            await fetch(`/api/subjects/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (e) {
            console.error("Erro ao sincronizar deleção offline:", e);
          }
        }
        localStorage.removeItem('studybook_pending_delete_subjects');
        fetchSubjects();
      }

      // 3. Sessões de estudos pendentes
      const pendingSessions = JSON.parse(localStorage.getItem('studybook_pending_sessions') || '[]');
      if (pendingSessions.length > 0) {
        for (const s of pendingSessions) {
          try {
            await fetch('/api/study-sessions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                durationMinutes: s.durationMinutes,
                subjectId: s.subjectId && s.subjectId > 0 ? s.subjectId : null
              })
            });
          } catch (e) {
            console.error("Erro ao sincronizar sessão offline:", e);
          }
        }
        localStorage.removeItem('studybook_pending_sessions');
        fetchStudySessions();
      }

      // 4. Capítulos criados off-line
      const subjectsList = JSON.parse(localStorage.getItem('studybook_subjects') || '[]');
      for (const sub of subjectsList) {
        const pendingChaps = JSON.parse(localStorage.getItem(`studybook_pending_chapters_${sub.id}`) || '[]');
        if (pendingChaps.length > 0) {
          for (const chap of pendingChaps) {
            try {
              const res = await fetch(`/api/subjects/${sub.id}/chapters`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title: chap.title })
              });
              
              if (res.ok) {
                const newChapData = await res.json();
                
                // Migrar notas offline e de revisions que estavam apontando para o id provisório (negativo)
                const tempId = chap.id;
                const realId = newChapData.id;

                const cachedNotes = localStorage.getItem(`studybook_notes_${tempId}`);
                if (cachedNotes !== null) {
                  localStorage.setItem(`studybook_notes_${realId}`, cachedNotes);
                  localStorage.removeItem(`studybook_notes_${tempId}`);
                  
                  // Envia a anotação para o servidor
                  await fetch(`/api/chapters/${realId}/notes`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ content: cachedNotes })
                  });
                }

                // Migrar histórico de revisões locais se houver
                const cachedQuiz = localStorage.getItem(`studybook_quiz_${tempId}`);
                const cachedFlashcards = localStorage.getItem(`studybook_manual_flashcards_${tempId}`);
                if (cachedFlashcards !== null) {
                  localStorage.setItem(`studybook_manual_flashcards_${realId}`, cachedFlashcards);
                  localStorage.removeItem(`studybook_manual_flashcards_${tempId}`);
                }
                if (cachedQuiz !== null) {
                  localStorage.setItem(`studybook_quiz_${realId}`, cachedQuiz);
                  localStorage.removeItem(`studybook_quiz_${tempId}`);
                }
              }
            } catch (e) {
              console.error("Erro ao sincronizar capítulo offline:", e);
            }
          }
          localStorage.removeItem(`studybook_pending_chapters_${sub.id}`);
        }
      }

    } catch (e) {
      console.error("Erro no fluxo do sincronizador de dados:", e);
    }
  };

  // Handle Menu Navigation Reset
  const navigateMenu = (menu: 'dashboard' | 'subjects' | 'focus' | 'revisions') => {
    setActiveMenu(menu);
    setActiveSubject(null);
  };

  const fetchSubjects = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
        localStorage.setItem('studybook_subjects', JSON.stringify(data));
        if (data.length > 0) {
          setSelectedSubjectId(data[0].id.toString());
          setFocusSubjectId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudySessions = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/study-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudySessions(data);
        localStorage.setItem('studybook_study_sessions', JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRevisions = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/revisions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRevisions(data);
        localStorage.setItem('studybook_revisions', JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    // Criar matéria de forma otimista local
    const tempId = -Date.now();
    const optimisticSubject = {
      id: tempId,
      name: newSubject,
      color: '#3b82f6',
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedSubjects = [...subjects, optimisticSubject];
    setSubjects(updatedSubjects);
    localStorage.setItem('studybook_subjects', JSON.stringify(updatedSubjects));
    setNewSubject('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: optimisticSubject.name })
      });
      if (res.ok) {
        fetchSubjects();
      } else {
        throw new Error('Servidor retornou erro ao salvar matéria');
      }
    } catch (err) {
      console.error(err);
      if (!navigator.onLine) {
        // Guarda na fila de sincronização offline
        const pending = JSON.parse(localStorage.getItem('studybook_pending_subjects') || '[]');
        pending.push(optimisticSubject);
        localStorage.setItem('studybook_pending_subjects', JSON.stringify(pending));
      } else {
        // Voltar estado caso falhe e esteja online
        const rolledBack = subjects.filter(s => s.id !== tempId);
        setSubjects(rolledBack);
        localStorage.setItem('studybook_subjects', JSON.stringify(rolledBack));
      }
    }
  };

  const deleteSubject = async (id: number) => {
    // Deletar localmente na hora (otimista)
    const filtered = subjects.filter(s => s.id !== id);
    setSubjects(filtered);
    localStorage.setItem('studybook_subjects', JSON.stringify(filtered));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSubjects();
        fetchStudySessions();
      } else {
        throw new Error('Erro ao deletar matéria no servidor');
      }
    } catch (err) {
      console.error(err);
      if (!navigator.onLine) {
        // Guarda deleção pendente offline
        const pending = JSON.parse(localStorage.getItem('studybook_pending_delete_subjects') || '[]');
        pending.push(id);
        localStorage.setItem('studybook_pending_delete_subjects', JSON.stringify(pending));
      }
    }
  };

  // Log a manual study session
  const saveManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(manualMinutes);
    if (isNaN(minutes) || minutes <= 0) return;
    setLoggingProgress(true);

    // Sessão otimista local
    const tempId = -Date.now();
    const optimisticSession = {
      id: tempId,
      userId: user.uid,
      subjectId: selectedSubjectId ? parseInt(selectedSubjectId) : null,
      durationMinutes: minutes,
      createdAt: new Date().toISOString(),
    };

    const updatedSessions = [optimisticSession, ...studySessions];
    setStudySessions(updatedSessions);
    localStorage.setItem('studybook_study_sessions', JSON.stringify(updatedSessions));
    setManualMinutes('30');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          durationMinutes: minutes,
          subjectId: selectedSubjectId ? parseInt(selectedSubjectId) : null
        })
      });
      if (res.ok) {
        fetchStudySessions();
      } else {
        throw new Error('Servidor retornou erro ao logar tempos');
      }
    } catch (err) {
      console.error(err);
      if (!navigator.onLine) {
        const pending = JSON.parse(localStorage.getItem('studybook_pending_sessions') || '[]');
        pending.push(optimisticSession);
        localStorage.setItem('studybook_pending_sessions', JSON.stringify(pending));
      } else {
        const rolledBack = studySessions.filter(s => s.id !== tempId);
        setStudySessions(rolledBack);
        localStorage.setItem('studybook_study_sessions', JSON.stringify(rolledBack));
      }
    } finally {
      setLoggingProgress(false);
    }
  };

  // Complete a revision task
  const completeRevision = async (revId: number) => {
    // Conclusão otimista na hora
    const updated = revisions.map(r => r.id === revId ? { ...r, status: 'done' } : r);
    setRevisions(updated);
    localStorage.setItem('studybook_revisions', JSON.stringify(updated));

    try {
      const token = await user.getIdToken();
      await fetch(`/api/revisions/${revId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRevisions();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Pomodoro Chronometer Timer Logic ---
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            // Completed! Log study session automatically
            logCompletedSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Log completed focus session
  const logCompletedSession = async () => {
    try {
      // Log total time elapsed
      const totalMinutesElapsed = Math.ceil((timerValueMax - timeLeft) / 60);
      if (totalMinutesElapsed <= 0) return;

      // Adicionar sessão local de forma otimista
      const tempId = -Date.now();
      const optimisticSession = {
        id: tempId,
        userId: user.uid,
        subjectId: focusSubjectId ? parseInt(focusSubjectId) : null,
        durationMinutes: totalMinutesElapsed,
        createdAt: new Date().toISOString(),
      };
      
      const updatedSessions = [optimisticSession, ...studySessions];
      setStudySessions(updatedSessions);
      localStorage.setItem('studybook_study_sessions', JSON.stringify(updatedSessions));

      const token = await user.getIdToken();
      await fetch('/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          durationMinutes: totalMinutesElapsed,
          subjectId: focusSubjectId ? parseInt(focusSubjectId) : null
        })
      });
      setCelebrationMinutes(totalMinutesElapsed);
      setShowCelebration(true);
      fetchStudySessions();
      setTimeLeft(timerValueMax);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEarly = () => {
    logCompletedSession();
    setIsTimerRunning(false);
  };

  const changeTimerPreset = (minutes: number) => {
    setIsTimerRunning(false);
    setPomodoroSelectedMinutes(minutes);
    setTimeLeft(minutes * 60);
    setTimerValueMax(minutes * 60);
  };

  // --- Browser Synthesis Ambient Noises ---
  useEffect(() => {
    if (ambientSound !== 'none') {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        // Clean previous
        cleanSynthSound();

        noiseGainNode = audioCtx.createGain();
        noiseGainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        noiseGainNode.connect(audioCtx.destination);

        if (ambientSound === 'rain') {
          // White noise synth
          const bufferSize = 2 * audioCtx.sampleRate;
          const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          noiseBufferSource = audioCtx.createBufferSource();
          noiseBufferSource.buffer = noiseBuffer;
          noiseBufferSource.loop = true;

          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, audioCtx.currentTime);

          noiseBufferSource.connect(filter);
          filter.connect(noiseGainNode);
          noiseBufferSource.start();
        } else if (ambientSound === 'waves') {
          // Slow breathing pitch oscillators to simulate waves/drones
          const osc1 = audioCtx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(85, audioCtx.currentTime);
          
          const osc2 = audioCtx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(87, audioCtx.currentTime);

          const lfo = audioCtx.createOscillator();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime); // very slow 8 seconds cycle
          
          const lfoGain = audioCtx.createGain();
          lfoGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

          // Connect LFO modulation to achieve a breathing wave sound
          lfo.connect(lfoGain);
          lfoGain.connect(noiseGainNode.gain);

          osc1.connect(noiseGainNode);
          osc2.connect(noiseGainNode);
          
          lfo.start();
          osc1.start();
          osc2.start();

          currentOscillators.push(osc1, osc2, lfo);
        }
      } catch (err) {
        console.error('AudioContext fail', err);
      }
    } else {
      cleanSynthSound();
    }

    return () => {
      cleanSynthSound();
    };
  }, [ambientSound]);

  const cleanSynthSound = () => {
    if (noiseBufferSource) {
      try { noiseBufferSource.stop(); } catch(e){}
      noiseBufferSource = null;
    }
    if (currentOscillators.length > 0) {
      currentOscillators.forEach(o => {
        try { o.stop(); } catch(e){}
      });
      currentOscillators = [];
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Calculate stats indices ---
  // Total hrs
  const overallMinutes = studySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const overallHours = (overallMinutes / 60).toFixed(1);

  // Today hrs
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMinutes = studySessions
    .filter(s => new Date(s.createdAt) >= todayStart)
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const todayHours = (todayMinutes / 60).toFixed(1);

  // Weekly breakdown & Total Weekly hrs
  const now = new Date();
  const currentDayOfWeek = now.getDay() || 7; // monday is 1 ... sunday is 7
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - (currentDayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklySessions = studySessions.filter(s => new Date(s.createdAt) >= startOfWeek);
  const weeklyMinutes = weeklySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  // Let's build Monday to Sunday bars data
  const weekdaysLabel = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dailyStudyMinutesMap = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun

  studySessions.forEach((s) => {
    const sDate = new Date(s.createdAt);
    if (sDate >= startOfWeek) {
      const sDay = sDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
      const targetIndex = sDay === 0 ? 6 : sDay - 1; // map so Mon is 0, Sun is 6
      dailyStudyMinutesMap[targetIndex] += s.durationMinutes;
    }
  });

  const maxDailyMinutes = Math.max(...dailyStudyMinutesMap, 30); // scale reference

  const pendingRevisionsCount = revisions.filter(r => r.status === 'pending').length;

  const handleLogout = () => {
    cleanSynthSound();
    auth.signOut();
  };

  const handleResetData = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      // Auto-cancel confirmation after 4 seconds
      setTimeout(() => {
        setResetConfirm(false);
      }, 4000);
      return;
    }

    try {
      setResetting(true);
      cleanSynthSound();
      const token = await user.getIdToken();
      await fetch('/api/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Clear localStorage cache keys
      localStorage.clear();
      // Reload page and start totally fresh
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao reiniciar dados do caderno de estudos.');
    } finally {
      setResetting(false);
      setResetConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F3] text-slate-800 font-sans flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar Desktop / Sticky header on Mobile */}
      <nav className="w-full md:w-64 bg-[#F2F1EA] border-b md:border-r border-slate-200 p-4 md:p-6 shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">StudyBook</span>
        </div>

        {/* Navigation links */}
        <div className="hidden md:block mt-8 flex-1 w-full space-y-1">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Painel Geral</div>
          <button 
            onClick={() => navigateMenu('dashboard')}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors cursor-pointer ${activeMenu === 'dashboard' ? 'bg-slate-250 text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Painel Central
          </button>
          <button 
            onClick={() => navigateMenu('subjects')}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors cursor-pointer ${activeMenu === 'subjects' ? 'bg-slate-250 text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Folder className="w-4 h-4" /> Matérias
          </button>
          <button 
            onClick={() => navigateMenu('focus')}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-colors cursor-pointer ${activeMenu === 'focus' ? 'bg-slate-250 text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Timer className="w-4 h-4 text-pink-500 fill-pink-500/10" /> Cronômetro Foco
          </button>
          <button 
            onClick={() => navigateMenu('revisions')}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg w-full text-left transition-all cursor-pointer justify-between ${activeMenu === 'revisions' ? 'bg-slate-250 text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-emerald-600" /> Revisões Ativas
            </span>
            {pendingRevisionsCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingRevisionsCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile quick tabs */}
        <div className="md:hidden flex items-center gap-2">
          <button 
            onClick={() => navigateMenu('dashboard')}
            className={`p-2 rounded-lg ${activeMenu === 'dashboard' ? 'bg-slate-250 text-slate-900' : 'text-slate-500'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigateMenu('subjects')}
            className={`p-2 rounded-lg ${activeMenu === 'subjects' ? 'bg-slate-220 text-slate-900' : 'text-slate-500'}`}
          >
            <Folder className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigateMenu('focus')}
            className={`p-2 rounded-lg ${activeMenu === 'focus' ? 'bg-slate-220 text-indigo-600' : 'text-slate-500'}`}
          >
            <Timer className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigateMenu('revisions')}
            className={`p-2 rounded-lg relative ${activeMenu === 'revisions' ? 'bg-slate-220 text-emerald-600' : 'text-slate-500'}`}
          >
            <Calendar className="w-5 h-5" />
            {pendingRevisionsCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="flex md:flex-col items-center md:items-start md:w-full md:mt-auto gap-1">
          {!isWebApp && (
            <button 
              onClick={handleInstallClick} 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all p-2 flex items-center gap-3 text-sm font-semibold rounded-md w-full md:px-3 md:py-2 shrink-0 cursor-pointer"
              title="Instalar App para usar Offline"
            >
              <Download className="w-5 h-5 md:w-4 md:h-4" /> 
              <span className="hidden md:inline">Instalar App</span>
            </button>
          )}

          <button 
            onClick={handleLogout} 
            className="text-slate-500 hover:text-red-500 hover:bg-slate-100 transition-colors p-2 flex items-center gap-3 text-sm font-medium rounded-md w-full md:px-3 md:py-2 shrink-0 cursor-pointer"
          >
            <LogOut className="w-5 h-5 md:w-4 md:h-4" /> 
            <span className="hidden md:inline">Sair</span>
          </button>

          <button 
            onClick={handleResetData} 
            disabled={resetting}
            className={`transition-all p-2 flex items-center gap-3 text-sm font-medium rounded-md w-full md:px-3 md:py-2 shrink-0 cursor-pointer ${
              resetConfirm 
                ? 'bg-red-600 text-white font-bold hover:bg-red-700' 
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title="Apagar todos os dados e recomeçar do zero"
          >
            <Trash2 className={`w-5 h-5 md:w-4 md:h-4 ${resetConfirm ? 'text-white animate-pulse' : 'text-slate-450'}`} /> 
            <span className="hidden md:inline">
              {resetting ? "Resetando..." : resetConfirm ? "Confirmar Reset?" : "Resetar Tudo"}
            </span>
          </button>
        </div>
      </nav>

      {/* Primary Workspace screen */}
      <div className="flex-1 overflow-y-auto min-h-screen">
        {isOffline && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 text-xs py-2 px-6 flex items-center justify-between gap-4 font-medium shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              Você está desconectado. O StudyBook funciona off-line: suas novas anotações, matérias e tempos estão ativos e serão sincronizados automaticamente quando voltar à rede.
            </span>
            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-850 px-1.5 py-0.5 rounded uppercase leading-none shrink-0">
              Modo Local
            </span>
          </div>
        )}
        {/* If subject deep dive is active, show the sub-module. Otherwise, load general menus */}
        {activeSubject ? (
          <SubjectView user={user} subject={activeSubject} studySessions={studySessions} onBack={() => setActiveSubject(null)} />
        ) : (
          <AnimatePresence mode="wait">
            {activeMenu === 'dashboard' && (
              <motion.main 
                key="dashboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8"
              >
                {/* Header */}
                <header>
                  <h1 className="text-2xl font-serif font-bold text-slate-900 leading-none">Painel Geral de Estudos</h1>
                  <p className="text-slate-500 mt-2 text-sm">Acompanhe seu desempenho de foco diário e semanal.</p>
                </header>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Tempo Estudado Hoje</span>
                      <h2 className="text-3xl font-bold font-serif text-indigo-700 mt-1">{todayHours}h</h2>
                      <span className="text-[10px] text-slate-450 block mt-1">{todayMinutes} minutos totais hoje</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Esta Semana</span>
                      <h2 className="text-3xl font-bold font-serif text-emerald-600 mt-1">{weeklyHours}h</h2>
                      <span className="text-[10px] text-slate-450 block mt-1">{weeklyMinutes} minutos na semana</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Acumulado</span>
                      <h2 className="text-3xl font-bold font-serif text-slate-800 mt-1">{overallHours}h</h2>
                      <span className="text-[10px] text-slate-450 block mt-1">{overallMinutes} minutos ao todo</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Visual Chart Card */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Seu Progresso Diário</h3>
                      <p className="text-xs text-slate-400 mt-1">Tempo de estudo (minutos) registrado nesta semana calendar (Seg-Dom)</p>
                    </div>

                    {/* Highly-tuned CSS column chart */}
                    <div className="h-48 flex items-end justify-between gap-2 md:gap-4 mt-8 pb-4 border-b border-slate-100">
                      {weekdaysLabel.map((dayName, idx) => {
                        const mins = dailyStudyMinutesMap[idx];
                        const pct = Math.min((mins / maxDailyMinutes) * 100, 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Hover tooltip */}
                            <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-150 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-10 font-mono">
                              {mins} min
                            </div>
                            
                            {/* Animated bar track */}
                            <div className="w-full bg-slate-100 rounded-md h-32 flex items-end">
                              <motion.div 
                                className={`w-full rounded-md ${mins > 0 ? 'bg-indigo-600' : 'bg-slate-205'}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${pct}%` }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 font-mono">{dayName}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Estude mais 25 minutos para manter suas frentes de foco ativas!</span>
                    </div>
                  </div>

                  {/* Manual Log Sessions Form */}
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4.5 h-4.5 text-indigo-600" /> Registrar Estudos
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Escreveu um resumo à mão ou leu um livro offline? Adicione o tempo aqui.</p>
                    </div>

                    <form onSubmit={saveManualSession} className="space-y-4 mt-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 block mb-1">Duração (Minutos)</label>
                        <input 
                          type="number" 
                          min="1" 
                          required
                          value={manualMinutes}
                          onChange={(e) => setManualMinutes(e.target.value)}
                          className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-450 block mb-1">Selecione a Matéria</label>
                        <select 
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                        >
                          <option value="">Nenhuma Matéria</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={loggingProgress}
                        className="w-full bg-slate-900 border border-transparent hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold text-xs transition-all cursor-pointer"
                      >
                        {loggingProgress ? "Salvando..." : "Logar Tempo de Estudo"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Gamification Badges Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-850 flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-indigo-600" /> Suas Conquistas e Medalhas de Foco
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Estude continuamente e crie cadernos de foco para obter medalhas de alta performance!</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {[
                      {
                        title: "Primeiro Passo",
                        desc: "15 min de foco",
                        unlocked: overallMinutes >= 15,
                        icon: "🥉"
                      },
                      {
                        title: "Mestre do Foco",
                        desc: "60 min de foco",
                        unlocked: overallMinutes >= 60,
                        icon: "🥈"
                      },
                      {
                        title: "Lenda da Cadeira",
                        desc: "180 min de foco",
                        unlocked: overallMinutes >= 180,
                        icon: "🥇"
                      },
                      {
                        title: "Organizador Nato",
                        desc: "Crie 3+ cadernos",
                        unlocked: subjects.length >= 3,
                        icon: "📚"
                      },
                      {
                        title: "Inabalável",
                        desc: "Completou 3+ sessões",
                        unlocked: studySessions.length >= 3,
                        icon: "🔥"
                      }
                    ].map((badge, bIdx) => (
                      <div 
                        key={bIdx} 
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                          badge.unlocked 
                            ? 'bg-gradient-to-br from-indigo-50/20 to-white border-indigo-200 shadow-2xs hover:scale-105' 
                            : 'bg-slate-50/45 border-slate-200/60 opacity-60'
                        }`}
                      >
                        <span className={`text-2xl transition-transform ${badge.unlocked ? 'scale-110 filter drop-shadow-xs' : 'grayscale filter'}`}>
                          {badge.icon}
                        </span>
                        <div>
                          <p className={`text-[11px] font-bold ${badge.unlocked ? 'text-indigo-900' : 'text-slate-500'}`}>{badge.title}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{badge.desc}</p>
                        </div>
                        {badge.unlocked ? (
                          <span className="text-[8px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1">Desbloqueada</span>
                        ) : (
                          <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full mt-1">Bloqueada</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dashboard Pending Revisions Summary link */}
                <div className="bg-[#f0f9f3] border border-green-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900">Suas Revisões Recomendadas</h4>
                      <p className="text-xs text-green-705 mt-1">Existem {pendingRevisionsCount} revisões espaçadas de capítulos prontas para fixação hoje.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveMenu('revisions')}
                    className="bg-white border border-green-300 hover:bg-green-50 text-green-800 transition-colors font-semibold text-xs py-2 px-4 rounded-xl shadow-xs shrink-0 cursor-pointer"
                  >
                    Ver Agenda de Revisões
                  </button>
                </div>
              </motion.main>
            )}

            {activeMenu === 'subjects' && (
              <motion.main 
                key="subjects"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-12 max-w-5xl mx-auto w-full"
              >
                <header className="mb-10">
                  <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Matérias e Cadernos</h1>
                  <p className="text-slate-500 text-sm">Crie pastas para cada disciplina para organizar notas e gerar simulados.</p>
                </header>

                <form onSubmit={createSubject} className="mb-8 max-w-md flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova matéria (ex: Geografia)"
                    className="flex-1 rounded-xl border border-slate-205 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                  <button type="submit" disabled={!newSubject.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center cursor-pointer">
                    <Plus className="w-5 h-5" />
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {subjects.map(subject => (
                      <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveSubject(subject)}
                        className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                            <Folder className="w-5 h-5" />
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 truncate">{subject.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">Visualizar caderno</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {subjects.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-slate-205 rounded-2xl bg-white max-w-sm mx-auto mt-8">
                    <Folder className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Nenhuma matéria criada.</p>
                    <p className="text-xs text-slate-400 mt-1">Crie a primeira matéria acima para começar.</p>
                  </div>
                )}
              </motion.main>
            )}

            {activeMenu === 'focus' && (
              <motion.main 
                key="focus"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8"
              >
                <header>
                  <h1 className="text-2xl font-serif font-bold text-slate-900">Cronômetro de Foco Estudantil</h1>
                  <p className="text-slate-500 text-sm mt-1">Seu espaço imersivo para blindar sua mente contra distrações.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  
                  {/* Big Immersive Chronometer Display */}
                  <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
                    
                    {/* Circle breathing feedback */}
                    <div className="relative w-56 h-56 flex items-center justify-center">
                      <div className={`absolute inset-0 border-[6px] border-slate-100 rounded-full`} />
                      <div className={`absolute inset-0 border-[6px] border-indigo-600 rounded-full transition-all duration-1000`} style={{ clipPath: 'polygon(50% 50%, -50% -50%, 150% -50%, 150% 150%, -50% 150%, -50% -50%)', rotate: `${(timeLeft / timerValueMax) * 360}deg` }} />
                      
                      <div className="text-center">
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-400">
                          {isTimerRunning ? 'FOCO ATIVO' : 'PAUSADO'}
                        </span>
                        <h2 className="text-4xl font-extrabold font-mono text-slate-800 tracking-tight mt-1">
                          {formatTime(timeLeft)}
                        </h2>
                      </div>
                    </div>

                    {/* Quick controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-all ${
                          isTimerRunning ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {isTimerRunning ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimeLeft(pomodoroSelectedMinutes * 60);
                          setTimerValueMax(pomodoroSelectedMinutes * 60);
                        }}
                        className="w-12 h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-xs transition-transform active:scale-90"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>

                      <button
                        onClick={handleSaveEarly}
                        className="px-4 h-12 rounded-full border border-slate-200 bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Finalizar & Salvar
                      </button>
                    </div>

                    {/* Presets Grid */}
                    <div className="w-full pt-4 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-3">Ajustar Intervalo do Pomodoro</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 25, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => changeTimerPreset(mins)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                              pomodoroSelectedMinutes === mins
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-750 font-extrabold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Immersion Noise Board & Subject linking */}
                  <div className="md:col-span-5 space-y-6">
                    {/* Subject link card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
                      <h4 className="text-sm font-bold text-slate-850">Estudar Disciplina</h4>
                      <p className="text-xs text-slate-400">Vincular o tempo desta sessão de estudos a uma de suas matérias ativas:</p>
                      <select 
                        value={focusSubjectId}
                        onChange={(e) => setFocusSubjectId(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                      >
                        <option value="">Não vincular (Foco Livre)</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Binaural Noise selector */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                          {ambientSound !== 'none' ? <Volume2 className="w-4.5 h-4.5 text-indigo-600 animate-pulse" /> : <VolumeX className="w-4.5 h-4.5 text-slate-400" />}
                          Sons de Fundo Imersivos
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Binaurais e ruídos brancos gerados de forma nativa e segura para induzir ondas de foco profundo.</p>
                      </div>

                      <div className="space-y-2">
                        {[
                          { id: 'none', label: 'Silêncio Absoluto', desc: 'Desativar ruídos adicionais' },
                          { id: 'rain', label: 'Chuva & Vento Neutro', desc: 'Ruído acústico ideal para bloquear sussurros externos' },
                          { id: 'waves', label: 'Ondas Alfa Binaurais', desc: 'Indução de ondas relaxantes para fixação extrema' }
                        ].map((sound) => (
                          <button
                            key={sound.id}
                            type="button"
                            onClick={() => setAmbientSound(sound.id as any)}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                              ambientSound === sound.id
                                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 font-bold'
                                : 'border-slate-150 bg-white hover:bg-slate-50 text-slate-650'
                            }`}
                          >
                            <div>
                              <span>{sound.label}</span>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-normal">{sound.desc}</p>
                            </div>
                            {ambientSound === sound.id && <Check className="w-4 h-4 text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.main>
            )}

            {activeMenu === 'revisions' && (
              <motion.main 
                key="revisions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8"
              >
                <header>
                  <h1 className="text-2xl font-serif font-bold text-slate-900">Agenda de Revisões Recomendadas</h1>
                  <p className="text-slate-500 text-sm mt-1">Sua rotina inteligente de repetição espaçada contra a curva do esquecimento.</p>
                </header>

                <div className="space-y-4">
                  {revisions.filter(r => r.status === 'pending').map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-205 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${rev.subjectColor || '#3b82f6'}15`, color: rev.subjectColor || '#3b82f6' }}>
                          <Folder className="w-5.5 h-5.5" />
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-none">{rev.subjectName}</span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{rev.chapterTitle}</h4>
                          <span className="text-[10px] text-red-500 font-semibold block mt-1">Vence em: {new Date(rev.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                        <button
                          onClick={() => {
                            // Find the subject object to enter
                            const targetSub = subjects.find(s => s.name === rev.subjectName);
                            if (targetSub) {
                              setActiveSubject(targetSub);
                            } else {
                              alert('Selecione esta matéria na aba correspondente para revisar as notas.');
                            }
                          }}
                          className="flex-1 sm:flex-initial text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          Praticar e Revisar Notes
                        </button>
                        
                        <button
                          onClick={() => completeRevision(rev.id)}
                          className="p-2 border border-slate-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors shadow-xs"
                          title="Marcar como Concluído"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {revisions.filter(r => r.status === 'pending').length === 0 && (
                    <div className="py-12 bg-white border border-slate-200 rounded-2xl text-center max-w-sm mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold text-sm">Sem revisões pendentes para hoje!</p>
                      <p className="text-xs text-slate-400 mt-1">Parabéns por manter o caderno em dia.</p>
                    </div>
                  )}

                  {revisions.filter(r => r.status === 'done').length > 0 && (
                    <div className="pt-8 space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Histórico de Conclusões</h3>
                      {revisions.filter(r => r.status === 'done').map((rev) => (
                        <div key={rev.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between opacity-70">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400">{rev.subjectName}</span>
                              <h5 className="text-xs font-bold text-slate-700 leading-tight">{rev.chapterTitle}</h5>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Concluído</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.main>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Modal / Ajuda de Instalação PWA */}
      <AnimatePresence>
        {showInstallTip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl max-w-sm w-full space-y-4 text-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <button 
                  onClick={() => setShowInstallTip(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Como instalar o StudyBook?</h3>
                <p className="text-xs text-slate-500 mt-1">Siga estes simples passos rápidos baseados no seu celular ou computador para habilitar o uso off-line:</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">No iOS Safari Mobile</span>
                    <p className="text-[10px] text-slate-500">Toque no botão de <span className="font-semibold text-slate-700">Compartilhar</span> (ícone de seta pra cima na barra de baixo) e selecione <span className="font-semibold text-indigo-600">"Adicionar à Tela de Início"</span>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">No Android Chrome / Samsung</span>
                    <p className="text-[10px] text-slate-500">Toque no ícone de <span className="font-semibold text-slate-700">Três Pontinhos</span> no canto superior direito e clique em <span className="font-semibold text-indigo-600">"Instalar Aplicativo"</span>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">No PC / Mac (Chrome, Edge ou Brave)</span>
                    <p className="text-[10px] text-slate-500">Clique na barra de endereços (URL) do navegador no ícone de <span className="font-semibold text-indigo-600">Instalar</span>.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInstallTip(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all text-white font-semibold text-xs py-2.5 rounded-xl mt-4 cursor-pointer"
              >
                Entendi, voltar ao app
              </button>
            </motion.div>
          </motion.div>
        )}

        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center space-y-6 shadow-xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Star-burst effect using icons / items */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-10 left-10 text-xl animate-bounce">✨</div>
                <div className="absolute top-12 right-12 text-2xl animate-pulse">🎉</div>
                <div className="absolute bottom-16 left-16 text-lg animate-bounce">🎈</div>
                <div className="absolute bottom-12 right-10 text-xl animate-pulse">✨</div>
              </div>

              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                <span className="text-3xl animate-pulse">🏆</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-850 font-serif leading-none">Sessão Completada!</h3>
                <p className="text-xs font-semibold text-indigo-600">Excelente aproveitamento</p>
                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  Parabéns! Você registrou e completou <strong className="text-slate-800">{celebrationMinutes} minutos</strong> de estudos focados de alta absorção hoje.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex items-center justify-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="text-[11px] font-bold text-indigo-900">Sua dedicação está abrindo novos horizontes!</span>
              </div>

              <button
                type="button"
                onClick={() => setShowCelebration(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Continuar rumo ao sucesso!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
