// Local isolated review. Does not edit the existing Vite/public-page configuration.
import { createServer } from 'vite';
import { valueExplainerDevPlugin } from './value-explainer-assets.mjs';
const server = await createServer({ configFile: false, plugins: [valueExplainerDevPlugin()], server: { host: '127.0.0.1', port: 5182, strictPort: true }, optimizeDeps: { noDiscovery: true, entries: [], include: ['@receiz/sdk/valuation', '@receiz/sdk'] } });
await server.listen();
console.log('Value explainer preview: http://127.0.0.1:5182/learn/how-value-works/');
