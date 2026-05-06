importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js');
importScripts(
  'https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js'
);

firebase.initializeApp({
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, { body });
});
