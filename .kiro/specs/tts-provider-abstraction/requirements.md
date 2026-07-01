# Requirements Document

## Introduction

O aplicativo educacional infantil "Ilha das Letrinhas e Numerinhos" usa síntese de voz (TTS)
diretamente via Web Speech API em `speechService.ts`. Para possibilitar a troca futura de
provedor (Google Cloud TTS, Azure Neural Voices, Amazon Polly, OpenAI TTS) sem modificar os
consumidores existentes (`speechService.speak()`, `speechService.stop()`), é necessário criar
uma camada de abstração — uma interface/contrato que todos os provedores devem implementar —
e refatorar o `SpeechService` para delegar a síntese ao provedor injetado.

O comportamento externo do `speechService` (singleton público) deve permanecer idêntico após
a refatoração: os módulos `index.tsx` e `audioEngine.ts` não devem sofrer nenhuma modificação.

## Glossary

- **TTS_Provider**: Componente responsável por executar síntese de voz (text-to-speech) usando
  um backend específico (ex: Web Speech API, Google Cloud TTS, Azure, Polly, OpenAI).
- **SpeechService**: Singleton existente em `src/lib/speechService.ts` que gerencia exclusividade
  de fala (cancel + microtick + speak) e expõe a interface pública `speak()`, `stop()`,
  `isSupported()`.
- **ITTSProvider**: Interface TypeScript que define o contrato que todo TTS_Provider deve seguir.
- **WebSpeechProvider**: Implementação de ITTSProvider que encapsula a Web Speech API atual,
  preservando o comportamento de seleção de voz (ranking via `selectBestVoice`) e microtick.
- **SpeakOptions**: Tipo existente `{ rate?: number }` que parametriza a velocidade de fala por
  contexto.
- **CloudProvider**: Qualquer futuro TTS_Provider que requer chave de API e chamadas HTTP
  (Google Cloud TTS, Azure, Polly, OpenAI).
- **AudioConfig**: Tipo existente em `audioEngine.ts` com os campos `volume`, `rate`, `pitch`,
  `lang`, `enabled`.

---

## Requirements

### Requirement 1: Definir a interface ITTSProvider

**User Story:** Como desenvolvedor, quero uma interface TypeScript que descreva o contrato
mínimo de qualquer provedor de TTS, para que eu possa adicionar novos provedores no futuro
sem alterar o restante do aplicativo.

#### Acceptance Criteria

1. THE ITTSProvider SHALL declare o método `speak(text: string, options: SpeakOptions): void`
2. THE ITTSProvider SHALL declare o método `stop(): void`
3. THE ITTSProvider SHALL declare o método `isSupported(): boolean`
4. THE ITTSProvider SHALL ser exportado a partir de um arquivo dedicado em `src/lib/`
5. WHERE um CloudProvider necessitar de configuração de API key ou URL de endpoint, THE
   ITTSProvider SHALL declarar o método opcional `configure(config: Record<string, unknown>): void`

---

### Requirement 2: Implementar o WebSpeechProvider

**User Story:** Como desenvolvedor, quero que a lógica atual da Web Speech API (microtick,
ranking de vozes, `applyChildSpeechConfig`) seja encapsulada em uma classe concreta que
implemente ITTSProvider, para que o comportamento atual seja preservado sem regressão.

#### Acceptance Criteria

1. THE WebSpeechProvider SHALL implementar a interface ITTSProvider
2. WHEN `speak()` é chamado no WebSpeechProvider, THE WebSpeechProvider SHALL cancelar toda
   fala em andamento, aguardar um microtick de 50ms e enfileirar a nova utterance
3. WHEN o browser não suporta Web Speech API, THE WebSpeechProvider SHALL retornar `false`
   em `isSupported()` e ignorar silenciosamente chamadas a `speak()` e `stop()`
4. WHEN as vozes disponíveis mudarem (`voiceschanged`), THE WebSpeechProvider SHALL atualizar
   a voz selecionada usando `selectBestVoice()`
5. WHEN `speak()` é chamado com `options.rate`, THE WebSpeechProvider SHALL usar o valor
   fornecido como velocidade de fala; WHEN `options.rate` é omitido, THE WebSpeechProvider
   SHALL usar `CHILD_SPEECH_CONFIG.rate`
6. THE WebSpeechProvider SHALL aplicar `pitch` e `volume` de `CHILD_SPEECH_CONFIG` em toda
   utterance produzida

---

### Requirement 3: Refatorar o SpeechService para usar provedor injetável

**User Story:** Como desenvolvedor, quero que o `SpeechService` delegue toda síntese de voz
ao ITTSProvider injetado, para que a troca de provedor não exija modificações nos consumidores.

#### Acceptance Criteria

1. THE SpeechService SHALL aceitar uma instância de ITTSProvider como dependência injetável
   (via construtor ou função de registro)
2. WHEN nenhum provedor for explicitamente injetado, THE SpeechService SHALL usar o
   WebSpeechProvider como provedor padrão
3. WHEN `speechService.speak(text, options)` é chamado, THE SpeechService SHALL delegar a
   chamada ao ITTSProvider ativo sem alterar a assinatura pública do método
4. WHEN `speechService.stop()` é chamado, THE SpeechService SHALL delegar a chamada ao
   ITTSProvider ativo sem alterar a assinatura pública do método
5. WHEN `speechService.isSupported()` é chamado, THE SpeechService SHALL delegar a chamada
   ao ITTSProvider ativo sem alterar a assinatura pública do método
6. THE SpeechService SHALL manter a exportação `export const speechService` com os métodos
   `speak()`, `stop()` e `isSupported()`, de forma que nenhuma linha de `index.tsx` ou
   `audioEngine.ts` precise ser modificada

---

### Requirement 4: Preservar compatibilidade total com os consumidores existentes

**User Story:** Como desenvolvedor, quero garantir que a refatoração não quebre nenhum
comportamento observável para `index.tsx` e `audioEngine.ts`, para que o aplicativo continue
funcionando igual após a mudança.

#### Acceptance Criteria

1. AFTER a refatoração, THE SpeechService SHALL expor exatamente os mesmos métodos públicos
   `speak(text: string, options?: SpeakOptions): void`, `stop(): void` e
   `isSupported(): boolean` com as mesmas assinaturas de tipo
2. THE SpeekOptions SHALL manter o campo `rate?: number` como único campo público
3. WHEN os arquivos `src/roumao/index.tsx` e `src/alfabetizacao/engines/audioEngine.ts` são
   compilados após a refatoração, THE TypeScript_Compiler SHALL produzir zero erros de tipo
   relacionados ao `speechService`
4. IF um TTS_Provider lançar uma exceção durante `speak()`, THEN THE SpeechService SHALL
   capturar a exceção e registrar um aviso no console sem propagar o erro aos consumidores

---

### Requirement 5: Prever a arquitetura para CloudProviders

**User Story:** Como desenvolvedor, quero que a arquitetura preveja os requisitos de
CloudProviders (API key, chamadas HTTP assíncronas, respostas em áudio) mesmo sem
implementá-los agora, para que a adição futura não exija redesenho da interface.

#### Acceptance Criteria

1. THE ITTSProvider SHALL declarar `speak()` com retorno `void` (não `Promise<void>`) para
   manter compatibilidade com o comportamento síncrono atual; a resolução assíncrona de áudio
   de CloudProviders SHALL ser tratada internamente pelo próprio provedor
2. WHERE um CloudProvider necessitar de uma API key, THE ITTSProvider.configure() SHALL
   aceitar um campo `apiKey: string` no objeto de configuração sem lançar erro de tipo
3. THE ITTSProvider SHALL permitir que implementações futuras reproduzam áudio via `<audio>`
   HTML ou Web Audio API sem que a interface precise ser modificada
4. THE WebSpeechProvider SHALL ser localizado em `src/lib/providers/webSpeechProvider.ts`,
   estabelecendo o diretório `src/lib/providers/` como convenção para futuros provedores

---

### Requirement 6: Garantir testabilidade da camada de abstração

**User Story:** Como desenvolvedor, quero poder injetar um provedor falso (mock) nos testes,
para verificar que o SpeechService delega corretamente sem depender do browser.

#### Acceptance Criteria

1. THE ITTSProvider SHALL ser suficiente para criar um mock completo (implementar todos os
   métodos obrigatórios) sem precisar de acesso ao DOM ou ao browser
2. WHEN um MockTTSProvider com método `speak()` rastreável é injetado no SpeechService,
   THE SpeechService SHALL chamar `provider.speak(text, options)` com os mesmos argumentos
   recebidos em `speechService.speak(text, options)`
3. WHEN um MockTTSProvider é injetado e `speechService.stop()` é chamado, THE SpeechService
   SHALL chamar `provider.stop()` exatamente uma vez
4. FOR ALL chamadas a `speechService.speak(text, options)`, THE SpeechService SHALL chamar
   `provider.speak(text, options)` com os mesmos valores de `text` e `options` (propriedade
   de round-trip de delegação)
