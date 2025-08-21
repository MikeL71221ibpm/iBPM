/**
 * Test script to verify note deduplication functionality
 */

// We'll use a direct import of the database connection and types
const { db } = require('../dist/db');
const { DatabaseStorage } = require('../dist/database-storage');

// Create a storage instance directly for testing
const storage = new DatabaseStorage();

async function testNoteDeduplication() {
  console.log('Testing note deduplication functionality...');
  
  // First, create some test notes
  const testNotes = [
    {
      patientId: "test-patient-1",
      dosDate: new Date("2025-05-01"),
      noteText: "This is a test note for deduplication",
      providerId: "test-provider-1",
      userId: 1
    },
    {
      patientId: "test-patient-1",
      dosDate: new Date("2025-05-01"),
      noteText: "This is a test note for deduplication", // Duplicate of first note
      providerId: "test-provider-1",
      userId: 1
    },
    {
      patientId: "test-patient-2",
      dosDate: new Date("2025-05-01"),
      noteText: "This is a different test note",
      providerId: "test-provider-2",
      userId: 1
    }
  ];
  
  console.log(`Attempting to save ${testNotes.length} notes (with 1 duplicate)...`);
  
  // Save the notes - our updated function should prevent duplicates
  await storage.saveNotes(testNotes);
  
  // Check how many notes were actually saved
  const patient1Notes = await storage.getNotesByPatientId("test-patient-1");
  const patient2Notes = await storage.getNotesByPatientId("test-patient-2");
  
  console.log(`Notes saved for test-patient-1: ${patient1Notes.length} (should be 1)`);
  console.log(`Notes saved for test-patient-2: ${patient2Notes.length} (should be 1)`);
  
  // Now try again to save the same notes - all should be skipped
  console.log('\nAttempting to save the same notes again...');
  await storage.saveNotes(testNotes);
  
  // Verify no new notes were added
  const patient1NotesAfter = await storage.getNotesByPatientId("test-patient-1");
  const patient2NotesAfter = await storage.getNotesByPatientId("test-patient-2");
  
  console.log(`Notes for test-patient-1 after second save: ${patient1NotesAfter.length} (should be 1)`);
  console.log(`Notes for test-patient-2 after second save: ${patient2NotesAfter.length} (should be 1)`);
  
  console.log('\nTest completed!');
}

// Run the test
testNoteDeduplication().catch(console.error);