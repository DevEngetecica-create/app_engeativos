# Proposta — Reduzir confusão no Checklist (Abertura + Encerramento)

**Para:** Gerente da Frota
**De:** Samuel Ferreira de Melo (Engetecnica · TI)
**Data:** 2026-06-23
**Anexos:** 3 mockups visuais (SVG/PNG)

---

## Resumo executivo (3 linhas)

A equipe operacional está se confundindo com a obrigação de fazer **2 checklists por dia** (abertura na chegada + encerramento na saída). Identifiquei a causa e proponho **3 mudanças complementares** — 1 imediata sem custo, 1 no app e 1 impressa — que juntas eliminam a confusão. Custo total estimado: **< 8h de desenvolvimento + 1 ordem de impressão**.

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

## Proposta — 3 camadas de defesa

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

## Cronograma sugerido

| Semana | Ação | Responsável | Custo |
|---|---|---|---|
| 1 | Aprovação da proposta | Gerente de Frota | — |
| 1 | Refazer tutorial (Camada 1) | TI (Samuel) | ~4h dev |
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
- [ ] **KPI** (% turnos encerrados/dia) — dashboard simples no Engeativos web

---

## Anexos

1. **`01-tutorial-novo.svg`** — Mockup das 4 telas-chave do novo tutorial
2. **`02-app-redesign.svg`** — Comparativo ANTES x DEPOIS do app
3. **`03-cartao-a5.svg`** — Cartão pronto pra impressão (A5 plastificado)

> 💡 **Como abrir os SVGs**: arrasta o arquivo pra qualquer navegador (Chrome, Edge, Firefox). Ou se preferir PNG, posso converter — me avisa.

---

**Contato:** samuel.melo@engetecnica.com.br
