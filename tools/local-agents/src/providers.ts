import { OllamaProvider } from './ollama.js';
import { OpenRouterProvider } from './openrouter.js';
import type { HostConfig, ModelProvider } from './types.js';

/** Explicit registrations only. Provider failures never select another provider. */
export function createProviders(config: HostConfig): ModelProvider[] {
  const providers: ModelProvider[] = [new OllamaProvider(config.ollamaUrl)];
  if (config.inferencePolicy === 'approved-free-providers' && config.openrouter)
    providers.push(new OpenRouterProvider(config.openrouter));
  return providers;
}
