// src/utils/fileUpload.js
//
// Helpers de preparo de arquivo para upload (A5).
//
// Camada 1 — resize/compressão antes de qualquer envio:
//   prepareImageForUpload(uri) → URI da versão reduzida (ou original se não for imagem)
//   readImageAsBase64DataUri(uri) → string "data:<mime>;base64,..."
//
// Camada 2 — montagem de FormData para envio multipart aditivo:
//   buildUploadFormData(registros) → { formData, totalArquivos }
//
// ⚠️ Offline-first: nada aqui faz chamada de rede. Tudo é local.
// Se o resize falhar (ex: foto corrompida), caímos no caminho original
// sem bloquear o upload — preferimos enviar a foto grande do que perder
// dados em campo.

import * as FileSystem from 'expo-file-system';
import ImageResizer from 'react-native-image-resizer';

// 🔧 Parâmetros confirmados com o usuário (conservadores):
// foto típica 4–8 MB → ~800–1500 KB, mais detalhe para placas/NFs.
export const RESIZE_MAX_WIDTH = 2400;
export const RESIZE_MAX_HEIGHT = 2400;
export const RESIZE_JPEG_QUALITY = 85;

// Detecta extensão tratando file://, query strings e maiúsculas.
function getExtension(uri) {
  if (typeof uri !== 'string') return '';
  const clean = uri.split('?')[0].split('#')[0];
  const idx = clean.lastIndexOf('.');
  return idx >= 0 ? clean.slice(idx + 1).toLowerCase() : '';
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp']);

export function isImageUri(uri) {
  return IMAGE_EXTS.has(getExtension(uri));
}

export function isPdfUri(uri) {
  return getExtension(uri) === 'pdf';
}

export function inferMimeType(uri) {
  const ext = getExtension(uri);
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  // Default seguro pra captura de câmera; resize sempre gera JPEG.
  return 'image/jpeg';
}

/**
 * Reduz/comprime imagem. Retorna a NOVA uri (file://...) ou a original
 * caso não seja imagem ou ocorra falha não-fatal.
 *
 * @param {string} uri  file://...jpg|png|... ou outro
 * @returns {Promise<string>}
 */
export async function prepareImageForUpload(uri) {
  if (!uri || typeof uri !== 'string') return uri;
  if (!isImageUri(uri)) return uri; // PDFs / outros: intactos

  try {
    const result = await ImageResizer.createResizedImage(
      uri,
      RESIZE_MAX_WIDTH,
      RESIZE_MAX_HEIGHT,
      'JPEG',
      RESIZE_JPEG_QUALITY,
      0,        // rotation
      undefined, // outputPath: deixa lib escolher
      false,    // keepMeta — descarta EXIF (privacidade + tamanho)
    );
    return result?.uri || uri;
  } catch (err) {
    if (__DEV__) {
      console.warn('[fileUpload] falha no resize, mantendo original:', err?.message);
    }
    return uri; // fallback: envia original (não bloqueia sync)
  }
}

/**
 * Lê o arquivo como "data:mime;base64,..." aplicando resize quando for imagem.
 * Usado pelo caminho JSON tradicional (A5.1) para reduzir payload.
 *
 * @param {string} uri  file:// path
 * @returns {Promise<string>} data URI completa
 */
export async function readImageAsBase64DataUri(uri) {
  const finalUri = await prepareImageForUpload(uri);
  const base64 = await FileSystem.readAsStringAsync(finalUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${inferMimeType(finalUri)};base64,${base64}`;
}

/**
 * Monta FormData para upload multipart (A5.2).
 *
 * Convenção:
 *   - `registros_json`: string JSON com a lista de registros (campos só, sem o arquivo).
 *     Cada registro deve manter `id_local` para correlação no backend.
 *   - `files[<id_local>][arquivo]`: arquivo binário associado ao registro de mesmo id_local.
 *     Se não houver id_local, usa o índice numérico como chave.
 *
 * Não envia base64 nem arquivo_uri quando há arquivo binário — o backend
 * lê de $request->file(...) em vez de $request->input('arquivo_uri').
 *
 * @param {Array<object>} registros  array de registros como vêm do SQLite local
 * @returns {Promise<{ formData: FormData, totalArquivos: number }>}
 */
export async function buildUploadFormData(registros) {
  const formData = new FormData();
  const semArquivo = [];
  let totalArquivos = 0;

  for (let i = 0; i < registros.length; i++) {
    const reg = registros[i];
    const key = reg?.id_local || `idx_${i}`;
    const arquivoUri = typeof reg?.arquivo_app === 'string' ? reg.arquivo_app : null;

    if (arquivoUri && arquivoUri.startsWith('file://')) {
      const preparedUri = await prepareImageForUpload(arquivoUri);
      const mime = inferMimeType(preparedUri);
      const name = preparedUri.split('/').pop() || `arquivo_${i}.jpg`;

      // RN aceita { uri, name, type } no FormData; axios respeita o boundary.
      formData.append(`files[${key}][arquivo]`, {
        uri: preparedUri,
        name,
        type: mime,
      });

      // Envia o registro SEM arquivo_uri base64 — backend vai resolver via file().
      const limpo = { ...reg };
      delete limpo.arquivo_uri; // se vier de etapa anterior
      semArquivo.push(limpo);
      totalArquivos += 1;
    } else {
      // Sem arquivo binário — registro vai normal, podendo ter arquivo_uri
      // se já veio como data:... (caso raro).
      semArquivo.push(reg);
    }
  }

  formData.append('registros_json', JSON.stringify(semArquivo));
  return { formData, totalArquivos };
}
