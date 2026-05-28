const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!API_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL');
}

if (!SOCKET_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SOCKET_URL');
}

export { API_URL, SOCKET_URL };
