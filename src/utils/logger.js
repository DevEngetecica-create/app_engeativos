// src/utils/logger.js
//
// Logger condicional — silencia logs em release.
//
// Regra:
//   - log / info / debug / warn → apenas em __DEV__.
//   - error → SEMPRE visível (mesmo em produção, para alimentar Logcat
//     e ferramentas de telemetria; nunca contém senha/token).
//
// Uso: substitui `console.log(...)` por `logger.log(...)` em arquivos
// hot-path (network, sync, auth). Trocas em massa ficam para rodada
// dedicada — aqui priorizamos os módulos que falam toda hora.

const dev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

function noop() {}

const logger = {
  log:   dev ? console.log.bind(console)   : noop,
  info:  dev ? console.info.bind(console)  : noop,
  debug: dev ? console.debug.bind(console) : noop,
  warn:  dev ? console.warn.bind(console)  : noop,
  // Erros são sempre relevantes; preserva stack trace para telemetria.
  error: console.error.bind(console),
};

export default logger;
export { logger };
