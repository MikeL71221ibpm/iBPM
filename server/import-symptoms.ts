/**
 * Main script to import symptom data using the standardized field names
 */
import { importSymptomData } from './utils/import-standardized-symptoms';

// Constants
const CSV_FILE_PATH = '../attached_assets/Symptom_Segments_asof_4_30_25_MASTER.csv';

async function main() {
  try {
    console.log('Starting symptom data import with standardized field names...');
    await importSymptomData(CSV_FILE_PATH);
    console.log('Symptom data import completed successfully');
  } catch (error) {
    console.error('Error importing symptom data:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });