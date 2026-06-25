import * as FileSystem from 'expo-file-system';

/**
 * Cria várias pastas dentro do FileSystem.documentDirectory se elas não existirem
 * @param {string[]} pastasRelativas - Array com os caminhos relativos das pastas, ex: ["SMS/assinaturas", "SMS/imagens"]
 * @returns {Promise<string[]>} - Array com os caminhos completos das pastas criadas ou existentes
 */

export default async function criarPastas() {
const pastas = ["SMS/assinaturas", "SMS/imagens"];
  try {
    const caminhosCompletos = [];

    for (const pastaRelativa of pastas) {
      const caminhoCompleto = FileSystem.documentDirectory + pastaRelativa + "/";

      const info = await FileSystem.getInfoAsync(caminhoCompleto);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(caminhoCompleto, { intermediates: true });
        console.log(`Pasta criada: ${caminhoCompleto}`);
      } else {
        console.log(`Pasta já existe: ${caminhoCompleto}`);
      }

      caminhosCompletos.push(caminhoCompleto);
    }

    return caminhosCompletos;
  } catch (error) {
    console.error("Erro ao criar pastas:", error);
    throw error;
  }
}
