# Plano de Implementação: Plataforma de Alfabetização por Consciência Fonológica

## Visão Geral

Implementação incremental que transforma o jogo monolítico `src/roumao/index.tsx` em uma plataforma completa de aprendizado. Cada grupo de tarefas constrói sobre o anterior, garantindo que nunca haja código órfão. O projeto usa TypeScript + React 19 + TanStack Router + Tailwind CSS v4.

## Tarefas

- [ ] 1. Fundação: tipos TypeScript, banco de palavras e estrutura de arquivos
  - Criar `src/alfabetizacao/types.ts` com todas as interfaces do design: `Word`, `CategoryId`, `DifficultyLevel`, `HintLevel`, `HintContext`, `HintAction`, `MistakeProfile`, `SpacedRepetitionEntry`, `PlayerProgress`, `Session`, `Achievement`, `AchievementCondition`, `WorldId`, `World`, `Phase`, `AudioConfig`, `SoundEffect`, `AttemptResult`, `FeedbackState`, `WordChallengeContext`
  - Criar `src/alfabetizacao/constants.ts` com `CONFUSION_PAIRS`, `VISUAL_SIMILAR`, `PHONETIC_SIMILAR`, `PHONEME_TTS_MAP`, `WORLDS` e `ALPHABET`
  - Criar `src/alfabetizacao/wordBank.ts` com as 200+ palavras distribuídas nas 12 categorias (`animais`, `frutas`, `objetos`, `escola`, `casa`, `natureza`, `corpo`, `transportes`, `profissoes`, `cores`, `numeros`, `brinquedos`), cada palavra com `id`, `word`, `displayWord`, `syllables`, `emoji`, `category`, `difficultyLevel`, `phonemes`, `audioHint`, `syllableWithMissingLetter`
  - Exportar função `filterWords(category?: CategoryId, difficulty?: DifficultyLevel, confusedLetters?: string[]): Word[]`
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 1.1 Escrever property test: sílabas reconstruem a palavra
    - **Propriedade 3: Sílabas reconstruem a palavra** — `word.syllables.join("") === word.word` para toda palavra do WordBank
    - **Valida: Requisito 3.2**
    - Instalar `fast-check` como devDependency; configurar script de teste no `package.json` com Vitest
    - Criar `src/alfabetizacao/__tests__/wordBank.property.test.ts`

- [ ] 2. AudioEngine: síntese de voz e efeitos sonoros
  - Criar `src/alfabetizacao/engines/audioEngine.ts` implementando `IAudioEngine`
  - Implementar detecção de `window.speechSynthesis` com fallback silencioso; expor `isSupported()`
  - Implementar `speakWord`, `speakPhoneme`, `speakSyllable`, `speakFeedback` usando `SpeechSynthesisUtterance` com `lang: "pt-BR"`; cancelar utterance anterior antes de falar
  - Implementar `PHONEME_TTS_MAP` e usá-lo em `speakPhoneme` para converter `/b/` → `"bê"` etc.
  - Implementar `playSound(effect: SoundEffect)` via `AudioContext` com tons sintéticos simples (sem arquivos externos)
  - Implementar `configure(config: Partial<AudioConfig>)` persistindo volume (0.0–1.0) e rate (0.5–2.0)
  - Implementar cache de vozes via `speechSynthesis.getVoices()` chamado uma vez na inicialização
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10, 15.3_

  - [ ]* 2.1 Escrever testes unitários para AudioEngine
    - Testar que `isSupported()` retorna `false` quando `speechSynthesis` está ausente
    - Testar que `configure` rejeita volume fora de [0.0, 1.0] e rate fora de [0.5, 2.0]
    - Testar que `PHONEME_TTS_MAP` cobre todos os fonemas definidos no design
    - _Requisitos: 1.1, 1.9, 1.10_

- [ ] 3. HintEngine: 5 níveis de dica progressiva
  - Criar `src/alfabetizacao/engines/hintEngine.ts` implementando `IHintEngine`
  - Implementar `getHint(context: HintContext): HintAction` mapeando `attemptCount` → `HintLevel` (1→repeatAudio, 2→highlightSyllable, 3→highlightPhoneme, 4→flashCorrectLetter, 5→revealAnswer)
  - Implementar fallback de nível 2: se `syllables` está vazio ou indefinido, pular para nível 3
  - Implementar `shouldShowHint(attemptCount: number): boolean` (retorna `true` se `attemptCount >= 1`)
  - Implementar `reset()` zerando estado interno
  - Popular `audioText` em cada `HintAction` quando a dica requer narração
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.1 Escrever testes unitários para HintEngine
    - Testar cada nível de dica para `attemptCount` de 1 a 5
    - Testar o skip do nível 2 quando `syllables` está vazio
    - Testar que `reset()` zera o estado
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 4. DistractorEngine: distratores pedagógicos
  - Criar `src/alfabetizacao/engines/distractorEngine.ts` implementando `IDistractorEngine`
  - Implementar `generate(correctLetter: string, config: DistractorConfig): string[]` com as estratégias por nível descritas no design
  - Nível 1–2: letras de aspecto muito diferente (pool aleatório excluindo `correctLetter` e similares)
  - Nível 3: priorizar `VISUAL_SIMILAR[correctLetter]`
  - Nível 4: incluir `PHONETIC_SIMILAR[correctLetter]` além dos visuais
  - Nível 5: priorizar letras mais frequentes do `mistakeProfile` da criança
  - Garantir: sem duplicatas, sem `correctLetter`, exatamente `config.count` itens (completar com alfabeto se necessário)
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 4.1 Escrever property test: distratores nunca incluem a letra correta
    - **Propriedade 1: Distratores nunca incluem a letra correta** — `!distractors.includes(correctLetter)` para qualquer letra e qualquer dificuldade
    - **Valida: Requisito 5.1**
    - Criar `src/alfabetizacao/__tests__/distractorEngine.property.test.ts`

  - [ ]* 4.2 Escrever property test: número de opções respeita a dificuldade
    - **Propriedade 2: Número de opções por nível de dificuldade** — `count >= 2 && count <= 6` para todo `DifficultyLevel` de 1 a 5
    - **Valida: Requisito 7.6**
    - Criar função utilitária `optionCountForLevel(level: DifficultyLevel): number` em `src/alfabetizacao/utils.ts`

- [ ] 5. AdaptiveEngine + SM-2: seleção adaptativa e repetição espaçada
  - Criar `src/alfabetizacao/engines/adaptiveEngine.ts` implementando `IAdaptiveEngine`
  - Implementar `updateSpacedRepetition(entry: SpacedRepetitionEntry, quality: number): SpacedRepetitionEntry` exatamente conforme algoritmo SM-2 do design, garantindo `easeFactor >= 1.3`
  - Implementar `getNextWord(profile, availableWords, sessionHistory)` com seleção por roleta ponderada: peso base 1.0, boost ×3.0 para revisão pendente, `+mistakeCount × 0.5` por letra confundida, penalidade ×0.1 para últimas 5 seleções; lançar `Error("WordBank empty")` se array vazio
  - Implementar `updateMistakeProfile(targetLetter, chosenLetter)` incrementando contador em `MistakeProfile`
  - Implementar `recordAttempt(wordId, correct, hintsUsed)` calculando `quality` (0–5) a partir de `hintsUsed` e atualizando SM-2
  - Implementar `getMistakeProfile()`, `getConfusedPairs()`, `getSpacedRepetitionQueue()`, `resetSession()`
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 5.1 Escrever testes unitários para AdaptiveEngine
    - Testar que `getNextWord` retorna word do array fornecido
    - Testar que `getNextWord` lança erro com array vazio
    - Testar que `updateMistakeProfile` incrementa o contador correto
    - Testar casos do SM-2: quality >= 3 aumenta interval; quality < 3 reseta para 1; easeFactor nunca < 1.3
    - _Requisitos: 4.1, 4.2, 4.7, 4.8, 4.9, 4.10_

- [ ] 6. RewardEngine: estrelas, moedas e conquistas
  - Criar `src/alfabetizacao/engines/rewardEngine.ts` implementando `IRewardEngine`
  - Implementar `calculateStarsForAttempt(hintsUsed: number): number`: 0 dicas → 3 estrelas; 1–2 dicas → 2 estrelas; 3+ dicas → 1 estrela
  - Implementar `calculateCoinsForSession(session: Session): number`
  - Implementar `checkAchievements(progress: PlayerProgress): Achievement[]` com as 7 conquistas da tabela do design; conquista desbloqueada apenas uma vez (verificar `unlocked === false` antes de desbloquear)
  - Implementar `getUnlockedAchievements()` filtrando achievements com `unlocked === true`
  - Exportar array `ACHIEVEMENTS` com as 7 conquistas pré-definidas
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 6.1 Escrever testes unitários para RewardEngine
    - Testar tabela de estrelas: 0 dicas → 3, 1 dica → 2, 3 dicas → 1
    - Testar que `checkAchievements` não redobra desbloqueio de conquista já desbloqueada
    - Testar que moedas seguem a regra: 3 estrelas → 2 moedas, < 3 → 1 moeda
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

- [ ] 7. ProgressStore: persistência localStorage + IndexedDB
  - Criar `src/alfabetizacao/stores/progressStore.ts` implementando `IProgressStore`
  - Implementar leitura/escrita de `PlayerProgress` em localStorage com chave `alfa-progress`
  - Implementar `addStars(n)` e `addCoins(n)` com persistência imediata em localStorage
  - Implementar detecção de IndexedDB: tentar abrir banco `alfa-db`; se falhar, usar fallback para localStorage puro com histórico limitado a 30 dias
  - Implementar `recordSession(session)` acumulando em buffer e fazendo write em batch no IndexedDB ao final da sessão (não por interação)
  - Implementar `recordMistake`, `recordCorrect`, `getMistakeProfile`, `unlockAchievement`, `getAchievements`, `getSessionHistory`
  - Implementar `exportData(): string` retornando JSON sem identificadores pessoais além de nome opcional
  - Implementar `clearData()` resetando todos os campos para valores iniciais
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 14.1, 14.2, 14.3, 15.4_

  - [ ]* 7.1 Escrever property test: ProgressStore é idempotente
    - **Propriedade 4: addStars é idempotente para incremento zero** — após `addStars(n)`, `addStars(0)` não altera o total
    - **Valida: Requisito 8.1**
    - Criar `src/alfabetizacao/__tests__/progressStore.property.test.ts` com mock de localStorage

  - [ ]* 7.2 Escrever testes unitários para ProgressStore
    - Testar serialização/deserialização: `clearData` + `addStars(n)` + reler do localStorage retorna `n`
    - Testar fallback para localStorage quando IndexedDB indisponível
    - Testar que `exportData` produz JSON parseável
    - _Requisitos: 8.1, 8.5, 8.7, 8.8_

- [ ] 8. Checkpoint — Validar engines isolados
  - Garantir que todos os testes dos engines passam
  - Verificar tipagem TypeScript sem erros (`tsc --noEmit`)
  - Garantir que `filterWords` retorna pelo menos 15 palavras por categoria
  - Pedir ao usuário se há ajustes antes de avançar para a UI

- [ ] 9. Hook useWordChallenge: orquestração do desafio de palavra
  - Criar `src/alfabetizacao/hooks/useWordChallenge.ts`
  - Instanciar `AudioEngine`, `HintEngine`, `AdaptiveEngine`, `DistractorEngine`, `RewardEngine` e `ProgressStore` como singletons em `src/alfabetizacao/engines/index.ts`
  - Implementar o hook conforme especificado no design: estado `currentWord`, `attemptCount`, `hintAction`, `feedback`, `isRevealed`, `options`
  - Implementar `onLetterPick(letter)` chamando `processWordAttempt` e orquestrando engines (ver algoritmo do design)
  - Implementar `onNextWord()` resetando `attemptCount = 0`, `hintAction = null`, `feedback = null` e selecionando próxima palavra via `AdaptiveEngine.getNextWord`
  - Implementar `onHearWord()` chamando `AudioEngine.speakWord`
  - Implementar `onRequestHint()` avançando o nível de dica manualmente
  - Garantir que cliques pós-acerto são ignorados (`if (feedback?.type === "correct") return`)
  - Aceitar `categoryFilter?: CategoryId` para filtrar palavras por categoria
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 4.1_

  - [ ]* 9.1 Escrever testes unitários para useWordChallenge
    - Testar que `onNextWord` reseta `attemptCount` para 0
    - Testar que clique pós-acerto não altera o estado
    - Testar que erro incrementa `attemptCount` e define `hintAction`
    - _Requisitos: 6.8, 6.4_

- [ ] 10. Componentes de UI: SyllableDisplay, LetterCard, HintBanner, ConfettiOverlay
  - Criar `src/alfabetizacao/components/SyllableDisplay.tsx`
    - Renderizar cada sílaba como `<span>` separado com separador `•` marcado como `aria-hidden`
    - Substituir letra faltante por `?`; ao acerto, mostrar letra com fundo `var(--leaf)` e texto branco
    - Aplicar destaque `var(--sky)` na sílaba indicada por `highlightedSyllable` (HintEngine nível 2)
    - Aceitar prop `shake?: boolean` para animação de erro
    - _Requisitos: 6.9, 6.10, 16.4, 16.5, 16.6_
  - Criar `src/alfabetizacao/components/LetterCard.tsx`
    - Botão mínimo 48px × 48px (atende WCAG 44×44px + margem)
    - Ao hover/focus e ao toque, chamar `AudioEngine.speakPhoneme(letter)`
    - `aria-label` com nome da letra e pronúncia: ex: `"Letra B, som bê"`
    - _Requisitos: 17.1, 17.2, 17.3, 13.1_
  - Criar `src/alfabetizacao/components/HintBanner.tsx`
    - Exibir visualmente a HintAction atual (texto + ícone) como região `aria-live="polite"`
    - Não renderizar nada quando `hintAction === null`
    - _Requisitos: 2.8, 13.3_
  - Criar `src/alfabetizacao/components/ConfettiOverlay.tsx`
    - Animação CSS `@keyframes` com `will-change: transform`; sem libs externas
    - Disparado quando `feedback.type === "correct"` com 3 estrelas
    - Marcado como `aria-hidden="true"` (decorativo)
    - _Requisitos: 15.6, 16.2, 13.4_

- [ ] 11. Refatorar jogo de letras principal usando os novos engines e componentes
  - Criar `src/roumao/routes/letras/index.tsx` (nova rota `/letras`) usando `useWordChallenge`
  - Compor `SyllableDisplay` + `LetterCard` + `HintBanner` + `ConfettiOverlay` + `Polvinho`
  - Exibir botão de áudio 🔊/🔇 conforme `AudioEngine.isSupported()` — _Requisito 1.8_
  - Exibir região `aria-live="polite"` com texto do feedback de acerto/erro — _Requisito 13.3, 13.8_
  - Garantir Tab order lógico: emoji → display da palavra → opções de letras → botão de dica → botão de áudio
  - Manter o jogo de matemática existente em `src/roumao/index.tsx` intacto durante a refatoração
  - _Requisitos: 6.1–6.10, 7.1–7.6, 13.1–13.8, 16.1–16.6, 17.1–17.3_

- [ ] 12. Expandir mascote Polvinho com novos estados e PolvinhoSpeech
  - Atualizar `src/components/Polvinho.tsx` adicionando mood `"sad"` (tristeza, para erros) e `"celebrate"` (conquista/ConfettiOverlay), além dos já existentes `"happy"`, `"cheer"`, `"think"`
  - Criar `src/alfabetizacao/components/PolvinhoSpeech.tsx`: bolha de fala com texto dinâmico exibindo mensagens do HintEngine e feedback
  - Atualizar uso do Polvinho na rota `/letras`: mostrar `"think"` ao aguardar, `"happy"` ao acerto, `"sad"` ao erro, `"celebrate"` ao desbloquear conquista
  - _Requisitos: 16.1_

- [ ] 13. WorldMap e sistema de fases
  - Criar `src/alfabetizacao/components/WorldMap.tsx`
  - Renderizar os 4 mundos com emoji, nome e indicador de progresso
  - Implementar lógica de desbloqueio: mundo bloqueado exibe `🔒` e quantidade de estrelas necessárias; mundo desbloqueado é clicável
  - Ler `PlayerProgress.totalStars` do `ProgressStore` para determinar mundos disponíveis
  - Renderizar fases de cada mundo com estado: não iniciada, em progresso, completa (0–3 estrelas)
  - Criar `src/alfabetizacao/utils/worldUtils.ts` com `getUnlockedWorlds(stars: number): WorldId[]` e `getPhasesForWorld(worldId: WorldId): Phase[]`
  - Atualizar a rota `/` (index) para renderizar o `WorldMap` como hub principal no lugar do `MapScreen` atual, mantendo os cards de acesso ao jogo de letras e matemática
  - _Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14. Checkpoint — Testar fluxo principal end-to-end
  - Garantir que o fluxo completo funciona: WorldMap → selecionar mundo → selecionar fase → jogo de letras → acerto/erro/dicas → tela de resultado → voltar ao WorldMap
  - Verificar que estrelas persistem após fechar e reabrir a aba do browser
  - Verificar que o jogo de matemática ainda funciona normalmente
  - Pedir ao usuário feedback antes de avançar para dashboards

- [ ] 15. Novas rotas com lazy loading: `/letras`, `/matematica`, `/pais`, `/professores`
  - Criar arquivo de rota `src/roumao/routes/matematica/index.tsx` extraindo `MathScreen` do monólito para rota própria `/matematica`
  - Criar arquivo de rota `src/roumao/routes/pais/index.tsx` e `src/roumao/routes/professores/index.tsx` como shells vazios para os dashboards
  - Aplicar `React.lazy` nas rotas `/pais` e `/professores` via TanStack Router `lazy()` para não incluí-las no bundle inicial
  - Atualizar `router.tsx` e `routeTree.gen.ts` conforme necessário para registrar as novas rotas
  - _Requisitos: 12.4, 15.1_

- [ ] 16. ParentDashboard: área dos pais com PIN
  - Criar `src/alfabetizacao/components/PinGate.tsx`: tela de entrada de PIN com 4–6 dígitos; comparar hash SHA-256 via `crypto.subtle.digest` com o valor armazenado em localStorage; nunca armazenar PIN em texto plano
  - Criar `src/alfabetizacao/components/ParentDashboard.tsx` com:
    - Total de estrelas, sessões, tempo total, acertos e erros por categoria
    - Pares de letras mais confundidos (ex: B↔D, F↔V)
    - Histórico de sessões dos últimos 30 dias (data, duração, palavras)
    - Conquistas desbloqueadas
    - Botão de exportação que chama `ProgressStore.exportData()` e dispara download do JSON
    - Aviso sutil quando IndexedDB está indisponível
  - Integrar `PinGate` + `ParentDashboard` na rota `/pais`
  - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 14.3, 14.4_

- [ ] 17. TeacherDashboard: área do professor
  - Criar `src/alfabetizacao/components/TeacherDashboard.tsx` com:
    - Autenticação por código de turma (sem backend; validação local)
    - Métricas agregadas: palavras praticadas, categorias cobertas, pares de letras confundidos
    - Exportação JSON sem identificadores pessoais
  - Integrar na rota `/professores` carregada via lazy loading
  - _Requisitos: 12.1, 12.2, 12.3, 12.4, 14.5_

- [ ] 18. Acessibilidade e polish final
  - Auditar todos os botões interativos: garantir `min-width: 44px; min-height: 44px` via classes Tailwind
  - Adicionar `aria-label` descritivo em todos os controles sem texto visível
  - Adicionar regra CSS `@media (prefers-contrast: more)` em `src/styles.css` com paleta de alto contraste
  - Garantir que todas as imagens decorativas (emojis de fundo, Polvinho) têm `aria-hidden="true"`
  - Verificar Tab order nas telas de letras, WorldMap, ParentDashboard e TeacherDashboard
  - Adicionar controles de volume e velocidade de fala na UI de configurações (modal ou drawer)
  - Verificar relação de contraste 4.5:1 para texto normal e 3:1 para texto grande nas cores da paleta tropical
  - _Requisitos: 13.1, 13.2, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 19. Testes de integração e property-based tests finais
  - [ ]* 19.1 Escrever teste de integração: fluxo completo palavra → erros → dicas → acerto
    - Simular 5 erros consecutivos e verificar que os níveis de dica sobem de 1 a 5
    - Verificar que acerto após nível 5 registra `hintsUsed = 5` no ProgressStore
    - _Requisitos: 6.1–6.8, 2.1–2.5_

  - [ ]* 19.2 Escrever teste de integração: ProgressStore persiste entre sessões
    - Criar store, adicionar estrelas, serializar, criar nova instância, verificar que o valor é o mesmo
    - _Requisitos: 8.1, 8.5_

  - [ ]* 19.3 Escrever teste de integração: WorldMap desbloqueia mundos conforme estrelas
    - Testar que `getUnlockedWorlds(29)` não inclui `"cidade"` e `getUnlockedWorlds(30)` inclui
    - _Requisitos: 10.1, 10.2_

- [ ] 20. Checkpoint final — Garantir que todos os testes passam
  - Executar suite completa de testes
  - Garantir que `tsc --noEmit` passa sem erros
  - Garantir que `eslint .` passa sem erros
  - Verificar que o bundle de produção não inclui `/pais` e `/professores` no chunk inicial

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido, mas são recomendadas para validar os algoritmos críticos
- Os property-based tests usam `fast-check` e devem ser instalados como devDependency
- Os engines (tasks 2–6) são módulos TypeScript puros sem dependência de React, facilitando os testes
- O `ProgressStore` deve ser um singleton — instanciado uma vez e reutilizado em todos os hooks
- Durante a refatoração da tarefa 11, o jogo de matemática em `src/roumao/index.tsx` não deve ser modificado até que a tarefa 15 o mova para sua própria rota
- Propriedades validam: (1) distratores sem letra correta, (2) contagem de opções por nível, (3) integridade silábica do WordBank, (4) idempotência do ProgressStore
