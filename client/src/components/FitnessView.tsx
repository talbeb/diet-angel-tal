import { useEffect, useState, useCallback } from 'react';
import { Training, TrainingSuggestion } from '../types';
import { getWeekTrainings, confirmTraining } from '../api/training';
import {
  getCalendarStatus,
  getCalendarAuthUrl,
  disconnectCalendar,
  getCalendarSuggestions,
} from '../api/calendar';
import { fetchSettings } from '../api/meals';
import TrainingWeekGrid from './TrainingWeekGrid';
import styles from './FitnessView.module.css';

// Feature flag — flip to true when Google Calendar integration is ready for users
const ENABLE_CALENDAR = false;

export default function FitnessView() {
  const today = new Date().toISOString().slice(0, 10);

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [suggestions, setSuggestions] = useState<TrainingSuggestion[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [trainingsPerWeekTarget, setTrainingsPerWeekTarget] = useState(3);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsMessage, setSuggestionsMessage] = useState('');
  const [error, setError] = useState('');

  const loadWeek = useCallback(async () => {
    try {
      const data = await getWeekTrainings(today);
      setTrainings(data.trainings);
      setWeekStart(data.weekStart);
      setWeekEnd(data.weekEnd);
    } catch {
      setError('Failed to load week trainings.');
    }
  }, [today]);

  useEffect(() => {
    loadWeek();
    fetchSettings()
      .then((s) => { if (s.trainingsPerWeek) setTrainingsPerWeekTarget(s.trainingsPerWeek); })
      .catch(() => {});

    if (ENABLE_CALENDAR) {
      // Handle OAuth redirect params
      const params = new URLSearchParams(window.location.search);
      if (params.get('calendarConnected') === 'true') {
        setCalendarConnected(true);
        setLoadingStatus(false);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('calendarError')) {
        setError('Calendar connection was denied or failed.');
        setLoadingStatus(false);
        window.history.replaceState({}, '', window.location.pathname);
      }

      getCalendarStatus()
        .then((s) => setCalendarConnected(s.connected))
        .catch(() => {})
        .finally(() => setLoadingStatus(false));
    } else {
      setLoadingStatus(false);
    }
  }, [loadWeek]);

  async function handleConnect() {
    setLoadingAuth(true);
    setError('');
    try {
      const { url } = await getCalendarAuthUrl();
      // Redirect to Google OAuth consent page.
      // After authorization, Google redirects to the server callback,
      // which then redirects back here with ?calendarConnected=true
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect calendar.');
      setLoadingAuth(false);
    }
  }

  async function handleDisconnect() {
    await disconnectCalendar();
    setCalendarConnected(false);
    setSuggestions([]);
    setSuggestionsMessage('');
  }

  async function handleFindSlots() {
    setLoadingSuggestions(true);
    setSuggestions([]);
    setSuggestionsMessage('');
    setError('');
    try {
      const data = await getCalendarSuggestions();
      setSuggestions(data.suggestions ?? []);
      if (data.message) setSuggestionsMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get suggestions.');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleConfirm(s: TrainingSuggestion) {
    const key = `${s.date}|${s.startTime}`;
    setConfirming(key);
    try {
      const [h1, m1] = s.startTime.split(':').map(Number);
      const [h2, m2] = s.endTime.split(':').map(Number);
      const durationMin = (h2 * 60 + m2) - (h1 * 60 + m1);
      const training = await confirmTraining({ date: s.date, startTime: s.startTime, endTime: s.endTime, durationMin });
      setTrainings((prev) => [...prev, training]);
      setSuggestions((prev) => prev.filter((x) => !(x.date === s.date && x.startTime === s.startTime)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm training.');
    } finally {
      setConfirming(null);
    }
  }

  const progress = trainings.length;
  const progressPct = Math.min(100, (progress / trainingsPerWeekTarget) * 100);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🏋️ Fitness</h1>

      {/* Weekly progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressLabel}>
          <span>This week</span>
          <span className={styles.progressCount}>{progress} / {trainingsPerWeekTarget} trainings</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        {progress >= trainingsPerWeekTarget && (
          <div className={styles.goalReached}>Target reached! 💪</div>
        )}
      </div>

      {/* Confirmed trainings list */}
      {trainings.length > 0 && (
        <div className={styles.trainingList}>
          {trainings.map((t) => (
            <div key={t._id} className={styles.trainingItem}>
              <span className={styles.trainingDate}>{t.date}</span>
              <span className={styles.trainingTime}>{t.startTime} – {t.endTime}</span>
              <span className={styles.trainingDuration}>{t.durationMin} min</span>
              {t.googleEventId && <span className={styles.calIcon}>📅</span>}
            </div>
          ))}
        </div>
      )}

      {weekStart && weekEnd && (
        <p className={styles.weekRange}>Week: {weekStart} – {weekEnd}</p>
      )}

      {/* Calendar section — behind feature flag */}
      {ENABLE_CALENDAR && (
        <div className={styles.calendarSection}>
          <h2 className={styles.sectionTitle}>Google Calendar</h2>

          {loadingStatus ? (
            <p className={styles.hint}>Checking connection…</p>
          ) : calendarConnected ? (
            <>
              <div className={styles.connectedBadge}>✓ Connected</div>
              <button
                className={styles.primaryBtn}
                onClick={handleFindSlots}
                disabled={loadingSuggestions}
              >
                {loadingSuggestions ? 'Analyzing your calendar…' : 'Find training slots'}
              </button>
              <button className={styles.disconnectBtn} onClick={handleDisconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <p className={styles.hint}>Connect Google Calendar to get AI-powered training slot suggestions.</p>
              <button className={styles.primaryBtn} onClick={handleConnect} disabled={loadingAuth}>
                {loadingAuth ? 'Opening…' : 'Connect Google Calendar'}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {suggestionsMessage && !loadingSuggestions && (
        <p className={styles.hint}>{suggestionsMessage}</p>
      )}

      {/* Week grid with suggestions */}
      {(suggestions.length > 0 || trainings.length > 0) && (
        <div className={styles.gridSection}>
          <h2 className={styles.sectionTitle}>
            {suggestions.length > 0 ? 'Suggested slots — tap + to confirm' : 'This week'}
          </h2>
          <TrainingWeekGrid
            suggestions={suggestions}
            confirmedThisWeek={trainings}
            confirming={confirming}
            onConfirm={handleConfirm}
          />
        </div>
      )}
    </div>
  );
}
