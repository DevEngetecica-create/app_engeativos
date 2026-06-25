# Politica de Privacidade — Engeativos

**Ultima atualizacao:** 11 de maio de 2026
**Politica completa:** <https://sga-engeativos.com.br/privacidade>
**Termos de uso e suporte:** <https://sga-engeativos.com.br/suporte>

Este documento descreve quais dados o aplicativo **Engeativos** coleta, como
utilizamos, com quem compartilhamos e como o usuario pode exercer seus
direitos previstos na Lei Geral de Protecao de Dados (Lei n. 13.709/2018).

> Este arquivo serve como template para o conteudo publicado em
> `https://sga-engeativos.com.br/privacidade`. A versao online prevalece em
> caso de divergencia.

---

## 1. Quem somos

- **Controlador dos dados:** Engetecnica / SGA Engeativos.
- **Contato de privacidade:** privacidade@engetecnica.com.br
- **Suporte ao usuario:** suporte@engetecnica.com.br

## 2. Dados coletados

O aplicativo coleta as informacoes abaixo, **exclusivamente para fins
operacionais relacionados a gestao de frota, manutencao preventiva, checklists
de seguranca do trabalho (SMS) e diario de bordo**:

| Categoria | Dados | Finalidade |
|---|---|---|
| Cadastro do usuario | Nome, e-mail corporativo, matricula, CPF, funcao | Identificacao, autenticacao e vinculo trabalhista |
| Autenticacao | Senha (armazenada como hash SHA-256), token de sessao | Login online e offline |
| Operacionais | Veiculos vinculados, obras, horimetro, hodometro, abastecimentos, checklists, fotos de evidencias, assinaturas digitais | Registro das atividades operacionais |
| Localizacao | Localizacao aproximada e precisa (quando aplicavel) | Vincular registros ao local de execucao |
| Dispositivo | Modelo do aparelho, versao do SO, qualidade de sinal | Suporte tecnico e diagnostico de sincronizacao |
| Biometria | Apenas confirmacao local (nunca enviada ao servidor) | Autenticacao biometrica opcional |

**Nao coletamos:** dados de saude, conteudo de mensagens pessoais, contatos do
dispositivo ou historico de navegacao alheio ao app.

## 3. Permissoes utilizadas

- **Camera** — registrar fotos de checklists, evidencias e comprovantes.
- **Galeria/Fotos** — anexar imagens existentes aos registros.
- **Localizacao** — registrar onde a atividade ocorreu (em uso, nao em background).
- **Biometria (Face ID / Digital)** — autenticacao local opcional.
- **Acesso a rede** — sincronizacao de dados com o servidor.

Cada permissao eh solicitada no momento do primeiro uso da funcionalidade
correspondente. O usuario pode negar ou revogar a qualquer momento nas
configuracoes do sistema operacional.

## 4. Bases legais (LGPD)

- **Execucao de contrato de trabalho** (art. 7, V): registros operacionais de
  funcionarios autorizados pelo empregador.
- **Cumprimento de obrigacao legal** (art. 7, II): registros de Seguranca e
  Medicina do Trabalho (NR-1, NR-12 etc.).
- **Legitimo interesse** (art. 7, IX): suporte tecnico e melhoria do produto.
- **Consentimento** (art. 7, I): autenticacao biometrica opcional.

## 5. Compartilhamento de dados

Os dados ficam armazenados em servidores controlados pela Engetecnica/SGA
Engeativos e **nao sao compartilhados com terceiros** para fins comerciais.

Eventuais compartilhamentos ocorrem somente:

- Com o empregador/cliente contratante (responsavel pelos funcionarios
  cadastrados no app).
- Com autoridades publicas, mediante requisicao legal.
- Com prestadores de servico tecnico (hospedagem, monitoramento) sujeitos a
  acordo de confidencialidade.

## 6. Armazenamento local (offline-first)

O aplicativo funciona em modo offline-first. Isso significa que:

- Dados criados sao salvos primeiro no dispositivo (SQLite local).
- A sincronizacao com o servidor eh feita manualmente pelo usuario quando ha
  conexao.
- Fotos e assinaturas ficam tambem no dispositivo ate o envio.

O usuario pode, a qualquer momento, **apagar todos os dados locais** em
`Configuracoes -> Limpar Bancos`. Apos a limpeza, o login eh requerido
novamente.

## 7. Retencao

- Dados operacionais: enquanto durar o vinculo do usuario com o empregador
  contratante.
- Logs de sincronizacao e auditoria: 12 meses.
- Apos o encerramento do vinculo, os dados pessoais sao anonimizados ou
  excluidos em ate 30 dias, exceto quando ha obrigacao legal de retencao.

## 8. Seguranca

- Comunicacao com o servidor via HTTPS/TLS.
- Senhas armazenadas como hash SHA-256.
- Token de autenticacao em armazenamento seguro do sistema operacional
  (`expo-secure-store`).
- Acesso restrito por perfil de usuario e obra.

## 9. Direitos do titular

Voce pode solicitar a qualquer momento:

- Confirmacao de tratamento de dados.
- Acesso aos seus dados.
- Correcao de dados incompletos ou desatualizados.
- Anonimizacao, bloqueio ou eliminacao de dados desnecessarios.
- Portabilidade.
- Revogacao do consentimento.

Para exercer esses direitos, envie e-mail para **privacidade@engetecnica.com.br**.

## 10. Alteracoes desta politica

Reservamo-nos o direito de atualizar esta politica. A versao mais recente
estara sempre disponivel em <https://sga-engeativos.com.br/privacidade>.
Alteracoes relevantes serao comunicadas pelo proprio aplicativo.

## 11. Contato

- **Encarregado de dados (DPO):** dpo@engetecnica.com.br
- **Suporte:** <https://sga-engeativos.com.br/suporte>
- **Politica online:** <https://sga-engeativos.com.br/privacidade>
