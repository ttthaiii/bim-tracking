import { collection, addDoc, getDocs, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PublicHoliday {
    id?: string;
    date: string; // YYYY-MM-DD
    label: string;
    createdAt: number;
    createdBy?: string;
}

const COLLECTION_NAME = 'publicHolidays';

export const addPublicHoliday = async (date: string, label: string, createdBy?: string): Promise<void> => {
    try {
        // Check for duplicate date? Assuming we trust users for now or allow multiple holidays on same day.
        // Ideally we might want to check if it exists:
        // const q = query(collection(db, COLLECTION_NAME), where('date', '==', date));
        // ... but simple add is fine for MVP.

        await addDoc(collection(db, COLLECTION_NAME), {
            date,
            label,
            createdAt: Timestamp.now().toMillis(),
            createdBy: createdBy || 'unknown'
        });
    } catch (error) {
        console.error('Error adding public holiday:', error);
        throw error;
    }
};

export const addPublicHolidaysBulk = async (holidays: { date: string, label: string }[], createdBy?: string): Promise<void> => {
    try {
        const batchPromises = holidays.map(h => addDoc(collection(db, COLLECTION_NAME), {
            date: h.date,
            label: h.label,
            createdAt: Timestamp.now().toMillis(),
            createdBy: createdBy || 'unknown'
        }));
        await Promise.all(batchPromises);
    } catch (error) {
        console.error('Error adding bulk public holidays:', error);
        throw error;
    }
};

export const getPublicHolidays = async (year?: number): Promise<PublicHoliday[]> => {
    try {
        let q = query(collection(db, COLLECTION_NAME));

        // If year is provided, we could filter by string range "YYYY-01-01" to "YYYY-12-31"
        if (year) {
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            q = query(collection(db, COLLECTION_NAME), where('date', '>=', start), where('date', '<=', end));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PublicHoliday));
    } catch (error) {
        console.error('Error fetching public holidays:', error);
        return [];
    }
};

export const deletePublicHoliday = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error('Error deleting public holiday:', error);
        throw error;
    }
};
