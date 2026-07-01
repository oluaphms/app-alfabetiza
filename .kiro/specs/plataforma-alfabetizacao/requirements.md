# Documento de Requisitos: Plataforma de Alfabetização por Consciência Fonológica

## Introdução

A **Plataforma de Alfabetização** transforma o app "Ilha das Letrinhas e Numerinhos" em uma plataforma completa de aprendizado baseada em consciência fonológica. Em vez de tentativa e erro aleatória, a criança recebe pistas progressivas sobre sons, sílabas e fonemas, desenvolvendo competências linguísticas reais.

A plataforma mantém a identidade visual existente (paleta tropical, fontes Fredoka/Baloo 2, mascote Polvinho), expande o banco de palavras para 200+ itens em 12 categorias, introduz um motor adaptativo que detecta confusões fonológicas, adiciona áreas dedicadas para pais e professores, e implementa gamificação por mundos/fases com sistema completo de recompensas.

---

## Glossário

- **AudioEngine**: Módulo responsável por toda síntese e reprodução de áudio via Web Speech API.
- **HintEngine**: Módulo que gerencia os 5 níveis progressivos de dica durante um desafio.
- **AdaptiveEngine**: Motor de aprendizagem que seleciona palavras e aplica repetição espaçada com base no perfil de erros da criança.
- **DistractorEngine**: Módulo que gera alternativas pedagogicamente relevantes para os desafios de letras.
- **ProgressStore**: Camada de persistência de dados do jogador (localStorage + IndexedDB).
- **RewardEngine**: Módulo responsável por calcular e conceder recompensas, estrelas e conquistas.
- **WordBank**: Banco de dados estático com 200+ palavras em 12 categorias.
- **MistakeProfile**: Mapa letra→contagem registrando as confusões históricas da criança.
- **SyllableDisplay**: Componente visual que exibe palavras com separação silábica (ex: GA•TO).
- **WorldMap**: Interface de mapa de mundos/fases que organiza a progressão do jogador.
- **ParentDashboard**: Área protegida por PIN que exibe métricas de progresso da criança para os pais.
- **TeacherDashboard**: Área de gestão de turmas e exportação de dados para professores.
- **Platform**: O sistema completo da plataforma de alfabetização.
- **Game**: O módulo de jogo interativo de letras e palavras.
- **Player**: A criança usuária da plataforma.
- **SM-2**: Algoritmo de repetição espaçada SuperMemo 2, usado para agendar revisões de palavras.
- **DifficultyLevel**: Nível de dificuldade de 1 a 5 que controla o número de opções e o tipo de distratores.
- **HintLevel**: Nível de dica de 1 a 5 acionado progressivamente por tentativas erradas consecutivas.
- **SpacedRepetitionEntry**: Registro por palavra contendo intervalo, fator de facilidade e data da próxima revisão.
- **CategoryId**: Identificador de uma das 12 categorias temáticas do WordBank.
- **WorldId**: Identificador de um dos 4 mundos (floresta, cidade, espaco, fazenda).
- **SoundEffect**: Efeito sonoro nomeado (correct, wrong, click, levelUp, achievement, confetti).
- **Achievement**: Conquista desbloqueável vinculada a uma condição mensurável de progresso.
- **Session**: Registro de uma sessão de jogo com métricas de tempo, acertos e dicas utilizadas.
- **PIN**: Código numérico de 4–6 dígitos que protege a área dos pais.

---

## Requisitos

### Requisito 1: Motor de Áudio (AudioEngine)

**User Story:** Como criança jogando, quero ouvir as palavras e fonemas pronunciados em português, para que eu possa desenvolver associação entre sons e letras sem depender apenas da visão.

#### Critérios de Aceite

1. WHEN a Platform inicializa, THE AudioEngine SHALL detectar suporte à Web Speech API e expor o resultado via `isSupported()`
2. WHEN `speakWord` é chamado, THE AudioEngine SHALL cancelar qualquer fala em andamento antes de iniciar a nova pronúncia
3. WHEN `speakWord` é chamado, THE AudioEngine SHALL falar a palavra completa em português (lang: "pt-BR")
4. WHEN `speakPhoneme` é chamado com um fonema como "/b/", THE AudioEngine SHALL usar o `PHONEME_TTS_MAP` para converter ao texto fonético alternativo antes de falar
5. WHEN `speakSyllable` é chamado, THE AudioEngine SHALL falar a sílaba de forma isolada em português
6. WHEN `playSound` é chamado com um `SoundEffect` válido, THE AudioEngine SHALL reproduzir o efeito sonoro correspondente
7. WHEN a Web Speech API não está disponível, THE AudioEngine SHALL retornar `isSupported() === false` e o jogo SHALL continuar normalmente sem áudio
8. WHEN a Web Speech API não está disponível, THE Platform SHALL exibir ícone 🔇 no lugar de 🔊 nos controles de áudio
9. THE AudioEngine SHALL aceitar configuração de volume no intervalo 0.0 a 1.0 inclusive
10. THE AudioEngine SHALL aceitar configuração de velocidade de fala no intervalo 0.5 a 2.0 inclusive

---

### Requisito 2: Sistema de Dicas Progressivas (HintEngine)

**User Story:** Como criança aprendendo, quero receber dicas que aumentam progressivamente quando erro, para que eu não fique preso em tentativa aleatória e desenvolva consciência fonológica real.

#### Critérios de Aceite

1. WHEN a criança erra pela primeira vez em uma palavra, THE HintEngine SHALL retornar uma HintAction de nível 1 com tipo "repeatAudio"
2. WHEN a criança erra pela segunda vez consecutiva, THE HintEngine SHALL retornar uma HintAction de nível 2 com tipo "highlightSyllable" indicando a sílaba contendo a letra faltante
3. WHEN a criança erra pela terceira vez consecutiva, THE HintEngine SHALL retornar uma HintAction de nível 3 com tipo "highlightPhoneme" indicando o fonema da letra correta
4. WHEN a criança erra pela quarta vez consecutiva, THE HintEngine SHALL retornar uma HintAction de nível 4 com tipo "flashCorrectLetter" destacando a opção correta
5. WHEN a criança erra pela quinta vez consecutiva, THE HintEngine SHALL retornar uma HintAction de nível 5 com tipo "revealAnswer" revelando a resposta automaticamente
6. WHEN `reset` é chamado no HintEngine, THE HintEngine SHALL zerar o estado de dicas para o próximo desafio
7. IF a palavra não possui sílabas definidas, THEN THE HintEngine SHALL pular o nível 2 e continuar com os demais níveis (1, 3, 4, 5)
8. WHEN qualquer HintAction é gerada, THE HintEngine SHALL incluir `audioText` quando a dica requer narração de áudio

---

### Requisito 3: Banco de Palavras (WordBank)

**User Story:** Como criança jogando, quero explorar palavras de diferentes categorias temáticas, para que o aprendizado seja variado, contextualizado e culturalmente relevante.

#### Critérios de Aceite

1. THE WordBank SHALL conter no mínimo 200 palavras distribuídas nas 12 categorias: animais, frutas, objetos, escola, casa, natureza, corpo, transportes, profissoes, cores, numeros, brinquedos
2. FOR ALL palavras no WordBank, THE WordBank SHALL garantir que `syllables.join("") === word.word`
3. FOR ALL palavras no WordBank, THE WordBank SHALL garantir que `word.word.length` está entre 3 e 10 caracteres
4. FOR ALL palavras no WordBank, THE WordBank SHALL garantir que `phonemes.length >= syllables.length`
5. FOR ALL palavras no WordBank, THE WordBank SHALL garantir que `difficultyLevel` está entre 1 e 5
6. THE WordBank SHALL ser carregado uma única vez na inicialização do app e mantido em memória para filtragem
7. THE WordBank SHALL expor método de filtragem por `CategoryId`, por `DifficultyLevel` e por letra confundida do MistakeProfile

---

### Requisito 4: Motor Adaptativo e Repetição Espaçada (AdaptiveEngine)

**User Story:** Como criança jogando, quero que o jogo selecione automaticamente palavras com as letras que mais confundo, para que eu pratique exatamente o que mais preciso melhorar.

#### Critérios de Aceite

1. WHEN `getNextWord` é chamado com um MistakeProfile não vazio, THE AdaptiveEngine SHALL atribuir peso maior às palavras que contêm as letras mais confundidas do perfil
2. WHEN `getNextWord` é chamado, THE AdaptiveEngine SHALL retornar uma Word pertencente ao array `availableWords` fornecido
3. WHEN uma palavra foi jogada nas últimas 5 seleções da sessão, THE AdaptiveEngine SHALL reduzir o peso de seleção dessa palavra em 90%
4. WHEN uma SpacedRepetitionEntry tem `nextReviewAt <= Date.now()`, THE AdaptiveEngine SHALL triplicar o peso de seleção dessa palavra
5. WHEN `updateMistakeProfile` é chamado com `targetLetter` e `chosenLetter`, THE AdaptiveEngine SHALL incrementar o contador de erros para `targetLetter` no MistakeProfile
6. WHEN `recordAttempt` é chamado com `correct: true`, THE AdaptiveEngine SHALL atualizar a SpacedRepetitionEntry da palavra aplicando o algoritmo SM-2 com qualidade proporcional a `hintsUsed`
7. WHEN `updateSpacedRepetition` é chamado com `quality >= 3`, THE AdaptiveEngine SHALL aumentar o intervalo de revisão da SpacedRepetitionEntry
8. WHEN `updateSpacedRepetition` é chamado com `quality < 3`, THE AdaptiveEngine SHALL resetar o intervalo de revisão para 1 dia
9. THE AdaptiveEngine SHALL garantir que `easeFactor` nunca caia abaixo de 1.3 após qualquer atualização SM-2
10. WHEN `getNextWord` é chamado com `availableWords` vazio, THE AdaptiveEngine SHALL lançar erro com mensagem "WordBank empty"

---

### Requisito 5: Motor de Distratores (DistractorEngine)

**User Story:** Como criança aprendendo, quero que as opções erradas sejam pedagogicamente desafiadoras, para que eu desenvolva discriminação real entre letras parecidas em vez de adivinhar aleatoriamente.

#### Critérios de Aceite

1. THE DistractorEngine SHALL nunca incluir a letra correta no array de distratores retornado
2. THE DistractorEngine SHALL retornar exatamente `config.count` distratores
3. THE DistractorEngine SHALL retornar apenas letras únicas (sem duplicatas) no array de distratores
4. WHEN `difficulty` é 1 ou 2, THE DistractorEngine SHALL selecionar letras de aspecto visual bastante diferente da letra correta
5. WHEN `difficulty >= 3`, THE DistractorEngine SHALL priorizar letras visualmente similares à letra correta (ex: B/D/P/Q) conforme o `VISUAL_SIMILAR` map
6. WHEN `difficulty >= 4`, THE DistractorEngine SHALL incluir letras foneticamente similares à letra correta (ex: F/V, S/Z) conforme o `PHONETIC_SIMILAR` map
7. WHEN `difficulty == 5`, THE DistractorEngine SHALL priorizar letras presentes no MistakeProfile da criança (as mais confundidas historicamente)
8. WHEN o pool de letras similares é insuficiente para preencher `config.count`, THE DistractorEngine SHALL completar com letras do alfabeto selecionadas aleatoriamente, excluindo a letra correta

---

### Requisito 6: Fluxo Principal do Jogo de Letras

**User Story:** Como criança, quero completar palavras selecionando a letra faltante com suporte de dicas e áudio, para que eu aprenda de forma guiada e divertida.

#### Critérios de Aceite

1. WHEN uma nova palavra é apresentada, THE Game SHALL reproduzir o áudio da palavra via AudioEngine automaticamente
2. WHEN a criança seleciona a letra correta, THE Game SHALL exibir feedback positivo com as estrelas ganhas e reproduzir o efeito sonoro "correct"
3. WHEN a criança seleciona a letra correta, THE Game SHALL atualizar o ProgressStore com as estrelas e moedas ganhas
4. WHEN a criança seleciona uma letra errada, THE Game SHALL incrementar `attemptCount` em 1, atualizar o MistakeProfile e exibir a HintAction correspondente ao novo `attemptCount`
5. WHEN a criança seleciona uma letra errada, THE Game SHALL reproduzir o efeito sonoro "wrong"
6. WHEN `attemptCount` atinge 5, THE Game SHALL revelar a letra correta automaticamente sem aguardar nova interação da criança
7. WHEN a resposta é revelada automaticamente (nível 5), THE Game SHALL registrar o acerto com `hintsUsed = 5` no ProgressStore
8. WHEN `onNextWord` é chamado, THE Game SHALL resetar `attemptCount` para 0 e `hintAction` para null antes de apresentar a próxima palavra
9. WHEN a palavra é exibida, THE SyllableDisplay SHALL renderizar cada sílaba como span separado com separador "•" marcado como `aria-hidden`
10. WHEN a HintEngine retorna nível 2, THE SyllableDisplay SHALL destacar visualmente a sílaba que contém a letra faltante

---

### Requisito 7: Sistema de Dificuldade Progressiva

**User Story:** Como criança, quero que o número de opções aumente conforme fico mais habilidoso, para que o desafio cresça junto com o meu aprendizado.

#### Critérios de Aceite

1. WHEN `DifficultyLevel` é 1, THE Game SHALL apresentar 2 opções de letras (1 correta + 1 distrator)
2. WHEN `DifficultyLevel` é 2, THE Game SHALL apresentar 3 opções de letras
3. WHEN `DifficultyLevel` é 3, THE Game SHALL apresentar 4 opções de letras
4. WHEN `DifficultyLevel` é 4, THE Game SHALL apresentar 5 opções de letras
5. WHEN `DifficultyLevel` é 5, THE Game SHALL apresentar 6 opções de letras
6. FOR ALL DifficultyLevels de 1 a 5, THE Game SHALL apresentar entre 2 e 6 opções inclusivo
7. WHEN a criança acumula acertos suficientes, THE AdaptiveEngine SHALL elevar automaticamente o `currentDifficultyLevel` do perfil do jogador

---

### Requisito 8: Persistência de Progresso (ProgressStore)

**User Story:** Como criança e como pai, quero que o progresso seja salvo automaticamente no dispositivo, para que eu não perca o histórico de aprendizado entre sessões.

#### Critérios de Aceite

1. WHEN estrelas são adicionadas via `addStars`, THE ProgressStore SHALL persistir o novo total imediatamente em localStorage
2. WHEN moedas são adicionadas via `addCoins`, THE ProgressStore SHALL persistir o novo total imediatamente em localStorage
3. WHEN uma sessão termina, THE ProgressStore SHALL registrar os dados da Session no IndexedDB em uma única operação em batch
4. WHEN `getSessionHistory` é chamado, THE ProgressStore SHALL retornar todas as sessões registradas para a criança
5. WHEN IndexedDB não está disponível, THE ProgressStore SHALL usar exclusivamente localStorage e limitar o histórico aos últimos 30 dias
6. WHEN IndexedDB não está disponível, THE Platform SHALL exibir aviso sutil na área dos pais
7. WHEN `exportData` é chamado, THE ProgressStore SHALL retornar uma string JSON que representa o estado completo do progresso do jogador
8. WHEN `clearData` é chamado, THE ProgressStore SHALL resetar todos os campos de progresso para os valores iniciais
9. WHEN `getMistakeProfile` é chamado, THE ProgressStore SHALL retornar o MistakeProfile atualizado com todos os registros de erro da criança

---

### Requisito 9: Sistema de Recompensas e Conquistas (RewardEngine)

**User Story:** Como criança, quero ganhar estrelas, moedas e conquistas ao jogar, para que o progresso seja visível, motivador e comemorável.

#### Critérios de Aceite

1. WHEN a criança acerta uma palavra sem usar nenhuma dica, THE RewardEngine SHALL conceder 3 estrelas
2. WHEN a criança acerta uma palavra usando 1 ou mais dicas, THE RewardEngine SHALL conceder entre 1 e 2 estrelas conforme o número de dicas usadas
3. FOR ALL tentativas corretas, THE RewardEngine SHALL conceder entre 1 e 3 estrelas inclusive
4. WHEN uma condição de conquista é atingida pela primeira vez, THE RewardEngine SHALL desbloquear a conquista correspondente exatamente uma vez
5. WHEN uma conquista já desbloqueada é verificada novamente, THE RewardEngine SHALL não alterar seu estado de desbloqueio
6. THE RewardEngine SHALL suportar as seguintes conquistas: "Primeira Palavra" (1 acerto), "Leitor Iniciante" (10 palavras), "Campeão das Letras" (50 acertos), "Mestre da Leitura" (100 acertos), "Semana Perfeita" (7 dias consecutivos), "Mestre da Categoria" (categoria completa), "Independente" (5 acertos seguidos sem dicas)
7. WHEN a criança acerta com 3 estrelas, THE RewardEngine SHALL conceder 2 moedas; WHEN acerta com menos de 3 estrelas, THE RewardEngine SHALL conceder 1 moeda

---

### Requisito 10: Gamificação por Mundos e Fases (WorldMap)

**User Story:** Como criança, quero explorar mundos temáticos desbloqueáveis conforme acumulo estrelas, para que a progressão seja visualmente emocionante e dê sentido ao esforço.

#### Critérios de Aceite

1. THE WorldMap SHALL exibir 4 mundos: "Floresta Mágica" (desbloqueado desde o início), "Cidade Alegre" (30 estrelas), "Espaço Sideral" (80 estrelas), "Fazenda do Sol" (150 estrelas)
2. WHEN o jogador possui estrelas totais >= ao threshold de um mundo, THE WorldMap SHALL exibir esse mundo como desbloqueado e navegável
3. WHEN um mundo está bloqueado, THE WorldMap SHALL exibir-o como visualmente indisponível com indicação do número de estrelas necessárias
4. WHEN uma fase de um mundo é completada, THE WorldMap SHALL registrar a fase como concluída com as estrelas obtidas (0 a 3)
5. THE WorldMap SHALL organizar as palavras de cada categoria nos mundos temáticos correspondentes

---

### Requisito 11: Área dos Pais (ParentDashboard)

**User Story:** Como pai ou mãe, quero acompanhar o progresso detalhado do meu filho, para que eu possa entender suas dificuldades, celebrar avanços e colaborar com o aprendizado.

#### Critérios de Aceite

1. WHEN um adulto acessa `/pais`, THE Platform SHALL solicitar o PIN antes de exibir qualquer dado de progresso
2. WHEN o PIN correto é fornecido, THE ParentDashboard SHALL exibir: total de estrelas, total de sessões, tempo total jogado, acertos e erros por categoria, e as conquistas desbloqueadas
3. WHEN o PIN é criado pela primeira vez, THE Platform SHALL armazenar o PIN como hash SHA-256 em localStorage, nunca em texto plano
4. WHEN o PIN é verificado, THE Platform SHALL comparar o hash SHA-256 do PIN informado com o hash armazenado
5. THE ParentDashboard SHALL exibir os pares de letras mais confundidos pela criança (ex: B↔D, F↔V)
6. THE ParentDashboard SHALL exibir o histórico de sessões dos últimos 30 dias com data, duração e palavras praticadas
7. WHEN `exportData` é acionado no ParentDashboard, THE Platform SHALL iniciar o download de um arquivo JSON com o progresso completo do jogador
8. WHERE IndexedDB indisponível, THE ParentDashboard SHALL exibir aviso sutil indicando que o histórico está limitado a localStorage

---

### Requisito 12: Área do Professor (TeacherDashboard)

**User Story:** Como professor, quero gerenciar turmas e acompanhar o progresso coletivo dos alunos, para que eu possa identificar padrões de dificuldade e personalizar minha prática pedagógica.

#### Critérios de Aceite

1. WHEN um professor acessa `/professores`, THE Platform SHALL exibir a interface de gestão de turmas com autenticação por código de turma
2. THE TeacherDashboard SHALL permitir ao professor visualizar métricas agregadas por turma: total de palavras praticadas, categorias cobertas e pares de letras confundidos com maior frequência
3. WHEN o professor aciona exportação, THE TeacherDashboard SHALL gerar um arquivo JSON com os dados de progresso da turma sem identificadores pessoais dos alunos além de nome opcional
4. THE TeacherDashboard SHALL ser carregado via lazy loading (não incluído no bundle inicial da aplicação)

---

### Requisito 13: Acessibilidade (WCAG 2.1 AA)

**User Story:** Como criança com necessidades especiais ou como usuário de tecnologia assistiva, quero que a plataforma seja totalmente acessível, para que eu possa aprender sem barreiras.

#### Critérios de Aceite

1. THE Platform SHALL renderizar todos os botões interativos com tamanho mínimo de toque de 44×44 pixels
2. THE Platform SHALL manter relação de contraste mínima de 4.5:1 para texto normal e 3:1 para texto grande em toda a interface
3. WHEN uma resposta correta ou incorreta é registrada, THE Platform SHALL atualizar uma região `aria-live="polite"` com o texto do feedback
4. THE Platform SHALL marcar todas as imagens decorativas (emojis de fundo) com `aria-hidden="true"`
5. THE Platform SHALL suportar navegação completa por teclado com Tab order lógico e ativação via Enter e Space
6. WHERE o sistema operacional solicita alto contraste (`prefers-contrast: more`), THE Platform SHALL aplicar paleta de alto contraste automaticamente
7. THE Platform SHALL expor controles de volume e velocidade de fala nas configurações da plataforma
8. THE Platform SHALL exibir o texto do feedback de acerto/erro sempre visualmente na tela, independentemente do estado do áudio

---

### Requisito 14: Privacidade e Segurança (LGPD)

**User Story:** Como pai, responsável legal e como instituição, quero que nenhum dado da criança saia do dispositivo, para que a privacidade dos menores seja garantida conforme a LGPD.

#### Critérios de Aceite

1. THE Platform SHALL armazenar todos os dados do jogador exclusivamente no dispositivo local (localStorage e IndexedDB), sem nenhuma transmissão para servidores externos
2. THE Platform SHALL não coletar dados pessoais identificáveis de menores além de nome de usuário opcional
3. WHEN dados são exportados, THE Platform SHALL garantir que o JSON exportado não contém identificadores únicos além de nome de usuário opcional
4. THE Platform SHALL proteger a área dos pais com PIN numérico armazenado como hash SHA-256
5. THE Platform SHALL proteger a área do professor com código de turma sem backend obrigatório na fase 1

---

### Requisito 15: Performance e Arquitetura

**User Story:** Como desenvolvedor e como usuário em dispositivo de baixo desempenho, quero que a plataforma carregue rápido e funcione com fluidez, para que a experiência de aprendizado não seja interrompida por lentidão.

#### Critérios de Aceite

1. THE Platform SHALL carregar as rotas `/pais` e `/professores` via React.lazy (lazy loading) somente quando acessadas
2. THE Platform SHALL dividir cada World em um chunk separado via code splitting do Vite
3. THE AudioEngine SHALL manter cache das vozes disponíveis via `speechSynthesis.getVoices()` e o `PHONEME_TTS_MAP` em memória após a primeira carga
4. THE ProgressStore SHALL executar writes no IndexedDB em operação em batch ao final da sessão, não por cada interação individual
5. THE Platform SHALL usar exclusivamente emojis como recursos visuais (zero bytes de imagens externas)
6. THE Platform SHALL implementar animações via CSS `@keyframes` com `will-change: transform` para o confete, sem dependências de bibliotecas de animação externas

---

### Requisito 16: Mascote Polvinho e Interface Visual

**User Story:** Como criança, quero que o Polvinho me acompanhe com diferentes reações emocionais durante o jogo, para que a experiência seja calorosa, divertida e motivadora.

#### Critérios de Aceite

1. THE Polvinho SHALL exibir diferentes estados de humor: alegre (acerto), pensativo (aguardando), triste (erro), comemorando (conquista)
2. WHEN a criança acerta, THE Platform SHALL exibir animação de confete (ConfettiOverlay)
3. THE Platform SHALL manter a identidade visual existente: paleta de cores tropical, fontes Fredoka e Baloo 2
4. THE SyllableDisplay SHALL exibir cada sílaba da palavra em spans separados com separador "•" entre elas
5. WHEN a HintEngine retorna nível 2, THE SyllableDisplay SHALL aplicar destaque visual (fundo var(--sky)) na sílaba contendo a letra faltante
6. WHEN a criança acerta a letra, THE SyllableDisplay SHALL substituir o "?" pela letra correta com fundo var(--leaf) e texto branco

---

### Requisito 17: Letras que Falam Fonemas (LetterCard)

**User Story:** Como criança, quero ouvir o som de cada letra ao interagir com ela, para que eu associe diretamente o símbolo escrito ao som que ele representa.

#### Critérios de Aceite

1. WHEN a criança passa o cursor (hover) ou toca uma LetterCard, THE AudioEngine SHALL pronunciar o fonema da letra correspondente via `speakPhoneme`
2. THE LetterCard SHALL exibir a letra em tamanho mínimo de 48px para facilitar leitura por crianças
3. THE LetterCard SHALL possuir `aria-label` descritivo incluindo o nome da letra e sua pronúncia

---

### Requisito 18: Tratamento de Erros do Sistema

**User Story:** Como criança jogando, quero que o jogo nunca quebre ou trave, para que a experiência de aprendizado seja ininterrupta mesmo em dispositivos ou conexões limitados.

#### Critérios de Aceite

1. WHEN Web Speech API não está disponível, THE Platform SHALL continuar o jogo normalmente em modo somente visual, sem interrupção da sessão
2. IF IndexedDB não está disponível, THEN THE ProgressStore SHALL fazer fallback para localStorage puro de forma transparente ao usuário
3. IF uma palavra no WordBank não possui sílabas definidas, THEN THE SyllableDisplay SHALL exibir a palavra inteira sem separação silábica e THE HintEngine SHALL pular o nível 2
4. IF um fonema isolado não é pronunciado corretamente pela Web Speech API, THEN THE AudioEngine SHALL usar o texto fonético alternativo do `PHONEME_TTS_MAP`
5. WHEN qualquer erro não tratado ocorre nos engines, THE Platform SHALL registrar o erro silenciosamente em console sem interromper a sessão da criança
6. WHEN `processWordAttempt` recebe uma letra inválida (não A-Z), THE Game SHALL retornar resultado com `error: "invalid_input"` sem lançar exceção

