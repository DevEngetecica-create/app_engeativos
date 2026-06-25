export const onlyDigits = value => String(value ?? '').replace(/\D/g, '');

export const integerInputBlockingSeparators = (value, previousValue = '') => {
  const text = String(value ?? '');

  if (/[.,;]/.test(text)) {
    return onlyDigits(previousValue);
  }

  return onlyDigits(text);
};

export const integerInputValue = value => {
  if (value === null || value === undefined || value === '') return '';

  const text = String(value).trim();
  const decimalNumber = Number(text.replace(',', '.'));

  if (Number.isFinite(decimalNumber)) {
    return String(Math.trunc(decimalNumber));
  }

  return onlyDigits(text);
};

export const integerNumberValue = (value, fallback = 0) => {
  const digits = integerInputValue(value);
  return digits === '' ? fallback : Number(digits);
};

/**
 * Mascara de moeda baseada em centavos.
 * Usuario digita apenas digitos; o app insere o ponto decimal.
 * Exemplos:
 *   "719"   -> "7.19"
 *   "1234"  -> "12.34"
 *   "1"     -> "0.01"
 *   ""      -> ""
 * Sempre usa PONTO como separador decimal.
 */
export const currencyMask = (raw) => {
  const digits = onlyDigits(raw);
  if (!digits) return '';
  const n = Number(digits) / 100;
  return n.toFixed(2);
};

/**
 * Converte uma string formatada pela currencyMask para Number.
 */
export const currencyToNumber = (formatted, fallback = 0) => {
  if (formatted === null || formatted === undefined || formatted === '') return fallback;
  const n = Number(String(formatted).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};
