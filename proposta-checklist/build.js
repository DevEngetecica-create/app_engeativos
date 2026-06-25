// Gerador do PowerPoint da proposta de checklist (Engetecnica)
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const pptxgen = require("pptxgenjs");

const DIR = __dirname;

const COLORS = {
  navy: "1F2A55",
  navyDark: "141A35",
  orange: "FF7639",
  orangeDark: "E54F0C",
  blue: "1F51FE",
  green: "22B07D",
  greenSoft: "E6F6EC",
  red: "E1201D",
  redSoft: "FDECEA",
  bg: "F7F8FC",
  text: "1E1E2E",
  textMute: "5C6379",
  cardBorder: "E2E5EE",
  white: "FFFFFF",
  yellowBg: "FFF5E6",
};

const FONT = "Calibri";
const FONT_TITLE = "Cambria";

async function svgToPng(svgPath, outPath, width) {
  const buf = await sharp(svgPath, { density: 300 })
    .resize({ width, withoutEnlargement: false })
    .png({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  console.log(`  ✓ ${path.basename(outPath)} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log("[1/3] Convertendo SVGs → PNG (300dpi)...");
  await svgToPng(path.join(DIR, "01-tutorial-novo.svg"), path.join(DIR, "01-tutorial-novo.png"), 1620);
  await svgToPng(path.join(DIR, "02-app-redesign.svg"), path.join(DIR, "02-app-redesign.png"), 1800);
  await svgToPng(path.join(DIR, "03-cartao-a5.svg"), path.join(DIR, "03-cartao-a5.png"), 1860);
  await svgToPng(path.join(DIR, "04-storyboard-video.svg"), path.join(DIR, "04-storyboard-video.png"), 2100);

  console.log("[2/3] Gerando PowerPoint...");
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3 × 7.5
  pres.author = "Samuel Ferreira de Melo";
  pres.company = "Engetecnica";
  pres.title = "Proposta — Reduzir confusão no Checklist";
  pres.subject = "Aprovação Gerência de Frota";

  // ============================================================
  // SLIDE 1 — CAPA
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.navyDark };

    // "Mancha" decorativa laranja em círculo no canto
    s.addShape(pres.shapes.OVAL, {
      x: 9.8, y: -3.0, w: 7.5, h: 7.5,
      fill: { color: COLORS.orange, transparency: 70 }, line: { type: "none" }
    });
    s.addShape(pres.shapes.OVAL, {
      x: -2.0, y: 4.5, w: 5.5, h: 5.5,
      fill: { color: COLORS.blue, transparency: 80 }, line: { type: "none" }
    });

    // Marca topo — rich text array para evitar sobreposição
    s.addText([
      { text: "ENGE", options: { color: COLORS.white } },
      { text: "TECNICA", options: { color: COLORS.orange } },
    ], {
      x: 0.7, y: 0.5, w: 5, h: 0.5,
      fontSize: 22, bold: true, fontFace: FONT, charSpacing: 8, margin: 0
    });

    s.addText("PROPOSTA · GERÊNCIA DE FROTA", {
      x: 0.7, y: 2.4, w: 12, h: 0.4,
      fontSize: 14, bold: true, fontFace: FONT, color: COLORS.orange, charSpacing: 6
    });

    s.addText("Reduzir confusão no Checklist", {
      x: 0.7, y: 2.9, w: 12, h: 1.0,
      fontSize: 48, bold: true, fontFace: FONT_TITLE, color: COLORS.white
    });

    s.addText("Abertura + Encerramento — 3 mudanças complementares", {
      x: 0.7, y: 4.0, w: 12, h: 0.6,
      fontSize: 22, fontFace: FONT, color: "B9C2D6"
    });

    // Linha decorativa fina horizontal
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7, y: 4.85, w: 1.5, h: 0.04,
      fill: { color: COLORS.orange }, line: { type: "none" }
    });

    s.addText([
      { text: "Apresentado por:  ", options: { color: "8A93A6", fontSize: 13 } },
      { text: "Samuel Ferreira de Melo", options: { color: COLORS.white, fontSize: 13, bold: true } },
    ], { x: 0.7, y: 5.4, w: 8, h: 0.4, fontFace: FONT, margin: 0 });

    s.addText([
      { text: "TI · Engetecnica   ·   ", options: { color: "8A93A6", fontSize: 12 } },
      { text: "samuel.melo@engetecnica.com.br", options: { color: "B9C2D6", fontSize: 12 } },
    ], { x: 0.7, y: 5.8, w: 8, h: 0.4, fontFace: FONT, margin: 0 });

    s.addText("23 · jun · 2026", {
      x: 11.3, y: 6.8, w: 1.3, h: 0.35,
      fontSize: 11, color: "8A93A6", fontFace: FONT, align: "right"
    });

    s.addNotes(
      "Capa. Cumprimentar. Mencionar que vou apresentar uma proposta de 5 min, " +
      "com decisão simples no fim (3 OKs). Sem custo escondido."
    );
  }

  // ============================================================
  // SLIDE 2 — RESUMO EXECUTIVO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addText("Resumo executivo", {
      x: 0.6, y: 0.5, w: 12, h: 0.6,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("3 linhas. 3 decisões. < 8 h de desenvolvimento.", {
      x: 0.6, y: 1.05, w: 12, h: 0.4,
      fontSize: 16, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    // 3 cards horizontais
    const cardY = 2.0, cardH = 4.2, cardW = 3.95, gap = 0.25;
    const startX = 0.6;
    const cards = [
      {
        icon: "①",
        title: "O problema",
        subtitle: "Operadores se confundem",
        body: "A equipe não percebe que são 2 momentos diferentes — chegada e saída. Sem o encerramento, a hora não é contabilizada e o veículo fica \"aberto\" no sistema.",
        color: COLORS.red, bg: COLORS.redSoft
      },
      {
        icon: "②",
        title: "A causa",
        subtitle: "Tutorial e app não comunicam",
        body: "Tutorial atual diz \"abertura OU encerramento\" — interpretado como \"escolha um\". App tem só 1 botão genérico, sem lembrete visual do que falta encerrar.",
        color: COLORS.orange, bg: COLORS.yellowBg
      },
      {
        icon: "③",
        title: "A solução",
        subtitle: "3 camadas de defesa",
        body: "Tutorial novo (4 h), redesign do app com 2 botões + cores semafóricas (3 dias), e cartão A5 plastificado no painel do veículo (R$ 5/un). Juntos eliminam o erro.",
        color: COLORS.green, bg: COLORS.greenSoft
      }
    ];

    cards.forEach((c, i) => {
      const x = startX + i * (cardW + gap);
      // Card branco
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: cardY, w: cardW, h: cardH,
        fill: { color: COLORS.white },
        line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.12,
        shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 }
      });
      // Número grande circular
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.4, y: cardY + 0.4, w: 0.9, h: 0.9,
        fill: { color: c.bg }, line: { color: c.color, width: 2 }
      });
      s.addText(c.icon, {
        x: x + 0.4, y: cardY + 0.4, w: 0.9, h: 0.9,
        fontSize: 30, bold: true, fontFace: FONT_TITLE, color: c.color,
        align: "center", valign: "middle", margin: 0
      });
      // Título
      s.addText(c.title, {
        x: x + 0.4, y: cardY + 1.5, w: cardW - 0.8, h: 0.5,
        fontSize: 22, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
      });
      // Subtítulo
      s.addText(c.subtitle, {
        x: x + 0.4, y: cardY + 2.0, w: cardW - 0.8, h: 0.4,
        fontSize: 13, bold: true, fontFace: FONT, color: c.color, margin: 0
      });
      // Body
      s.addText(c.body, {
        x: x + 0.4, y: cardY + 2.55, w: cardW - 0.8, h: cardH - 2.75,
        fontSize: 13, fontFace: FONT, color: COLORS.textMute, valign: "top", margin: 0
      });
    });

    s.addNotes(
      "Resumo em 3 cards: problema, causa, solução. Cada um é uma frase principal. " +
      "Não entrar em detalhe técnico aqui — só posicionar. Próximos slides aprofundam."
    );
  }

  // ============================================================
  // SLIDE 3 — O PROBLEMA (consequências)
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addText("O problema, na voz do operador", {
      x: 0.6, y: 0.5, w: 12, h: 0.6,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });

    // Citação grande em destaque
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 1.4, w: 12.1, h: 1.55,
      fill: { color: COLORS.white },
      line: { color: COLORS.cardBorder, width: 1 },
      rectRadius: 0.14,
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 }
    });
    // Aspas grandes
    s.addText("“", {
      x: 0.8, y: 1.35, w: 1.0, h: 1.2,
      fontSize: 92, bold: true, fontFace: FONT_TITLE, color: COLORS.orange, margin: 0
    });
    s.addText("Cheguei, fiz o checklist. Por que tenho que fazer de novo no final?", {
      x: 1.8, y: 1.6, w: 10.5, h: 1.1,
      fontSize: 22, italic: true, fontFace: FONT_TITLE, color: COLORS.text, valign: "middle", margin: 0
    });
    s.addText("— Operador da frota", {
      x: 1.8, y: 2.55, w: 10.5, h: 0.35,
      fontSize: 12, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    s.addText("Sem o encerramento:", {
      x: 0.6, y: 3.25, w: 12, h: 0.5,
      fontSize: 18, bold: true, fontFace: FONT, color: COLORS.text, margin: 0
    });

    // 4 consequências em 2×2
    const items = [
      { ic: "⏱", t: "A hora trabalhada não é contabilizada corretamente" },
      { ic: "🔧", t: "Manutenção preventiva perde dados de uso (horímetro/km de saída)" },
      { ic: "📋", t: "Problemas que surgiram durante o dia ficam sem registro" },
      { ic: "📊", t: "Relatórios distorcidos: turnos \"abertos\" indefinidamente" },
    ];

    const colW = 5.95, rowH = 1.45;
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * (colW + 0.2);
      const y = 3.85 + row * (rowH + 0.15);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: colW, h: rowH,
        fill: { color: COLORS.white },
        line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.1
      });
      // Caixa de ícone
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: x + 0.25, y: y + 0.3, w: 0.85, h: 0.85,
        fill: { color: COLORS.redSoft }, line: { type: "none" },
        rectRadius: 0.12
      });
      s.addText(it.ic, {
        x: x + 0.25, y: y + 0.3, w: 0.85, h: 0.85,
        fontSize: 28, align: "center", valign: "middle", margin: 0
      });
      s.addText(it.t, {
        x: x + 1.25, y: y + 0.2, w: colW - 1.4, h: rowH - 0.4,
        fontSize: 14, fontFace: FONT, color: COLORS.text, valign: "middle", margin: 0
      });
    });

    s.addNotes(
      "Ler a citação em voz alta com calma. Pausar. Listar as 4 consequências objetivas. " +
      "O ponto: não é só inconveniente — afeta produção, manutenção e folha de pagamento."
    );
  }

  // ============================================================
  // SLIDE 4 — POR QUE ESTÁ ACONTECENDO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addText("Por que está acontecendo?", {
      x: 0.6, y: 0.5, w: 12, h: 0.6,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("3 causas identificadas — todas resolvíveis com design, sem culpar o operador.", {
      x: 0.6, y: 1.05, w: 12, h: 0.4,
      fontSize: 15, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    const causas = [
      {
        n: "1",
        title: "Tutorial atual",
        body: "Primeira frase diz: \"Todo checklist tem MODO ABERTURA OU ENCERRAMENTO\". Para um operador leigo, esse \"ou\" é lido como \"escolha um dos dois\" — exatamente o oposto da regra.",
        accent: COLORS.orange
      },
      {
        n: "2",
        title: "App genérico",
        body: "Há um único botão \"Veículos da Frota\". Não há nada que lembre o operador de que abriu um turno e ainda não encerrou. A regra depende 100 % da memória.",
        accent: COLORS.blue
      },
      {
        n: "3",
        title: "Equipe com baixa alfabetização",
        body: "Texto longo é ignorado. A solução não é \"explicar melhor\" — é redundância visual: pictograma + cor + repetição em camadas (tutorial + app + cartão impresso).",
        accent: COLORS.green
      }
    ];

    const cardW = 4.0, cardH = 4.5, startX = 0.6, gap = 0.25, cardY = 1.85;
    causas.forEach((c, i) => {
      const x = startX + i * (cardW + gap);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: cardY, w: cardW, h: cardH,
        fill: { color: COLORS.white },
        line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.12,
        shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 }
      });
      // Número grande translúcido
      s.addText(c.n, {
        x: x + 0.3, y: cardY + 0.2, w: 2.0, h: 1.5,
        fontSize: 92, bold: true, fontFace: FONT_TITLE, color: c.accent,
        align: "left", valign: "top", transparency: 70, margin: 0
      });
      s.addText(c.title, {
        x: x + 0.4, y: cardY + 1.7, w: cardW - 0.8, h: 0.6,
        fontSize: 22, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
      });
      // Linha
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + 0.4, y: cardY + 2.35, w: 0.6, h: 0.04,
        fill: { color: c.accent }, line: { type: "none" }
      });
      s.addText(c.body, {
        x: x + 0.4, y: cardY + 2.55, w: cardW - 0.8, h: cardH - 2.75,
        fontSize: 13, fontFace: FONT, color: COLORS.textMute, valign: "top", margin: 0
      });
    });

    s.addNotes(
      "Cada causa é resolvível, e isso me leva às 3 propostas dos próximos slides. " +
      "Importante: nenhuma das causas é \"o operador é descuidado\". É design ruim."
    );
  }

  // ============================================================
  // SLIDE 5 — CAMADA 1 — TUTORIAL NOVO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    // Cabeçalho com badge
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fill: { color: COLORS.green }, line: { type: "none" }, rectRadius: 0.05
    });
    s.addText("CAMADA 1", {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fontSize: 12, bold: true, fontFace: FONT, color: COLORS.white,
      align: "center", valign: "middle", charSpacing: 5, margin: 0
    });

    s.addText("Refazer o tutorial", {
      x: 0.6, y: 1.0, w: 12, h: 0.65,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("Sem custo financeiro · sem mexer em produção · pode ser feito esta semana", {
      x: 0.6, y: 1.65, w: 12, h: 0.4,
      fontSize: 14, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    // Imagem à esquerda
    s.addImage({
      path: path.join(DIR, "01-tutorial-novo.png"),
      x: 0.6, y: 2.2, w: 5.0, h: 4.85,
      sizing: { type: "contain", w: 5.0, h: 4.85 }
    });

    // Lista de melhorias à direita
    const rightX = 6.0;
    s.addText("O que muda no tutorial:", {
      x: rightX, y: 2.25, w: 6.7, h: 0.45,
      fontSize: 17, bold: true, fontFace: FONT, color: COLORS.text, margin: 0
    });

    const melhorias = [
      { ic: "🌅", t: "Metáfora forte: sol = chegada, lua = saída" },
      { ic: "🔢", t: "Contador visível: 1/2 HOJE → 2/2 ✓" },
      { ic: "🗣", t: "Repete 3× a frase \"2 CHECKLISTS POR DIA\"" },
      { ic: "📐", t: "10 passos divididos em 2 ciclos (chegou / vai embora)" },
      { ic: "⚠️", t: "Tela final de alerta: \"Esqueceu? Sua hora não conta\"" },
    ];

    melhorias.forEach((m, i) => {
      const y = 2.85 + i * 0.75;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rightX, y, w: 6.7, h: 0.62,
        fill: { color: COLORS.white }, line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.08
      });
      s.addText(m.ic, {
        x: rightX + 0.15, y, w: 0.6, h: 0.62,
        fontSize: 22, align: "center", valign: "middle", margin: 0
      });
      s.addText(m.t, {
        x: rightX + 0.8, y, w: 5.7, h: 0.62,
        fontSize: 13, fontFace: FONT, color: COLORS.text, valign: "middle", margin: 0
      });
    });

    // Box de custo no rodapé direito
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rightX, y: 6.7, w: 6.7, h: 0.55,
      fill: { color: COLORS.greenSoft }, line: { color: COLORS.green, width: 1.5 },
      rectRadius: 0.08
    });
    s.addText([
      { text: "Custo: ", options: { fontSize: 13, bold: true, color: "0A7A52" } },
      { text: "~4 h de desenvolvimento  ·  ", options: { fontSize: 13, color: "0A7A52" } },
      { text: "Risco: ", options: { fontSize: 13, bold: true, color: "0A7A52" } },
      { text: "zero", options: { fontSize: 13, color: "0A7A52" } },
    ], { x: rightX + 0.2, y: 6.7, w: 6.5, h: 0.55, fontFace: FONT, valign: "middle", margin: 0 });

    s.addNotes(
      "Camada 1 é a base — não dá pra fazer nada nas outras sem reforçar a mensagem visual primeiro. " +
      "Já está pronta para ser implementada. Posso publicar essa semana mesmo se aprovado."
    );
  }

  // ============================================================
  // SLIDE 6 — CAMADA 2 — REDESIGN DO APP
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fill: { color: COLORS.orange }, line: { type: "none" }, rectRadius: 0.05
    });
    s.addText("CAMADA 2", {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fontSize: 12, bold: true, fontFace: FONT, color: COLORS.white,
      align: "center", valign: "middle", charSpacing: 5, margin: 0
    });

    s.addText("Redesign do app", {
      x: 0.6, y: 1.0, w: 12, h: 0.65,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("Elimina a possibilidade de erro — não depende mais da memória do operador.", {
      x: 0.6, y: 1.65, w: 12, h: 0.4,
      fontSize: 14, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    // Imagem larga ocupando 2/3 esquerda
    s.addImage({
      path: path.join(DIR, "02-app-redesign.png"),
      x: 0.6, y: 2.2, w: 8.0, h: 4.9,
      sizing: { type: "contain", w: 8.0, h: 4.9 }
    });

    // 5 mudanças à direita
    const rightX = 8.9;
    s.addText("5 mudanças no app:", {
      x: rightX, y: 2.25, w: 3.8, h: 0.45,
      fontSize: 17, bold: true, fontFace: FONT, color: COLORS.text, margin: 0
    });

    const mudancas = [
      "2 botões grandes na Home (Abrir / Encerrar)",
      "Banner persistente: \"falta encerrar AC-001\"",
      "Cores semafóricas na lista (verde / laranja / vermelho)",
      "Notificação local de lembrete às 17 h",
      "Renomear: \"Checklist\" → \"Abrir/Encerrar turno\""
    ];

    mudancas.forEach((t, i) => {
      const y = 2.9 + i * 0.72;
      // Bola numerada
      s.addShape(pres.shapes.OVAL, {
        x: rightX, y: y + 0.06, w: 0.45, h: 0.45,
        fill: { color: COLORS.orange }, line: { type: "none" }
      });
      s.addText(String(i + 1), {
        x: rightX, y: y + 0.06, w: 0.45, h: 0.45,
        fontSize: 14, bold: true, fontFace: FONT, color: COLORS.white,
        align: "center", valign: "middle", margin: 0
      });
      s.addText(t, {
        x: rightX + 0.55, y, w: 3.25, h: 0.6,
        fontSize: 12.5, fontFace: FONT, color: COLORS.text, valign: "middle", margin: 0
      });
    });

    // Box custo embaixo
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rightX, y: 6.6, w: 3.8, h: 0.65,
      fill: { color: COLORS.yellowBg }, line: { color: COLORS.orange, width: 1.5 },
      rectRadius: 0.08
    });
    s.addText([
      { text: "Custo: ", options: { fontSize: 12, bold: true, color: COLORS.orangeDark } },
      { text: "~3 dias de dev", options: { fontSize: 12, color: COLORS.orangeDark, breakLine: true } },
      { text: "Risco: ", options: { fontSize: 12, bold: true, color: COLORS.orangeDark } },
      { text: "baixo (testar em homologação)", options: { fontSize: 12, color: COLORS.orangeDark } },
    ], { x: rightX + 0.15, y: 6.6, w: 3.6, h: 0.65, fontFace: FONT, valign: "middle", margin: 0 });

    s.addNotes(
      "Camada 2 é onde o erro fica IMPOSSÍVEL. Mudança 5 (renomear) sozinha resolve 80% da confusão. " +
      "1, 2 e 3 (botões, banner, cores) fecham os outros 20%."
    );
  }

  // ============================================================
  // SLIDE 7 — CAMADA 3 — CARTÃO IMPRESSO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fill: { color: COLORS.blue }, line: { type: "none" }, rectRadius: 0.05
    });
    s.addText("CAMADA 3", {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fontSize: 12, bold: true, fontFace: FONT, color: COLORS.white,
      align: "center", valign: "middle", charSpacing: 5, margin: 0
    });

    s.addText("Cartão impresso no veículo", {
      x: 0.6, y: 1.0, w: 12, h: 0.65,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("Lembrete físico que não desliga — o motorista vê toda vez que entra.", {
      x: 0.6, y: 1.65, w: 12, h: 0.4,
      fontSize: 14, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    // Imagem grande centralizada
    s.addImage({
      path: path.join(DIR, "03-cartao-a5.png"),
      x: 0.6, y: 2.2, w: 8.5, h: 4.85,
      sizing: { type: "contain", w: 8.5, h: 4.85 }
    });

    // Painel à direita
    const rightX = 9.4;
    s.addText("Como funciona:", {
      x: rightX, y: 2.25, w: 3.3, h: 0.45,
      fontSize: 17, bold: true, fontFace: FONT, color: COLORS.text, margin: 0
    });

    const passos = [
      { n: "①", t: "Imprimir A5 horizontal (210×148mm), papel couché 250g" },
      { n: "②", t: "Plastificar (acetato 125 mic ou laminação a quente)" },
      { n: "③", t: "Fixar com fita dupla face no painel do veículo" },
      { n: "④", t: "Distribuir para toda a frota em uma só ordem" }
    ];

    passos.forEach((p, i) => {
      const y = 2.85 + i * 0.85;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rightX, y, w: 3.3, h: 0.72,
        fill: { color: COLORS.white }, line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.08
      });
      s.addText(p.n, {
        x: rightX + 0.1, y, w: 0.5, h: 0.72,
        fontSize: 20, bold: true, fontFace: FONT_TITLE, color: COLORS.blue,
        align: "center", valign: "middle", margin: 0
      });
      s.addText(p.t, {
        x: rightX + 0.6, y, w: 2.65, h: 0.72,
        fontSize: 11.5, fontFace: FONT, color: COLORS.text, valign: "middle", margin: 0
      });
    });

    // Custo
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rightX, y: 6.6, w: 3.3, h: 0.65,
      fill: { color: "EAF1FE" }, line: { color: COLORS.blue, width: 1.5 },
      rectRadius: 0.08
    });
    s.addText([
      { text: "Custo: ", options: { fontSize: 12, bold: true, color: COLORS.blue } },
      { text: "~R$ 5 / veículo", options: { fontSize: 12, color: COLORS.blue, breakLine: true } },
      { text: "Risco: ", options: { fontSize: 12, bold: true, color: COLORS.blue } },
      { text: "zero", options: { fontSize: 12, color: COLORS.blue } },
    ], { x: rightX + 0.15, y: 6.6, w: 3.1, h: 0.65, fontFace: FONT, valign: "middle", margin: 0 });

    s.addNotes(
      "Para equipe com baixa alfabetização, esse cartão pode ser o mais eficaz dos três. " +
      "O motorista vê toda vez. Imprimir 50 cartões custa ~R$ 250 — uma ordem só."
    );
  }

  // ============================================================
  // SLIDE 8 — CAMADA 4 — VÍDEO DE TREINAMENTO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fill: { color: COLORS.orange }, line: { type: "none" }, rectRadius: 0.05
    });
    s.addText("CAMADA 4", {
      x: 0.6, y: 0.5, w: 1.85, h: 0.4,
      fontSize: 12, bold: true, fontFace: FONT, color: COLORS.white,
      align: "center", valign: "middle", charSpacing: 5, margin: 0
    });

    s.addText("Vídeo de treinamento (WhatsApp)", {
      x: 0.6, y: 1.0, w: 12, h: 0.65,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("75 segundos · gravado pelo encarregado · no canal que a equipe já usa.", {
      x: 0.6, y: 1.65, w: 12, h: 0.4,
      fontSize: 14, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    // Storyboard imagem (larga, horizontal)
    s.addImage({
      path: path.join(DIR, "04-storyboard-video.png"),
      x: 0.6, y: 2.2, w: 8.0, h: 4.85,
      sizing: { type: "contain", w: 8.0, h: 4.85 }
    });

    // Painel direito — por que funciona + cuidados
    const rightX = 8.9;
    s.addText("Por que funciona pra esse público:", {
      x: rightX, y: 2.25, w: 3.8, h: 0.45,
      fontSize: 15, bold: true, fontFace: FONT, color: COLORS.text, margin: 0
    });

    const razoes = [
      { ic: "🗣", t: "Não exige leitura (voz + imagem)" },
      { ic: "👥", t: "Cara humana = confiança" },
      { ic: "💬", t: "WhatsApp é canal natural" },
      { ic: "🔁", t: "Repetível sob demanda" },
    ];
    razoes.forEach((r, i) => {
      const y = 2.8 + i * 0.55;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rightX, y, w: 3.8, h: 0.48,
        fill: { color: COLORS.white }, line: { color: COLORS.cardBorder, width: 1 },
        rectRadius: 0.06
      });
      s.addText(r.ic, {
        x: rightX + 0.1, y, w: 0.5, h: 0.48,
        fontSize: 18, align: "center", valign: "middle", margin: 0
      });
      s.addText(r.t, {
        x: rightX + 0.65, y, w: 3.1, h: 0.48,
        fontSize: 12, fontFace: FONT, color: COLORS.text, valign: "middle", margin: 0
      });
    });

    // Cuidados
    s.addText("⚠️ Cuidados:", {
      x: rightX, y: 5.1, w: 3.8, h: 0.35,
      fontSize: 13, bold: true, fontFace: FONT, color: COLORS.orangeDark, margin: 0
    });
    s.addText([
      { text: "Máximo 75-90 s · ", options: { breakLine: true } },
      { text: "Sem locutor profissional · ", options: { breakLine: true } },
      { text: "Tela real do app, não mockup · ", options: { breakLine: true } },
      { text: "Legendas obrigatórias", options: {} },
    ], {
      x: rightX, y: 5.45, w: 3.8, h: 1.15,
      fontSize: 11, fontFace: FONT, color: COLORS.text, margin: 0
    });

    // Box custo
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: rightX, y: 6.6, w: 3.8, h: 0.65,
      fill: { color: COLORS.yellowBg }, line: { color: COLORS.orange, width: 1.5 },
      rectRadius: 0.08
    });
    s.addText([
      { text: "Custo: ", options: { fontSize: 12, bold: true, color: COLORS.orangeDark } },
      { text: "R$ 0 · ~3 h encarregado", options: { fontSize: 12, color: COLORS.orangeDark, breakLine: true } },
      { text: "Risco: ", options: { fontSize: 12, bold: true, color: COLORS.orangeDark } },
      { text: "zero", options: { fontSize: 12, color: COLORS.orangeDark } },
    ], { x: rightX + 0.15, y: 6.6, w: 3.6, h: 0.65, fontFace: FONT, valign: "middle", margin: 0 });

    s.addNotes(
      "Camada 4 é o vetor mais eficaz pra equipe leiga. O canal (WhatsApp) já existe. " +
      "Roteiro completo + storyboard em arquivos separados. Posso ajudar a editar, " +
      "mas a gravação é melhor com o encarregado — voz dele tem mais autoridade que voz da TI."
    );
  }

  // ============================================================
  // SLIDE 9 — CRONOGRAMA
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.bg };

    s.addText("Cronograma sugerido", {
      x: 0.6, y: 0.5, w: 12, h: 0.6,
      fontSize: 32, bold: true, fontFace: FONT_TITLE, color: COLORS.text, margin: 0
    });
    s.addText("4 semanas do OK ao primeiro KPI medido.", {
      x: 0.6, y: 1.05, w: 12, h: 0.4,
      fontSize: 15, fontFace: FONT, color: COLORS.textMute, margin: 0
    });

    const tabela = [
      [
        { text: "Semana", options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, align: "center", valign: "middle" } },
        { text: "Ação", options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" } },
        { text: "Responsável", options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" } },
        { text: "Custo", options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, align: "center", valign: "middle" } },
      ],
      [
        { text: "1", options: { bold: true, align: "center", valign: "middle", color: COLORS.orange, fontSize: 18 } },
        { text: "Aprovação + refazer tutorial (C1) + gravar vídeo WhatsApp (C4)", options: { valign: "middle" } },
        { text: "Gerente · TI · Encarregado", options: { valign: "middle" } },
        { text: "~4 h dev + ~3 h grav.", options: { align: "center", valign: "middle" } },
      ],
      [
        { text: "2", options: { bold: true, align: "center", valign: "middle", color: COLORS.orange, fontSize: 18 } },
        { text: "Implementar mudanças no app (C2) + imprimir cartões A5 (C3)", options: { valign: "middle" } },
        { text: "TI · Gráfica", options: { valign: "middle" } },
        { text: "~3 dias dev + R$ 5/un", options: { align: "center", valign: "middle" } },
      ],
      [
        { text: "3", options: { bold: true, align: "center", valign: "middle", color: COLORS.orange, fontSize: 18 } },
        { text: "Lançar nova versão do app + distribuir cartões + repostar vídeo no grupo", options: { valign: "middle" } },
        { text: "TI · Encarregado", options: { valign: "middle" } },
        { text: "—", options: { align: "center", valign: "middle" } },
      ],
      [
        { text: "4", options: { bold: true, align: "center", valign: "middle", color: COLORS.orange, fontSize: 18 } },
        { text: "Medir queda em \"turnos abertos sem encerrar\" (1ª leitura do KPI)", options: { valign: "middle" } },
        { text: "Gerente", options: { valign: "middle" } },
        { text: "—", options: { align: "center", valign: "middle" } },
      ],
    ];

    s.addTable(tabela, {
      x: 0.6, y: 1.7, w: 12.1, h: 4.5,
      colW: [1.3, 6.0, 3.0, 1.8],
      rowH: [0.55, 1.0, 1.0, 1.0, 1.0],
      fontSize: 12.5, fontFace: FONT, color: COLORS.text,
      border: { type: "solid", pt: 0.5, color: COLORS.cardBorder },
      fill: { color: COLORS.white }
    });

    // Caixa total embaixo
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 6.4, w: 12.1, h: 0.65,
      fill: { color: COLORS.navy }, line: { type: "none" }, rectRadius: 0.08
    });
    s.addText([
      { text: "Total: ", options: { fontSize: 13, bold: true, color: COLORS.orange } },
      { text: "≈ 4 semanas  ·  ", options: { fontSize: 13, color: COLORS.white } },
      { text: "< 8 h de dev  ·  ", options: { fontSize: 13, color: COLORS.white } },
      { text: "~3 h do encarregado  ·  ", options: { fontSize: 13, color: COLORS.white } },
      { text: "R$ 5 × frota (uma vez)", options: { fontSize: 13, color: COLORS.white } },
    ], { x: 0.6, y: 6.4, w: 12.1, h: 0.65, fontFace: FONT, align: "center", valign: "middle", margin: 0 });

    s.addNotes(
      "Cronograma realista. Nenhuma das ações requer parada de produção. " +
      "Camada 2 entra na próxima janela de release programada — não acelera deploy."
    );
  }

  // ============================================================
  // SLIDE 10 — KPI + DECISÃO
  // ============================================================
  {
    const s = pres.addSlide();
    s.background = { color: COLORS.navyDark };

    // Glow decorativo
    s.addShape(pres.shapes.OVAL, {
      x: -2.5, y: -2.5, w: 6, h: 6,
      fill: { color: COLORS.orange, transparency: 80 }, line: { type: "none" }
    });
    s.addShape(pres.shapes.OVAL, {
      x: 10, y: 4.5, w: 5.5, h: 5.5,
      fill: { color: COLORS.green, transparency: 80 }, line: { type: "none" }
    });

    s.addText("Decisão", {
      x: 0.6, y: 0.4, w: 12, h: 0.65,
      fontSize: 36, bold: true, fontFace: FONT_TITLE, color: COLORS.white, margin: 0
    });
    s.addText("4 checkboxes — pode aprovar parcialmente, integralmente, ou pedir ajustes.", {
      x: 0.6, y: 1.05, w: 12, h: 0.35,
      fontSize: 14, fontFace: FONT, color: "B9C2D6", margin: 0
    });

    // 4 cards de aprovação (compactos pra caber)
    // Cores escolhidas pra ALTO contraste com fundo navy-dark do slide
    const cards = [
      { color: "4ADE80",         letra: "A", titulo: "Refazer tutorial (Camada 1)",            sub: "~4 h dev · risco zero · faço esta semana" },
      { color: "FFA940",         letra: "B", titulo: "Redesign do app (Camada 2)",             sub: "~3 dias dev · testar em homologação primeiro" },
      { color: "60A5FA",         letra: "C", titulo: "Cartão A5 impresso (Camada 3)",          sub: "~R$ 5/veículo · uma ordem de impressão" },
      { color: "F472B6",         letra: "D", titulo: "Vídeo de treinamento WhatsApp (Camada 4)", sub: "R$ 0 · ~3 h do encarregado · publicado em 1 dia" },
    ];

    cards.forEach((c, i) => {
      const x = 0.6, y = 1.55 + i * 0.85;
      // Card escuro semi-transparente
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y, w: 12.1, h: 0.78,
        fill: { color: "FFFFFF", transparency: 88 },
        line: { color: c.color, width: 2 },
        rectRadius: 0.1
      });
      // Quadrado de check
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: x + 0.25, y: y + 0.16, w: 0.46, h: 0.46,
        fill: { color: COLORS.white }, line: { color: c.color, width: 2 },
        rectRadius: 0.05
      });
      s.addText(c.letra, {
        x: x + 0.82, y: y + 0.06, w: 0.45, h: 0.65,
        fontSize: 24, bold: true, fontFace: FONT_TITLE, color: c.color,
        align: "center", valign: "middle", margin: 0
      });
      s.addText(c.titulo, {
        x: x + 1.35, y: y + 0.08, w: 10.6, h: 0.35,
        fontSize: 15, bold: true, fontFace: FONT, color: COLORS.white, margin: 0
      });
      s.addText(c.sub, {
        x: x + 1.35, y: y + 0.42, w: 10.6, h: 0.32,
        fontSize: 11, fontFace: FONT, color: "CAD5E8", margin: 0
      });
    });

    // KPI box embaixo (compacto)
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 5.15, w: 12.1, h: 1.55,
      fill: { color: "1F2A55" }, line: { color: COLORS.orange, width: 2 },
      rectRadius: 0.12
    });
    s.addText("KPI sugerido para medir:", {
      x: 0.85, y: 5.3, w: 8, h: 0.35,
      fontSize: 11, bold: true, color: COLORS.orange, fontFace: FONT, charSpacing: 4, margin: 0
    });
    s.addText("% de turnos com encerramento no mesmo dia", {
      x: 0.85, y: 5.65, w: 8, h: 0.55,
      fontSize: 20, bold: true, fontFace: FONT_TITLE, color: COLORS.white, margin: 0
    });
    s.addText("Hoje (estimado): < 60 %  →  Meta em 4 semanas: ≥ 90 %", {
      x: 0.85, y: 6.2, w: 8, h: 0.4,
      fontSize: 12, fontFace: FONT, color: "B9C2D6", margin: 0
    });

    // Número grande "90%" à direita
    s.addText("90%", {
      x: 9.5, y: 5.2, w: 3.0, h: 1.45,
      fontSize: 76, bold: true, fontFace: FONT_TITLE, color: COLORS.orange,
      align: "center", valign: "middle", margin: 0
    });

    // Rodapé com contato
    s.addText([
      { text: "Samuel Ferreira de Melo   ·   ", options: { color: "8A93A6" } },
      { text: "samuel.melo@engetecnica.com.br", options: { color: COLORS.white } },
    ], {
      x: 0.6, y: 6.95, w: 12.1, h: 0.3,
      fontSize: 11, fontFace: FONT, align: "center", margin: 0
    });

    s.addNotes(
      "Fechamento. Pedir decisão item-a-item. Camadas 1 e 4 podem começar hoje sem custo monetário. " +
      "Camadas 2 e 3 podem ser aprovadas em separado se houver dúvida sobre custo/escopo. " +
      "Reforçar o KPI no final: queremos sair de < 60 % para 90 % em 4 semanas. " +
      "Se aprovar só A (tutorial) e D (vídeo), já temos avanço imediato sem custo."
    );
  }

  const outFile = path.join(DIR, "proposta-checklist.pptx");
  await pres.writeFile({ fileName: outFile });
  console.log(`[3/3] PPTX salvo em: ${outFile}`);
  const stat = fs.statSync(outFile);
  console.log(`        Tamanho: ${(stat.size / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
