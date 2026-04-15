import { DayScore } from '../types';
import styles from './ScoreSummary.module.css';

interface Props {
  score: DayScore;
}

export default function ScoreSummary({ score }: Props) {
  const { yellowStars, redStars } = score;
  const isEmpty = yellowStars === 0 && redStars === 0;

  return (
    <div className={styles.summary}>
      <span className={styles.label}>Today's score</span>
      {isEmpty ? (
        <span className={styles.empty}>No meals yet</span>
      ) : (
        <span className={styles.stars}>
          {yellowStars > 0 && <span title={`${yellowStars} yellow stars`}>{'⭐'.repeat(yellowStars)}</span>}
          {redStars > 0 && <span title={`${redStars} red stars`}>{'🔴'.repeat(redStars)}</span>}
        </span>
      )}
    </div>
  );
}
