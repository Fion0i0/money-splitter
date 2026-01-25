import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update } from "firebase/database";
import { Trip } from "./types";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcVefSYaWalxaBqzbH_lutuZqXs7ioYBI",
  authDomain: "money-splitter-191c2.firebaseapp.com",
  databaseURL: "https://money-splitter-191c2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "money-splitter-191c2",
  storageBucket: "money-splitter-191c2.firebasestorage.app",
  messagingSenderId: "269283077584",
  appId: "1:269283077584:web:a0d54f18ab4112085f5dd5",
  measurementId: "G-D34K572ST6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Reference to trips in the database
const tripsRef = ref(database, 'trips');

// Helper to convert Firebase object to array (Firebase converts arrays to objects with numeric keys)
const toArray = <T>(obj: any): T[] => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.keys(obj).map(key => obj[key]);
};

// Subscribe to trips changes (real-time listener)
export const subscribeToTrips = (callback: (trips: Trip[]) => void) => {
  return onValue(tripsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert object to array
      const tripsArray: Trip[] = Object.keys(data).map(key => {
        const trip = data[key];
        return {
          ...trip,
          id: key,
          // Ensure arrays are properly converted from Firebase objects
          participants: toArray(trip.participants),
          expenses: toArray(trip.expenses).map((exp: any) => ({
            ...exp,
            participants: toArray(exp.participants)
          })),
          settlements: toArray(trip.settlements)
        };
      });
      // Sort by createdAt descending (newest first)
      tripsArray.sort((a, b) => b.createdAt - a.createdAt);
      callback(tripsArray);
    } else {
      callback([]);
    }
  });
};

// Add a new trip
export const addTrip = async (trip: Trip): Promise<string> => {
  const newTripRef = push(tripsRef);
  const tripWithId = { ...trip, id: newTripRef.key };
  await set(newTripRef, tripWithId);
  return newTripRef.key!;
};

// Update an existing trip
export const updateTrip = async (trip: Trip): Promise<void> => {
  const tripRef = ref(database, `trips/${trip.id}`);
  await set(tripRef, trip);
};

// Delete a trip
export const deleteTrip = async (tripId: string): Promise<void> => {
  const tripRef = ref(database, `trips/${tripId}`);
  await remove(tripRef);
};

// Update specific fields of a trip (partial update)
export const updateTripFields = async (tripId: string, fields: Partial<Trip>): Promise<void> => {
  const tripRef = ref(database, `trips/${tripId}`);
  await update(tripRef, fields);
};

export { database };
