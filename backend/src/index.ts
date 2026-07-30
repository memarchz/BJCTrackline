import { app } from './app';
import { env } from './env';

app.listen(env.port, () => {
  console.log(`BJC Trackline API listening on http://localhost:${env.port}`);
});
