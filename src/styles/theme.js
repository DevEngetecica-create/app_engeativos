// src/styles/theme.js
//
// Tema central. Cores originais preservadas — adicionados spacing,
// typography, radii e sombras para reduzir números mágicos espalhados.
// Migração de telas existentes para o tema é gradual (não obrigatória).

const theme = {
  colors: {
    // 🎨 Cores originais — preservadas para retrocompatibilidade
    primary: '#1f51fe',
    primaryDark: '#0033cc',
    white: '#fff',
    lightGray: '#f5f5f5',
    darkGray: '#10101c',
    blueGray: '#2e2e62',
    red: '#e1201d',
    green: '#00b67c',
    orange: '#ff7639',
    blackTransparent: 'rgba(223, 195, 160, 0.6)',

    // 🆕 Tokens semânticos — uso recomendado em telas novas
    text: '#222',
    textMuted: '#555',
    textPlaceholder: '#999',
    border: '#e0e0e0',
    surface: '#ffffff',
    surfaceAlt: '#f7f8fa',
    danger: '#d32f2f',
    success: '#2e7d32',
    warning: '#f9a825',
    offline: '#ff7043',
    info: '#1f51fe',
    disabled: '#c1c1c1',
  },

  // 🆕 Espaçamentos base — múltiplos de 4 (padrão Material/iOS)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // 🆕 Raios de borda
  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },

  // 🆕 Tipografia (família padrão do sistema; pesos React Native)
  typography: {
    title:   { fontSize: 22, fontWeight: '800' },
    subtitle:{ fontSize: 16, fontWeight: '600' },
    body:    { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
    button:  { fontSize: 16, fontWeight: '700' },
  },

  // 🆕 Elevação/sombras prontas para reuso (cross-platform)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOpacity: 0.10,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  },
};

export default theme;
