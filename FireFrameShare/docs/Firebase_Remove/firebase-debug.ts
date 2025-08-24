import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Test Firebase connection
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to write a test document
    const testDoc = doc(db, 'test', 'connection');
    await setDoc(testDoc, {
      timestamp: new Date(),
      message: 'Firebase connection test'
    });
    
    // Try to read it back
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      console.log('✅ Firebase connection successful!');
      console.log('Test document data:', docSnap.data());
      return true;
    } else {
      console.log('❌ Firebase connection failed - document not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase connection error:', error);
    return false;
  }
};

// Log Firebase configuration (without sensitive data)
export const logFirebaseConfig = () => {
  console.log('Firebase Configuration:');
  console.log('- Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'fireframe-cfl39');
  console.log('- Environment:', process.env.NODE_ENV);
  console.log('- Database instance:', db.app.name);
};

// Initialize Firebase debugging
export const initFirebaseDebug = async () => {
  console.log('🔥 Firebase Debug Mode');
  logFirebaseConfig();
  
  const isConnected = await testFirebaseConnection();
  
  if (!isConnected) {
    console.log('🚨 Firebase connection failed. Posts will not persist.');
    console.log('💡 Make sure Firebase is properly configured and accessible.');
  }
  
  return isConnected;
};
