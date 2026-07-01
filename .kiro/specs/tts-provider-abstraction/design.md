# Design Document — TTS Provider Abstraction

## Overview

Este documento descreve a refatoração do `SpeechService` para introduzir uma camada de
abstração de provedor de TTS (text-to-speech). A mudança é **estrutural e não funcional**:
o comportamento externo observável pelos consumidores (`index.tsx`, `audioEngine.ts`) deve
permanecer bit-a-bit idêntico após a refatoração.

### Motivação

O `speechService.ts` atual concentra todo o conhecimento da Web Speech API de forma inline.
Trocar o backend de síntese de voz (Google Cloud TTS, Azure Neural Voices, Amazon Polly,
OpenAI TTS) exigiria modificar esse singleton e, potencialmente, seus consumidores. O objetivo
é inverter essa dependência: o `SpeechService` passa a depender de uma abstração
(`ITTSProvider`), e a implementação concreta (Web Speech API, cloud) é injetada.

### Princípios Guia

- **Zero modificações nos consumidores**: `index.tsx` e `audioEngine.ts` não são tocados.
- **Interface pública inalterada**: `speak(text, options?)`, `stop()`, `isSupported()` mantêm
  as mesmas assinaturas.
- **Sem novas dependências npm**: toda a solução usa TypeScript puro e APIs nativas do browser.
- **Client-side only**: nenhuma lógica de servidor é introduzida.
- **Erros nunca propagam**: o `SpeechService` captura exceções do provider internamente.

---

## Architecture

A refatoração segue o padrão **Strategy / Dependency Injection**:

```
┌─────────────────────────────────────────────┐
│                 Consumers                   │
│   index.tsx          audioEngine.ts         │
│   speechService.speak()  speechService.stop()│
└──────────────────┬──────────────────────────┘
                   │ (sem modificações)
                   ▼
┌─────────────────────────────────────────────┐
│              SpeechService                  │
│  (singleton)                                │
│  - provider: ITTSProvider                   │
│  + speak(text, options?)                    │
│  + stop()                                   │
│  + isSupported()                            │
│  + setProvider(p: ITTSProvider)             │
└──────────────────┬──────────────────────────┘
                   │ delegates to
                   ▼
        ┌──────────────────┐
        │  <<interface>>   │
        │  ITTSProvider    │
        │  + speak()       │
        │  + stop()        │
        │  + isSupported() │
        │  + configure?()  │
        └────────┬─────────┘
                 │ implements
        ┌────────┴──────────┐
        │  WebSpeechProvider│  ← única implementação atual
        │  (migra toda      │
        │   lógica atual    │
        │   do SpeechService│
        │   + microtick,    │
        │   + selectBestVoice│
        │   + applyConfig)  │
        └───────────────────┘

  Futuros providers (apenas slots, não implementados agora):
        GoogleCloudTTSProvider
        AzureNeuralProvider
        AmazonPollyProvider
        OpenAITTSProvider
```

### Fluxo de chamada após refatoração

```
speechService.speak("cachorro", { rate: 0.80 })
  └─► try { provider.speak("cachorro", { rate: 0.80 }) }
        catch (e) { console.warn("[SpeechService]", e) }

  WebSpeechProvider.speak("cachorro", { rate: 0.80 })
    1. clearTimeout(pendingTimer)
    2. speechSynthesis.cancel()
    3. setTimeout(() => {
         utt = new SpeechSynthesisUtterance("cachorro")
         applyChildSpeechConfig(utt, 0.80)   // rate=0.80, pitch, volume de config
         utt.voice = bestVoice               // melhor voz pt-BR
         speechSynthesis.speak(utt)
       }, 50)
```

---

## Components and Interfaces

### `src/lib/providers/ITTSProvider.ts`

Interface central do contrato de abstração:

```typescript
/**
 * SpeakOptions — parâmetros de customização por chamada.
 * Mantém apenas rate para compatibilidade com os consumidores existentes.
 */
export interface SpeakOptions {
  /** Sobrescreve o rate padrão de CHILD_SPEECH_CONFIG. */
  rate?: number;
}

/**
 * ITTSProvider — contrato mínimo que todo provedor de TTS deve implementar.
 *
 * Decisão de design: speak() retorna void (não Promise<void>) para manter
 * compatibilidade com o padrão fire-and-forget dos consumidores atuais.
 * CloudProviders que precisam de chamadas HTTP assíncronas resolvem
 * internamente (ex: baixam o áudio e reproduzem via <audio> tag ou
 * Web Audio API) sem expor a promessa ao chamador.
 */
export interface ITTSProvider {
  /** Fala o texto fornecido. Deve ser fire-and-forget (retorna void). */
  speak(text: string, options: SpeakOptions): void;

  /** Para imediatamente qualquer fala em andamento. */
  stop(): void;

  /** Retorna true se o provider pode ser usado neste ambiente. */
  isSupported(): boolean;

  /**
   * Configura o provider (opcional — necessário apenas para CloudProviders).
   * Aceita um campo `apiKey` e qualquer outra chave de configuração futura.
   *
   * @example
   * provider.configure({ apiKey: "AIza...", endpoint: "https://..." })
   */
  configure?(config: Record<string, unknown> & { apiKey?: string }): void;
}
```

---

### `src/lib/providers/webSpeechProvider.ts`

Implementação concreta que encapsula toda a lógica atual do `SpeechService`:

```typescript
import type { ITTSProvider, SpeakOptions } from "./ITTSProvider";
import { selectBestVoice } from "../selectBestVoice";
import { applyChildSpeechConfig } from "../speechConfig";

export class WebSpeechProvider implements ITTSProvider {
  private readonly supported: boolean;
  private bestVoice: SpeechSynthesisVoice | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.supported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    if (this.supported) {
      const loadVoices = () => {
        this.bestVoice = selectBestVoice(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.supported) return;

    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    window.speechSynthesis.cancel();

    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (!this.supported) return;

      const utt = new SpeechSynthesisUtterance(text);
      applyChildSpeechConfig(utt, options.rate);
      if (this.bestVoice) utt.voice = this.bestVoice;

      window.speechSynthesis.speak(utt);
    }, 50);
  }

  stop(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.supported) {
      window.speechSynthesis.cancel();
    }
  }
}
```

---

### `src/lib/providers/index.ts`

Re-exports convenientes e documentação dos slots para futuros providers:

```typescript
export type { ITTSProvider, SpeakOptions } from "./ITTSProvider";
export { WebSpeechProvider } from "./webSpeechProvider";

// ── Futuros providers ────────────────────────────────────────────────────────
//
// Cada provider abaixo seria adicionado neste diretório seguindo o contrato
// ITTSProvider. Exemplo de como cada um entraria:
//
// GoogleCloudTTSProvider (src/lib/providers/googleCloudTTSProvider.ts)
//   - configure({ apiKey, endpoint }) armazena credenciais
//   - speak() faz POST para Text-to-Speech API, recebe base64, toca via <audio>
//   export { GoogleCloudTTSProvider } from "./googleCloudTTSProvider";
//
// AzureNeuralProvider (src/lib/providers/azureNeuralProvider.ts)
//   - configure({ apiKey, region }) inicializa o SDK do Azure Cognitive Services
//   - speak() usa SpeechSynthesizer do SDK, sem modificar a interface
//   export { AzureNeuralProvider } from "./azureNeuralProvider";
//
// AmazonPollyProvider (src/lib/providers/amazonPollyProvider.ts)
//   - configure({ accessKey, secretKey, region }) inicializa o cliente AWS
//   - speak() faz chamada SynthesizeSpeech, toca via Web Audio API
//   export { AmazonPollyProvider } from "./amazonPollyProvider";
//
// OpenAITTSProvider (src/lib/providers/openAITTSProvider.ts)
//   - configure({ apiKey }) armazena a chave da OpenAI
//   - speak() faz POST /v1/audio/speech, toca o stream via MediaSource API
//   export { OpenAITTSProvider } from "./openAITTSProvider";
//
// Troca de provider em runtime (exemplo):
//   import { speechService } from "@/lib/speechService";
//   import { GoogleCloudTTSProvider } from "@/lib/providers";
//   const provider = new GoogleCloudTTSProvider();
//   provider.configure({ apiKey: "AIza..." });
//   speechService.setProvider(provider);
```

---

### `src/lib/speechService.ts` (refatorado)

O singleton mantém a **mesma interface pública**; internamente delega ao provider:

```typescript
import type { ITTSProvider, SpeakOptions } from "./providers/ITTSProvider";
import { WebSpeechProvider } from "./providers/webSpeechProvider";

// Re-export SpeakOptions para compatibilidade com importações existentes
export type { SpeakOptions };

class SpeechService {
  private provider: ITTSProvider;

  constructor(provider?: ITTSProvider) {
    this.provider = provider ?? new WebSpeechProvider();
  }

  /**
   * Substitui o provider ativo em runtime.
   * Útil para testes e para troca dinâmica de backend.
   */
  setProvider(provider: ITTSProvider): void {
    this.provider = provider;
  }

  isSupported(): boolean {
    return this.provider.isSupported();
  }

  speak(text: string, options: SpeakOptions = {}): void {
    try {
      this.provider.speak(text, options);
    } catch (e) {
      console.warn("[SpeechService] provider.speak() threw:", e);
    }
  }

  stop(): void {
    try {
      this.provider.stop();
    } catch (e) {
      console.warn("[SpeechService] provider.stop() threw:", e);
    }
  }
}

// Instância única compartilhada por todo o aplicativo.
// Compatível bit-a-bit com o singleton anterior.
export const speechService = new SpeechService();
```

---

### Arquivos inalterados

| Arquivo | Motivo para não alterar |
|---|---|
| `src/lib/speechConfig.ts` | Usado pelo `WebSpeechProvider` via import; interface pública não muda |
| `src/lib/selectBestVoice.ts` | Utilitário puro; movido para uso interno do `WebSpeechProvider` |
| `src/lib/speechMessages.ts` | Sem relação com a abstração |
| `src/lib/numberToWords.ts` | Sem relação com a abstração |
| `src/roumao/index.tsx` | **Zero modificações** (requisito explícito) |
| `src/alfabetizacao/engines/audioEngine.ts` | **Zero modificações** (requisito explícito) |

---

## Data Models

### `SpeakOptions`

```typescript
interface SpeakOptions {
  rate?: number;  // único campo; valores típicos: 0.80–0.90 (CHILD_SPEECH_CONFIG)
}
```

Decisão: manter apenas `rate` conforme requisito 4.2. CloudProviders que precisam de
parâmetros adicionais (voz específica, SSML, emoção) os recebem via `configure()`, não
via `SpeakOptions`, para não quebrar os consumidores existentes.

### `ITTSProvider` (interface — não é dado persistido)

```typescript
interface ITTSProvider {
  speak(text: string, options: SpeakOptions): void;
  stop(): void;
  isSupported(): boolean;
  configure?(config: Record<string, unknown> & { apiKey?: string }): void;
}
```

### Estado interno do `WebSpeechProvider`

| Campo | Tipo | Descrição |
|---|---|---|
| `supported` | `boolean` | Detectado no constructor; imutável após criação |
| `bestVoice` | `SpeechSynthesisVoice \| null` | Atualizada via `voiceschanged` |
| `pendingTimer` | `ReturnType<typeof setTimeout> \| null` | Timer do microtick de 50ms |

### Estado interno do `SpeechService` (refatorado)

| Campo | Tipo | Descrição |
|---|---|---|
| `provider` | `ITTSProvider` | Provider ativo; substituível via `setProvider()` |

---

## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as
execuções válidas de um sistema — essencialmente, uma declaração formal sobre o que o software
deve fazer. Propriedades servem como ponte entre especificações legíveis por humanos e
garantias de corretude verificáveis por máquina.*

### Property 1: Delegação round-trip de speak()

*Para qualquer* par `(text: string, options: SpeakOptions)` passado a
`speechService.speak(text, options)`, o provider injetado SHALL receber exatamente os mesmos
valores de `text` e `options` na chamada a `provider.speak(text, options)` — os argumentos
não são modificados, omitidos ou reordenados pelo `SpeechService`.

**Validates: Requirements 3.3, 6.2, 6.4**

---

### Property 2: Configuração da utterance (rate, pitch, volume)

*Para qualquer* texto e qualquer valor de `options.rate` (incluindo omitido), toda utterance
produzida pelo `WebSpeechProvider` SHALL ter:
- `utterance.rate` igual a `options.rate` quando fornecido, ou `CHILD_SPEECH_CONFIG.rate` quando omitido
- `utterance.pitch` igual a `CHILD_SPEECH_CONFIG.pitch`
- `utterance.volume` igual a `CHILD_SPEECH_CONFIG.volume`

**Validates: Requirements 2.5, 2.6**

---

### Property 3: Seleção de voz reflete voiceschanged

*Para qualquer* lista de `SpeechSynthesisVoice` emitida pelo evento `voiceschanged`, a voz
selecionada pelo `WebSpeechProvider` após o evento SHALL ser idêntica ao retorno de
`selectBestVoice(voices)` para aquela lista — a lógica de ranking não é alterada pela
migração para o `WebSpeechProvider`.

**Validates: Requirements 2.4**

---

### Property 4: Swallowing de exceções do provider

*Para qualquer* exceção (de qualquer tipo) lançada por `provider.speak()` ou `provider.stop()`,
`speechService.speak()` e `speechService.stop()` SHALL:
- não propagar a exceção ao chamador (não lançar)
- chamar `console.warn` com a exceção capturada

**Validates: Requirements 4.4**

---

### Property 5: Cancel-before-speak invariant

*Para qualquer* sequência de chamadas a `WebSpeechProvider.speak()`, cada chamada SHALL
cancelar toda fala anterior (via `speechSynthesis.cancel()`) antes de enfileirar a nova
utterance — garantindo que nunca haja sobreposição de vozes independentemente da ordem e
frequência das chamadas.

**Validates: Requirements 2.2**

---

## Error Handling

| Cenário | Comportamento |
|---|---|
| Browser sem Web Speech API | `WebSpeechProvider.isSupported()` → `false`; `speak()` e `stop()` são no-op silenciosos |
| `provider.speak()` lança exceção | `SpeechService.speak()` captura, loga `console.warn`, não propaga |
| `provider.stop()` lança exceção | `SpeechService.stop()` captura, loga `console.warn`, não propaga |
| `voiceschanged` nunca dispara | `bestVoice` permanece `null`; utterance é criada sem voz explícita (browser usa padrão) |
| `setTimeout` cancelado antes de executar | Nenhuma utterance é criada; fila permanece limpa |
| CloudProvider sem `configure()` chamado | `speak()` pode falhar internamente → capturado pelo try/catch do `SpeechService` |

---

## Testing Strategy

### Abordagem dual

A suíte de testes combina:
- **Testes de exemplo**: comportamentos determinísticos, branches específicas, integrações
- **Testes baseados em propriedades (PBT)**: propriedades universais sobre todas as entradas

A biblioteca de PBT recomendada é **[fast-check](https://fast-check.io)** (TypeScript puro,
sem dependências de browser, compatível com Vitest/Jest).

### Testes unitários de exemplo

#### `WebSpeechProvider`

| Cenário | Verificação |
|---|---|
| `isSupported()` com `speechSynthesis` ausente | Retorna `false` |
| `speak()` com `speechSynthesis` ausente | Não lança, não chama nada |
| `stop()` cancela timer pendente | `clearTimeout` chamado; `speechSynthesis.cancel()` chamado |
| `configure()` não definido | Não causa erro de tipo (método é opcional na interface) |

#### `SpeechService`

| Cenário | Verificação |
|---|---|
| Default provider é `WebSpeechProvider` | `new SpeechService()` usa `WebSpeechProvider` |
| `setProvider()` substitui provider | Chamadas subsequentes delegam ao novo provider |
| `stop()` delega para provider | `mockProvider.stop()` chamado exatamente uma vez |
| `isSupported()` delega para provider | Retorna o valor do mock |

### Testes baseados em propriedades (PBT)

Cada propriedade do design é implementada como um único teste PBT com mínimo de **100 iterações**.

#### Configuração de tag para rastreabilidade

```typescript
// Tag format:
// Feature: tts-provider-abstraction, Property N: <texto da propriedade>
```

#### Property 1 — Delegação round-trip

```typescript
// Feature: tts-provider-abstraction, Property 1: speak() delegation round-trip
fc.property(
  fc.string(),                              // text: qualquer string
  fc.record({ rate: fc.float({ min: 0.5, max: 2.0 }) }, { requiredKeys: [] }),
  (text, options) => {
    const mock = createMockProvider();
    const service = new SpeechService(mock);
    service.speak(text, options);
    expect(mock.lastSpeakArgs).toEqual([text, options]);
  }
)
```

#### Property 2 — Configuração de utterance

```typescript
// Feature: tts-provider-abstraction, Property 2: utterance rate/pitch/volume
fc.property(
  fc.string(),
  fc.option(fc.float({ min: 0.5, max: 2.0 })),  // rate: presente ou ausente
  (text, rate) => {
    const utt = captureUtterance(provider, text, rate !== null ? { rate } : {});
    const expectedRate = rate ?? CHILD_SPEECH_CONFIG.rate;
    expect(utt.rate).toBeCloseTo(expectedRate);
    expect(utt.pitch).toBeCloseTo(CHILD_SPEECH_CONFIG.pitch);
    expect(utt.volume).toBeCloseTo(CHILD_SPEECH_CONFIG.volume);
  }
)
```

#### Property 3 — Seleção de voz

```typescript
// Feature: tts-provider-abstraction, Property 3: voice selection matches selectBestVoice
fc.property(
  fc.array(arbitraryVoice()),  // lista aleatória de SpeechSynthesisVoice
  (voices) => {
    simulateVoicesChanged(provider, voices);
    const expected = selectBestVoice(voices);
    expect(provider.currentVoice).toEqual(expected);
  }
)
```

#### Property 4 — Swallowing de exceções

```typescript
// Feature: tts-provider-abstraction, Property 4: exceptions are swallowed
fc.property(
  fc.string(),  // mensagem de erro arbitrária
  (errorMsg) => {
    const throwingProvider = createThrowingProvider(new Error(errorMsg));
    const service = new SpeechService(throwingProvider);
    expect(() => service.speak("test")).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalled();
  }
)
```

#### Property 5 — Cancel-before-speak

```typescript
// Feature: tts-provider-abstraction, Property 5: cancel-before-speak invariant
fc.property(
  fc.array(fc.string(), { minLength: 1, maxLength: 10 }),  // sequência de textos
  (texts) => {
    const cancelCalls: number[] = [];
    const speakCalls: number[] = [];
    trackCalls(mockSynthesis, cancelCalls, speakCalls);

    texts.forEach((t) => provider.speak(t));
    jest.runAllTimers();

    // Para N speaks, deve haver N cancels, e cada cancel precede seu speak
    expect(cancelCalls.length).toBeGreaterThanOrEqual(texts.length);
    cancelCalls.forEach((cancelTime, i) => {
      expect(cancelTime).toBeLessThan(speakCalls[i]);
    });
  }
)
```

### Smoke tests (compile-time)

Verificados via `tsc --noEmit` no CI:
- `ITTSProvider` exportado e importável
- `MockProvider` implementa `ITTSProvider` sem acesso ao DOM
- `index.tsx` e `audioEngine.ts` compilam sem erros de tipo após a refatoração
- `SpeakOptions` mantém apenas `rate?: number`

### Estrutura de arquivos de teste sugerida

```
src/lib/
  providers/
    __tests__/
      ITTSProvider.test.ts        ← smoke/compile checks + mock test
      webSpeechProvider.test.ts   ← PBT properties 2, 3, 5 + exemplos
  __tests__/
    speechService.test.ts         ← PBT properties 1, 4 + exemplos
```
