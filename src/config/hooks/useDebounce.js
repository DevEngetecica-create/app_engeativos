
// src/config/hooks/debouncedValue.js
// Hook para debouncing de valores, útil para otimizar inputs e buscas

import { useState, useEffect } from 'react';

export default function useDebounce(value, delay = 3000) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Programa atualização depois de `delay` ms
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Se `value` mudar antes do timeout, cancela o anterior
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
