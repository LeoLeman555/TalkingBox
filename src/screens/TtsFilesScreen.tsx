import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
} from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { getColors } from '../theme/colors';
import { listTtsAudioFiles } from '../utils/TtsFileSystem';

type Props = {
  selectedTtsPath: string | null;
  onSelectTts: (path: string) => void;
  onBack: () => void;
};

export function TtsFilesScreen({
  selectedTtsPath,
  onSelectTts,
  onBack,
}: Props) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    listTtsAudioFiles().then(setFiles);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Fichiers Audios
      </Text>

      <FlatList
        data={files}
        keyExtractor={item => item}
        ListEmptyComponent={
          <Text style={styles.info}>
            AUCUN FICHIER AUDIO GÉNÉRÉ... 
          </Text>
        }
        renderItem={({ item }) => {
          const name = item.split('/').pop() ?? item;
          const isSelected = selectedTtsPath === item;
          const isWav = name.endsWith('.wav');

          return (
            <Pressable
              onPress={() => onSelectTts(item)}
              style={{
                padding: 14,
                borderRadius: 8,
                marginBottom: 8,
                backgroundColor: isSelected
                  ? colors.primary
                  : colors.inputBorder,
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? colors.primaryText
                    : colors.text,
                  fontWeight: isWav ? '700' : '500',
                }}
              >
                {name} {isWav ? '(WAV)' : '(MP3)'}
              </Text>
            </Pressable>
          );
        }}
      />

      <PrimaryButton
        title="Retour"
        onPress={onBack}
        color={colors.secondary}
        textColor={colors.secondaryText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    marginTop: 6,
    paddingBottom: 10,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});
