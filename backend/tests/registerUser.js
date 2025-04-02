import axios from 'axios';

try {
  const response = await axios.post('http://localhost:5000/api/auth/signup', {
    username: 'jayworth',
    email: 'owolabijohnson@gmail.com',
    password: 'jayfin12r'
  });
  console.log(response.data);
} catch (error) {
  if (error.response) {
    // Server responded with a status other than 2xx
    console.error('Error response:', error.response.data);
  } else if (error.request) {
    // No response received from server
    console.error('Error request:', error.request);
  } else {
    // Other errors
    console.error('Error message:', error.message);
  }
}
