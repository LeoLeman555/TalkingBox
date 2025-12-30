import React, { useState } from 'react';
import { MainScreen } from './src/screens/MainScreen';
import { TtsFilesScreen } from './src/screens/TtsFilesScreen';

export type AppRoute = 'MAIN' | 'TTS_FILES';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('MAIN');

  const [selectedTtsPath, setSelectedTtsPath] = useState<string | null>(null);

  return route === 'MAIN' ? (
    <MainScreen
      selectedTtsPath={selectedTtsPath}
      onSelectTts={setSelectedTtsPath}
      onOpenFiles={() => setRoute('TTS_FILES')}
    />
  ) : (
    <TtsFilesScreen
      selectedTtsPath={selectedTtsPath}
      onSelectTts={setSelectedTtsPath}
      onBack={() => setRoute('MAIN')}
    />
  );
}
