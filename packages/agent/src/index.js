import { createApp } from './createApp.js';
import { config } from './config/index.js';

const { app } = createApp();

app.listen(config.port, () => {
  console.log(`PolicyMesh agent listening on port ${config.port}`);
  console.log(
    `Mode: ${config.demoMode ? 'DEMO (no Hedera credentials)' : 'HEDERA ' + config.hedera.network}`,
  );
});
