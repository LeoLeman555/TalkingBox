export function getColors(scheme: string | null) {
  return {
    background: scheme === 'dark' ? '#000' : '#FFF',
    text: scheme === 'dark' ? '#FFF' : '#000',
    inputBorder: scheme === 'dark' ? '#444' : '#DDD',
    buttonBg: '#135da8ff',
    buttonText: '#FFF',
    mock: '#434547ff',
    accent: '#009688',
    warning: '#ff6607ff',
    error: '#ff0000'
  };
}
