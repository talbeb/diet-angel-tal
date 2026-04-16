import { useRef, useState } from 'react';
import { IngredientResult, RawIngredient } from '../types';
import { analyzeImage, addAnalyzedMeal } from '../api/analyze';
import styles from './AnalyzeView.module.css';

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function toIngredientResult(raw: RawIngredient): IngredientResult {
  const userKcal = raw.kcal;
  const stars = raw.dominant_macro === 'free' ? 0 : Math.round(userKcal / 100);
  const color = raw.dominant_macro === 'free' ? 'free' : raw.dominant_macro === 'carb' ? 'red' : 'yellow';
  return { ...raw, userKcal, stars, color };
}

function recalc(item: IngredientResult, userKcal: number): IngredientResult {
  const stars = item.dominant_macro === 'free' ? 0 : Math.round(userKcal / 100);
  const color = item.dominant_macro === 'free' ? 'free' : item.dominant_macro === 'carb' ? 'red' : 'yellow';
  return { ...item, userKcal, stars, color };
}

interface Props {
  onMealAdded: () => void;
}

export default function AnalyzeView({ onMealAdded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientResult[] | null>(null);
  const [mealName, setMealName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setIngredients(null);
    setError(null);
    setSaved(false);
    setMealName('');
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const raw = await analyzeImage(file);
      setIngredients(raw.map(toIngredientResult));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ניתוח נכשל');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleKcalChange(index: number, value: string) {
    const kcal = Math.max(0, parseInt(value, 10) || 0);
    setIngredients((prev) =>
      prev ? prev.map((item, i) => (i === index ? recalc(item, kcal) : item)) : prev
    );
  }

  const totalRedStars = ingredients?.reduce((sum, i) => sum + (i.color === 'red' ? i.stars : 0), 0) ?? 0;
  const totalYellowStars = ingredients?.reduce((sum, i) => sum + (i.color === 'yellow' ? i.stars : 0), 0) ?? 0;

  async function handleAddMeal() {
    if (!ingredients || !mealName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addAnalyzedMeal({
        date: toDateString(new Date()),
        time: currentTime(),
        name: mealName.trim(),
        yellowStars: totalYellowStars,
        redStars: totalRedStars,
      });
      setSaved(true);
      onMealAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setFile(null);
    setIngredients(null);
    setError(null);
    setMealName('');
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className={styles.container} dir="rtl">
      <header className={styles.header}>
        <span className={styles.title}>ניתוח תמונה 📷</span>
      </header>

      {/* Upload area */}
      {!preview ? (
        <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
          <span className={styles.uploadIcon}>📸</span>
          <p className={styles.uploadText}>צלם או העלה תמונה של האוכל</p>
          <p className={styles.uploadSub}>לחץ לבחירת תמונה</p>
        </div>
      ) : (
        <div className={styles.previewWrapper}>
          <img src={preview} alt="תמונת אוכל" className={styles.previewImg} />
          <button className={styles.resetBtn} onClick={handleReset} type="button">✕ תמונה אחרת</button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />

      {/* Analyze button */}
      {file && !ingredients && !analyzing && (
        <button className={styles.analyzeBtn} onClick={handleAnalyze} type="button">
          🔍 נתח תמונה
        </button>
      )}

      {analyzing && (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          מנתח את האוכל בתמונה…
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Results */}
      {ingredients && ingredients.length > 0 && (
        <div className={styles.results}>
          <h2 className={styles.resultsTitle}>מרכיבים שזוהו</h2>

          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>מרכיב</span>
              <span>כמות מוערכת</span>
              <span>קק&quot;ל</span>
              <span>כוכבים</span>
            </div>
            {ingredients.map((item, i) => (
              <div key={i} className={styles.tableRow}>
                <span className={styles.ingredientName}>{item.name}</span>
                <span className={styles.ingredientAmount}>{item.amount}</span>
                <input
                  type="number"
                  min={0}
                  value={item.userKcal}
                  onChange={(e) => handleKcalChange(i, e.target.value)}
                  className={styles.kcalInput}
                />
                <span className={styles.stars}>
                  {item.color === 'free'
                    ? <span className={styles.freeLabel}>חינמי</span>
                    : item.color === 'red'
                      ? '🔴'.repeat(item.stars)
                      : '⭐'.repeat(item.stars)}
                </span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            {totalRedStars > 0 && (
              <span className={styles.summaryItem}>{'🔴'.repeat(totalRedStars)} {totalRedStars} כוכבים אדומים</span>
            )}
            {totalYellowStars > 0 && (
              <span className={styles.summaryItem}>{'⭐'.repeat(totalYellowStars)} {totalYellowStars} כוכבים צהובים</span>
            )}
            {totalRedStars === 0 && totalYellowStars === 0 && (
              <span className={styles.summaryItem}>✅ ארוחה חינמית!</span>
            )}
          </div>

          {/* Add meal */}
          {!saved ? (
            <div className={styles.addSection}>
              <input
                type="text"
                placeholder="שם הארוחה (לדוג׳ ארוחת צהריים)"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className={styles.nameInput}
                dir="rtl"
              />
              <button
                className={styles.addBtn}
                onClick={handleAddMeal}
                disabled={!mealName.trim() || saving}
                type="button"
              >
                {saving ? 'שומר…' : '✅ הוסף ארוחה'}
              </button>
            </div>
          ) : (
            <div className={styles.savedMsg}>
              ✅ הארוחה נשמרה! <button className={styles.newAnalysisBtn} onClick={handleReset} type="button">ניתוח חדש</button>
            </div>
          )}
        </div>
      )}

      {ingredients && ingredients.length === 0 && (
        <p className={styles.error}>לא זוהו מרכיבים בתמונה. נסה תמונה אחרת.</p>
      )}
    </div>
  );
}
