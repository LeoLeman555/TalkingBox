import React from 'react';
import { View } from 'react-native';

export function ProgressBar({ progress, height, backgroundColor, fillColor }) {
  return (
    <View
      style={{ width: '100%', height, backgroundColor, borderRadius: height }}
    >
      <View
        style={{
          width: `${progress}%`,
          height,
          backgroundColor: fillColor,
          borderRadius: height,
        }}
      />
    </View>
  );
}
