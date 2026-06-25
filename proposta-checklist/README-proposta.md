# Proposta — Reduzir confusão no Checklist (Abertura + Encerramento)

**Para:** Gerente da Frota
**De:** Samuel Ferreira de Melo (Engetecnica · TI)
**Data:** 2026-06-23
**Anexos:** 3 mockups visuais (SVG/PNG)

---

## Resumo executivo (3 linhas)

A equipe operacional está se confundindo com a obrigação de fazer **2 checklists por dia** (abertura na chegada + encerramento na saída). Identifiquei a causa e proponho **4 mudanças complementares** — 1 imediata sem custo, 1 no app, 1 impressa e 1 vídeo curto pelo WhatsApp — que juntas eliminam a confusão. Custo total estimado: **< 8h de desenvolvimento + 1 ordem de impressão + ~3h do encarregado pra gravar o vídeo**.

---

## O problema

> "Cheguei, fiz o checklist. Por que tenho que fazer de novo no final?"

A equipe **não percebe que são 2 momentos diferentes obrigatórios**. Eles assumem que "checklist" é uma coisa só. Sem o encerramento:

- ❌ A hora trabalhada não é contabilizada corretamente
- ❌ Não temos registro do estado do veículo no fim do turno (problemas que apareceram durante o dia ficam invisíveis)
- ❌ O turno do operador fica "aberto" no sistema, gerando relatórios ruins
- ❌ Manutenção preventiva perde informações de uso (horímetro/km do encerramento)

### Por que está acontecendo?

Identifiquei 3 causas:

1. **No tutorial atual**, a primeira frase diz literalmente *"Todo checklist tem MODO ABERTURA OU ENCERRAMENTO"*. O "ou" leva o operador leigo a entender "escolha um dos dois", não "faça os dois".

2. **No app**, há apenas um botão genérico "Veículos da Frota". Não tem nada que lembre o operador que falta encerrar — depende 100% da memória dele.

3. **Equipe leiga + baixa alfabetização** precisa de **redundância visual** (pictograma + cor + repetição), não de texto explicativo. Texto longo é ignorado.

---

## Proposta — 4 camadas de defesa

### 🟢 Camada 1: Refazer o tutorial (anexo `01-tutorial-novo.svg`)

**Custo:** ~4h de desenvolvimento · **Risco:** Zero (não toca em produção) · **Status:** Posso fazer hoje

Reescrever o tutorial existente com:

- **Tela de abertura GRANDE**: "VOCÊ FAZ 2 CHECKLISTS POR DIA" (não dá pra confundir)
- **Metáfora forte**: 🌅 Sol = manhã/chegada · 🌙 Lua = noite/saída
- **Contador visível** no canto: `1 / 2 HOJE` → vira `2 / 2 ✓` quando completa
- **10 passos** divididos em "Chegou" (passos 2-5) + "Vai embora" (passos 6-9) + **Alerta** (passo 10)
- **Consequência clara** na última tela: *"Esqueceu de encerrar? Sua hora NÃO vai contar."*

O tutorial fica acessível em **sga-engeativos.com.br/tutorial/checklist** (já está no ar — só renovar).

---

### 🟡 Camada 2: Mudanças no app (anexo `02-app-redesign.svg`)

**Custo:** ~3 dias de desenvolvimento · **Risco:** Baixo (testes em ambiente de homologação primeiro) · **Status:** Aguarda aprovação

5 mudanças que **eliminam a possibilidade de erro** em vez de só explicar:

1. **2 botões grandes na Home** (em vez do "Veículos da Frota" genérico):
   - 🌅 `ABRIR TURNO` (laranja-sol)
   - 🌙 `ENCERRAR TURNO` (azul-noite)

2. **Banner persistente de pendência** no Home: *"⚠️ Você abriu o AC-001 às 07:14. Falta encerrar."* Só some quando o operador encerra.

3. **Cores semafóricas nos veículos**:
   - 🟢 Verde = livre (pode abrir)
   - 🟠 Laranja = **VOCÊ** abriu, falta encerrar
   - 🔴 Vermelho = outro operador abriu, não toque

4. **Notificação local às 17h**: lembrete suave *"Você abriu X veículos hoje. Lembre de encerrar antes de ir embora."*

5. **Renomear no app**:
   - "Checklist de Abertura" → **"🌅 Abrir o turno"**
   - "Checklist de Encerramento" → **"🌙 Encerrar o turno"**

A mudança 5 sozinha resolve 80% da confusão semântica. As mudanças 1, 2 e 3 deixam o **erro impossível**.

---

### 🟣 Camada 3: Cartão impresso no veículo (anexo `03-cartao-a5.svg`)

**Custo:** ~R$ 5/veículo (impressão A5 plastificada) · **Risco:** Zero · **Status:** Aguarda aprovação

Cartão A5 plastificado, **colado no painel de cada veículo**, mostrando:

- 🌅 **CHEGOU?** Abra o checklist · (4 passos numerados)
- 🌙 **VAI EMBORA?** Encerre o checklist · (4 passos numerados)
- ⚠️ **Esqueceu de encerrar?** Sua hora não vai contar.

O motorista olha pro painel toda vez que entra no veículo. **Lembrete físico que não desliga.**

---

### 🟠 Camada 4: Vídeo de treinamento — 75s no WhatsApp (anexo `04-storyboard-video.svg` + `04-roteiro-video.md`)

**Custo:** R$ 0 monetário · ~3h do encarregado pra gravar + editar · **Risco:** Zero · **Status:** Aguarda aprovação + voluntário pra gravar

Vídeo curto e direto, gravado pelo **encarregado da frota** (ou motorista mais respeitado), distribuído pelo **WhatsApp do grupo** — onde a equipe operacional já vive.

**Por que vídeo é eficaz para este público específico:**

- ✅ **Não exige leitura** — voz + imagem direta (crítico para baixa alfabetização)
- ✅ **Cara humana = confiança** — o cérebro confia em "alguém da gente" mostrando, não em animação
- ✅ **WhatsApp é canal natural** — chega no grupo, todo mundo assiste; link de tutorial ninguém clica
- ✅ **Repetível sob demanda** — "vê o vídeo de novo" funciona

**Cuidados não negociáveis:**

1. **Máximo 75-90s** — mais que isso, ninguém assiste até o fim
2. **NÃO usar locutor profissional** — autenticidade > polish; alguém que a equipe reconhece
3. **Mostrar a tela do app real**, não mockup
4. **Legendas obrigatórias** — muita gente assiste no mudo

**Estrutura do vídeo (8 cenas, 75s):**

| Tempo | Cena | Mensagem-chave |
|---|---|---|
| 0:00–0:08 | Encarregado fala direto pra câmera | "Todo dia, **DOIS checklists**" |
| 0:08–0:12 | Transição: mão desbloqueando celular | (silêncio, som ambiente) |
| 0:12–0:25 | Tela do app: ABRIR turno | "Cheguei. Aperto **ABRIR**." |
| 0:25–0:30 | Pôr-do-sol / relógio passando | (transição visual) |
| 0:30–0:36 | Banner de pendência no app | "Vou pra casa." |
| 0:36–0:48 | Tela do app: ENCERRAR turno | "Aperto **ENCERRAR**." |
| 0:48–1:00 | Encarregado sério no rosto | **"Se esquecer, sua hora NÃO conta."** |
| 1:00–1:15 | Sorri, fecha | "DOIS por dia. Tamo junto!" |

**Distribuição:** WhatsApp do grupo (canal primário) · YouTube unlisted (link no portal) · QR Code no cartão A5 apontando pro vídeo.

---

## Cronograma sugerido

| Semana | Ação | Responsável | Custo |
|---|---|---|---|
| 1 | Aprovação da proposta | Gerente de Frota | — |
| 1 | Refazer tutorial (Camada 1) | TI (Samuel) | ~4h dev |
| 1 | **Gravar e postar vídeo no WhatsApp (Camada 4)** | **Encarregado / TI** | **~3h** |
| 2 | Implementar mudanças no app (Camada 2) | TI (Samuel) | ~3 dias dev |
| 2 | Imprimir cartões A5 plastificados (Camada 3) | Gerente / Gráfica | R$ 5 × N veículos |
| 3 | Lançar nova versão do app | TI + Frota | — |
| 3 | Distribuir cartões nos veículos | Encarregado | — |
| 4 | Medir queda em turnos "abertos sem encerrar" | Gerente | — |

---

## O que medir (depois da implementação)

Sugiro um KPI simples: **% de turnos com encerramento no mesmo dia.**

Hoje, suspeito que esse número está abaixo de 60%. Meta de **90%+ em 4 semanas** após implementar as 3 camadas.

Se você quiser, eu monto um dashboard rápido pro Engeativos web mostrando esse KPI por operador e por veículo.

---

## Decisão necessária

Por favor, marque com **OK / RECUSA / AJUSTAR** cada item:

- [ ] **Camada 1** (Refazer tutorial) — sem custo, posso fazer essa semana
- [ ] **Camada 2** (Mudanças no app) — ~3 dias de desenvolvimento, aguarda OK
- [ ] **Camada 3** (Cartão A5 impresso) — ~R$ 5/veículo, aguarda OK + ordem de impressão
- [ ] **Camada 4** (Vídeo de treinamento WhatsApp) — R$ 0, ~3h do encarregado, aguarda voluntário
- [ ] **KPI** (% turnos encerrados/dia) — dashboard simples no Engeativos web

---

## Anexos

1. **`01-tutorial-novo.svg`** — Mockup das 4 telas-chave do novo tutorial
2. **`02-app-redesign.svg`** — Comparativo ANTES x DEPOIS do app
3. **`03-cartao-a5.svg`** — Cartão pronto pra impressão (A5 plastificado)
4. **`04-storyboard-video.svg`** — Storyboard das 8 cenas-chave do vídeo de 75s
5. **`04-roteiro-video.md`** — Roteiro linha-a-linha + checklist pré-gravação + dicas de edição (CapCut)

> 💡 **Como abrir os SVGs**: arrasta o arquivo pra qualquer navegador (Chrome, Edge, Firefox). Ou se preferir PNG, posso converter — me avisa.

---

**Contato:** samuel.melo@engetecnica.com.br
