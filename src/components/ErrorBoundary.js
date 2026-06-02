// src/components/ErrorBoundary.js
//
// Boundary global de erros React. Captura qualquer exceção lançada por
// componentes-filho, evita o crash branco do RN e oferece um botão de
// reinício suave (reset do próprio boundary). Não substitui crash do
// nativo nem promise rejection global — só erros de render/lifecycle.
//
// Offline-first: nenhuma chamada de rede aqui. Apenas UI local.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import logger from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Erro sempre logado (mesmo em produção) — útil para telemetria futura.
    logger.error('[ErrorBoundary] erro capturado:', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Erro inesperado.';
    const stack = (__DEV__ && this.state.error?.stack) ? this.state.error.stack : null;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.subtitle}>
          O aplicativo encontrou um problema, mas seus dados locais estão preservados.
        </Text>

        {!!stack && (
          <ScrollView style={styles.stackBox}>
            <Text style={styles.stack}>{message}</Text>
            <Text style={styles.stack}>{stack}</Text>
          </ScrollView>
        )}

        <TouchableOpacity style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 24,
  },
  stackBox: {
    maxHeight: 240,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  stack: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#444',
  },
  button: {
    backgroundColor: '#1f51fe',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
