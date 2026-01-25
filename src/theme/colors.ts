export function getColors(scheme: string | null) {
  return {
    background: scheme === 'dark' ? '#000' : '#FFFDFA',
    text: scheme === 'dark' ? '#1F1F1F' : '#000',
    inputBorder: scheme === 'dark' ? '#444' : '#DDD',
    primary: '#C62828',
    primaryText: '#FFF',
    secondary: '#817d7d',
    secondaryText: '#FFF',
    disabled: '#BDBDBD',
    success: '#2E7D32',
    error: '#C62828',
  };
}
