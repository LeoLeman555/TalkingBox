import React, { useState } from 'react';
import { MainScreen } from './src/screens/MainScreen';
import { TtsFilesScreen } from './src/screens/TtsFilesScreen';
import { ReminderEditorScreen } from './src/screens/ReminderEditorScreen';

export type AppRoute = 'MAIN' | 'TTS_FILES' | 'REMINDER_EDITOR';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('MAIN');
  const [selectedTtsPath, setSelectedTtsPath] = useState<string | null>(null);

  if (route === 'MAIN') {
    return (
      <MainScreen
        selectedTtsPath={selectedTtsPath}
        onSelectTts={setSelectedTtsPath}
        onOpenFiles={() => setRoute('TTS_FILES')}
        onCreateReminder={() => setRoute('REMINDER_EDITOR')}
      />
    );
  }

  if (route === 'REMINDER_EDITOR') {
    return <ReminderEditorScreen onBack={() => setRoute('MAIN')} />;
  }

  return (
    <TtsFilesScreen
      selectedTtsPath={selectedTtsPath}
      onSelectTts={setSelectedTtsPath}
      onBack={() => setRoute('MAIN')}
    />
  );
}
