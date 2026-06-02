// src/utils/crypto.js
//
// Funções de derivação e verificação de senha para AUTENTICAÇÃO LOCAL
// (login offline / armazenamento no SQLite). Não tem relação com o
// hashing de senha do backend Laravel — o servidor usa o algoritmo dele.
//
// Algoritmo atual: PBKDF2-LIKE-SHA256-1000.
//   - Não é PBKDF2 RFC-2898 (sem HMAC + XOR-chain), mas é uma função
//     de derivação por iteração que mistura salt + senha e força custo
//     computacional, dificultando brute-force em caso de roubo do device.
//   - O nome do algoritmo é gravado em users.password_algo. Quando
//     decidirmos bump para 5000 ou trocar a função, basta mudar a
//     constante ALGO_CURRENT e a migração transparente em auth.js
//     re-hasha cada usuário na próxima autenticação bem-sucedida.
//
// ⚠️ Offline-first: tudo aqui roda local com expo-crypto. Não faz
// chamada de rede. Funciona em campo sem internet.

import * as Crypto from 'expo-crypto';

// Identificadores gravados em users.password_algo.
export const ALGO_LEGACY = 'SHA256';
export const ALGO_PBKDF2_1000 = 'PBKDF2-LIKE-SHA256-1000';

// Algoritmo padrão para novos hashes.
export const ALGO_CURRENT = ALGO_PBKDF2_1000;
export const CURRENT_ITERATIONS = 1000;

/**
 * Gera salt aleatório em hex. 16 bytes = 128 bits.
 */
export async function generateSalt(byteCount = 16) {
  const bytes = await Crypto.getRandomBytesAsync(byteCount);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * SHA-256 puro — usado APENAS para verificar hashes legados (back-compat).
 * Não usar para gerar novos hashes.
 */
export async function legacySha256(password) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
}

/**
 * Iterated SHA-256 com salt. Determinístico para (password, salt, iterations).
 */
export async function deriveHashIterativeSha256(password, salt, iterations) {
  if (typeof password !== 'string') throw new Error('password inválido.');
  if (!salt || typeof salt !== 'string') throw new Error('deriveHashIterativeSha256 requer salt.');
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new Error('iterations inválido.');
  }

  // Estado inicial inclui salt + password para que rounds intermediários
  // não sejam reversíveis sem o salt.
  let current = `${salt}:${password}`;
  for (let i = 0; i < iterations; i++) {
    current = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${current}:${i}`
    );
  }
  return current;
}

/**
 * Atalho para gerar hash usando o algoritmo atual.
 * Retorna o trio (hash, salt, algo) pronto para gravar no SQLite.
 */
export async function hashPasswordCurrent(password) {
  const salt = await generateSalt();
  const hash = await deriveHashIterativeSha256(password, salt, CURRENT_ITERATIONS);
  return { hash, salt, algo: ALGO_CURRENT };
}

/**
 * Verifica `password` contra um registro do banco local.
 *
 * @param {string}      password      texto plano digitado
 * @param {string|null} expectedHash  users.password_app
 * @param {string|null} salt          users.password_salt
 * @param {string|null} algo          users.password_algo
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, expectedHash, salt, algo) {
  if (!expectedHash || typeof password !== 'string') return false;

  // Sem algoritmo gravado OU SHA256 → caminho legado.
  if (!algo || algo === ALGO_LEGACY) {
    const calc = await legacySha256(password);
    return constantTimeEquals(calc, expectedHash);
  }

  // PBKDF2-LIKE-SHA256-<iterações>
  const match = /^PBKDF2-LIKE-SHA256-(\d+)$/.exec(algo);
  if (match) {
    if (!salt) return false;
    const iterations = parseInt(match[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    const calc = await deriveHashIterativeSha256(password, salt, iterations);
    return constantTimeEquals(calc, expectedHash);
  }

  // Algoritmo desconhecido — recusa por segurança.
  if (__DEV__) console.warn(`[crypto] algoritmo desconhecido: ${algo}`);
  return false;
}

/**
 * Indica se um registro (algo, salt) precisa ser re-hashado para o algoritmo
 * atual após uma autenticação bem-sucedida. Usado para migração transparente.
 */
export function isHashUpgradeNeeded(algo, salt) {
  if (!algo || algo === ALGO_LEGACY) return true;
  if (algo !== ALGO_CURRENT) return true;
  if (!salt) return true;
  return false;
}

/**
 * Comparação em tempo constante entre duas strings de mesmo tamanho.
 * Não previne timing-attack remoto (não aplicável aqui), mas é boa prática.
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
