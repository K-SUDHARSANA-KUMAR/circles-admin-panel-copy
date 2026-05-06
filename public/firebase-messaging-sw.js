importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js');
importScripts(
  'https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyAPqE9XaWons4yn-HzIOBRR3eqvLUgsXZY',
  authDomain: 'naga-sfa-mobile-app.firebaseapp.com',
  projectId: 'naga-sfa-mobile-app',
  storageBucket: 'naga-sfa-mobile-app.firebasestorage.app',
  messagingSenderId: '21682097662',
  appId: '1:21682097662:web:bab7f045e86879411904af',
  measurementId: 'G-3LH9JE72Q0',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, { body });
});
