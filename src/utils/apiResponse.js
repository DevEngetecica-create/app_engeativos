const parseJsonCandidate = (text) => {
  const parsed = JSON.parse(text);
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
};

const normalizeJsonText = (text) =>
  String(text)
    .replace(/^\uFEFF/, '')
    .trim();

const removeControlChars = (text) =>
  text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');

const escapeInvalidBackslashes = (text) =>
  text.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

const extractJsonRange = (text) => {
  const firstObject = text.indexOf('{');
  const lastObject = text.lastIndexOf('}');
  const firstArray = text.indexOf('[');
  const lastArray = text.lastIndexOf(']');

  if (firstObject >= 0 && lastObject > firstObject) {
    return text.slice(firstObject, lastObject + 1);
  }

  if (firstArray >= 0 && lastArray > firstArray) {
    return text.slice(firstArray, lastArray + 1);
  }

  return text;
};

export const parseApiResponsePayload = (payload) => {
  if (typeof payload !== 'string') return payload;

  const cleaned = normalizeJsonText(payload);
  const extracted = extractJsonRange(cleaned);
  const candidates = [
    cleaned,
    extracted,
    removeControlChars(cleaned),
    removeControlChars(extracted),
    escapeInvalidBackslashes(removeControlChars(cleaned)),
    escapeInvalidBackslashes(removeControlChars(extracted)),
  ];

  let lastError = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return parseJsonCandidate(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Resposta da API inválida.');
};
