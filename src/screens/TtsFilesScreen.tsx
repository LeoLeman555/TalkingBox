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
import { listTtsMp3Files } from '../utils/TtsFileSystem';

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
    listTtsMp3Files().then(setFiles);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Fichiers TTS</Text>

      <FlatList
        data={files}
        keyExtractor={item => item}
        renderItem={({ item }) => {
          const name = item.split('/').pop() ?? item;
          const isSelected = selectedTtsPath === item;

          return (
            <Pressable
              onPress={() => onSelectTts(item)}
              style={{
                padding: 14,
                borderRadius: 8,
                marginBottom: 8,
                backgroundColor: isSelected
                  ? colors.accent
                  : colors.inputBorder,
              }}
            >
              <Text
                style={{
                  color: isSelected ? colors.buttonText : colors.text,
                }}
              >
                {name}
              </Text>
            </Pressable>
          );
        }}
      />

      <PrimaryButton
        title="Retour"
        onPress={onBack}
        color={colors.accent}
        textColor={colors.buttonText}
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
});
