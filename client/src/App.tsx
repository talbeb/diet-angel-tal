import { useState } from 'react';
import DayView from './components/DayView';
import WeightView from './components/WeightView';
import AnalyzeView from './components/AnalyzeView';
import FitnessView from './components/FitnessView';
import BottomNav, { Tab } from './components/BottomNav';

export default function App() {
  const [tab, setTab] = useState<Tab>('daily');

  return (
    <>
      {tab === 'daily'   && <DayView />}
      {tab === 'weight'  && <WeightView />}
      {tab === 'analyze' && <AnalyzeView onMealAdded={() => setTab('daily')} />}
      {tab === 'fitness' && <FitnessView />}
      <BottomNav active={tab} onChange={setTab} />
    </>
  );
}
