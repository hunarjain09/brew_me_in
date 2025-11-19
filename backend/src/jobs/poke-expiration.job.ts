import cron from 'node-cron';
import pokeService from '../services/poke.service';

/**
 * Background job to expire old pokes
 * Runs every 5 minutes
 */
export function startPokeExpirationJob() {
  console.log('Starting poke expiration job...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Running poke expiration check...');
      const expiredCount = await pokeService.expireOldPokes();

      if (expiredCount > 0) {
        console.log(`Expired ${expiredCount} pokes`);
      }
    } catch (error) {
      console.error('Error in poke expiration job:', error);
    }
  });

  console.log('Poke expiration job started (runs every 5 minutes)');
}
