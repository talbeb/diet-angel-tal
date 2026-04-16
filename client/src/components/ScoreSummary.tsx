import { DayScore, Settings } from '../types';
import styles from './ScoreSummary.module.css';

interface Props {
  score: DayScore;
  settings: Settings | null;
}

export default function ScoreSummary({ score, settings }: Props) {
  const { yellowStars, redStars } = score;
  const isEmpty = yellowStars === 0 && redStars === 0;

  const yellowOver = settings?.maxYellowStars != null && yellowStars > settings.maxYellowStars;
  const redOver = settings?.maxRedStars != null && redStars > settings.maxRedStars;

  return (
    <div className={styles.summary}>
      <span className={styles.label}>Score</span>

      {isEmpty ? (
        <span className={styles.empty}>No meals yet</span>
      ) : (
        <div className={styles.scores}>
          <span className={`${styles.pill} ${yellowOver ? styles.over : ''}`}>
            ⭐ {yellowStars}
            {settings?.maxYellowStars != null && (
              <span className={styles.limit}>/ {settings.maxYellowStars}</span>
            )}
          </span>
          <span className={`${styles.pill} ${redOver ? styles.over : ''}`}>
            🔴 {redStars}
            {settings?.maxRedStars != null && (
              <span className={styles.limit}>/ {settings.maxRedStars}</span>
            )}
          </span>
        </div>
      )}

    </div>
  );
}
