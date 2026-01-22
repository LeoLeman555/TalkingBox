import React, { useState } from 'react';
import { MainScreen } from './src/screens/MainScreen';
import { TtsFilesScreen } from './src/screens/TtsFilesScreen';
import { ReminderEditorScreen } from './src/screens/ReminderEditorScreen';
import { ReminderListScreen } from './src/screens/ReminderListScreen';
import { ReminderDetailScreen } from './src/screens/ReminderDetailScreen';
import { Reminder } from './src/domain/reminder';

export type AppRoute =
  | 'MAIN'
  | 'TTS_FILES'
  | 'REMINDER_EDITOR'
  | 'REMINDER_LIST'
  | 'REMINDER_DETAIL';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('MAIN');
  const [selectedTtsPath, setSelectedTtsPath] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  if (route === 'MAIN') {
    return (
      <MainScreen
        selectedTtsPath={selectedTtsPath}
        onSelectTts={setSelectedTtsPath}
        onOpenFiles={() => setRoute('TTS_FILES')}
        onCreateReminder={() => setRoute('REMINDER_EDITOR')}
        onViewReminders={() => setRoute('REMINDER_LIST')}
      />
    );
  }

  if (route === 'REMINDER_LIST') {
    return (
      <ReminderListScreen
        onCreate={() => setRoute('REMINDER_EDITOR')}
        onBack={() => setRoute('MAIN')}
        onSelect={(r) => {
          setSelectedReminder(r);
          setRoute('REMINDER_DETAIL');
        }}
      />
    );
  }

  if (route === 'REMINDER_DETAIL' && selectedReminder) {
    return (
      <ReminderDetailScreen
        reminder={selectedReminder}
        onBack={() => setRoute('REMINDER_LIST')}
      />
    );
  }

  if (route === 'REMINDER_EDITOR') {
    return (
      <ReminderEditorScreen
        onBack={() => setRoute('REMINDER_LIST')}
      />
    );
  }

  return (
    <TtsFilesScreen
      selectedTtsPath={selectedTtsPath}
      onSelectTts={setSelectedTtsPath}
      onBack={() => setRoute('MAIN')}
    />
  );
}
