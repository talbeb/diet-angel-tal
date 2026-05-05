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

      <div className={styles.scores}>
        <span className={`${styles.pill} ${yellowOver ? styles.over : ''}`}>
          ⭐ {yellowStars}
          {settings?.maxYellowStars != null && ` / ${settings.maxYellowStars}`}
        </span>
        <span className={`${styles.pill} ${redOver ? styles.over : ''}`}>
          <span className={styles.redStar}>★</span> {redStars}
          {settings?.maxRedStars != null && ` / ${settings.maxRedStars}`}
        </span>
      </div>

    </div>
  );
}
