import { bootstrap } from './bootstrap';

// Execute bootstrap function
bootstrap().catch((err) => {
  console.error('Failed to bootstrap application:', err);
  process.exit(1);
});
