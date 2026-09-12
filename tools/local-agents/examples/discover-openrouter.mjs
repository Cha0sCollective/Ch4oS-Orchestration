// Public catalog discovery only: this does not require a key or perform inference.
import { OpenRouterProvider } from '@ch4os/local-agents';

const model = process.argv[2];
if (!model) throw new Error('Supply an exact author/model:free identifier');
const provider = new OpenRouterProvider({
  apiKeyEnv: 'OPENROUTER_API_KEY', maxCostUsd: 0,
  allowedRepositories: [], allowSuppliedSources: false, dataCollection: 'deny',
});
console.log(JSON.stringify(await provider.discoverFreeEndpoints(model), null, 2));
