import { Platform } from 'react-native';

function getApiBase() {
  // Adjust LAN_IP to your machine's IPv4 if using a real phone
  const LAN_IP = ''; // <-- REPLACE with your PC's IP
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  // iOS simulator on Mac would be 127.0.0.1, but you said Windows, so likely real device → LAN IP
  return `http://127.0.0.1:4000`;
}
