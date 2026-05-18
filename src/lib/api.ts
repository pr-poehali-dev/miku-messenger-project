const AUTH_URL = 'https://functions.poehali.dev/585cc4d5-1c9b-431c-9cb6-d8b70d9d4dc9';
const API_URL = 'https://functions.poehali.dev/d087e13e-3caf-4a03-9e1d-a978e7a54321';

export const getToken = () => localStorage.getItem('miku_token') || '';
export const getUser = () => {
  const u = localStorage.getItem('miku_user');
  return u ? JSON.parse(u) : null;
};
export const setAuth = (token: string, user: any) => {
  localStorage.setItem('miku_token', token);
  localStorage.setItem('miku_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('miku_token');
  localStorage.removeItem('miku_user');
};

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Auth-Token': getToken(),
});

export const auth = {
  register: (email: string, username: string, password: string) =>
    fetch(`${AUTH_URL}/register`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, username, password }) }).then(r => r.json()),
  login: (email: string, password: string) =>
    fetch(`${AUTH_URL}/login`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) }).then(r => r.json()),
  logout: () =>
    fetch(`${AUTH_URL}/logout`, { method: 'POST', headers: headers() }).then(r => r.json()),
  me: () =>
    fetch(`${AUTH_URL}/me`, { headers: headers() }).then(r => r.json()),
  updateProfile: (data: any) =>
    fetch(`${AUTH_URL}/profile`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  searchUsers: (q: string) =>
    fetch(`${AUTH_URL}/search?q=${encodeURIComponent(q)}`, { headers: headers() }).then(r => r.json()),
  getUser: (username: string) =>
    fetch(`${AUTH_URL}/user/${username}`, { headers: headers() }).then(r => r.json()),
};

export const api = {
  getMessages: (params: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_URL}/messages?${qs}`, { headers: headers() }).then(r => r.json());
  },
  sendMessage: (data: any) =>
    fetch(`${API_URL}/messages`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  react: (message_id: number, emoji: string) =>
    fetch(`${API_URL}/react`, { method: 'POST', headers: headers(), body: JSON.stringify({ message_id, emoji }) }).then(r => r.json()),
  removeMessage: (message_id: number) =>
    fetch(`${API_URL}/remove-message`, { method: 'POST', headers: headers(), body: JSON.stringify({ message_id }) }).then(r => r.json()),

  getGroups: () =>
    fetch(`${API_URL}/groups`, { headers: headers() }).then(r => r.json()),
  createGroup: (data: any) =>
    fetch(`${API_URL}/groups`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  joinGroup: (invite_code: string) =>
    fetch(`${API_URL}/groups/join`, { method: 'POST', headers: headers(), body: JSON.stringify({ invite_code }) }).then(r => r.json()),
  getGroupMembers: (group_id: number) =>
    fetch(`${API_URL}/groups/${group_id}/members`, { headers: headers() }).then(r => r.json()),
  getPublicGroups: (q = '') =>
    fetch(`${API_URL}/public-groups?q=${encodeURIComponent(q)}`, { headers: headers() }).then(r => r.json()),

  getChannels: () =>
    fetch(`${API_URL}/channels`, { headers: headers() }).then(r => r.json()),
  createChannel: (data: any) =>
    fetch(`${API_URL}/channels`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  subscribeChannel: (channel_id: number, action: 'subscribe' | 'unsubscribe') =>
    fetch(`${API_URL}/subscribe`, { method: 'POST', headers: headers(), body: JSON.stringify({ channel_id, action }) }).then(r => r.json()),
  exploreChannels: (q = '') =>
    fetch(`${API_URL}/explore-channels?q=${encodeURIComponent(q)}`, { headers: headers() }).then(r => r.json()),

  getConversations: () =>
    fetch(`${API_URL}/conversations`, { headers: headers() }).then(r => r.json()),
  openDM: (user_id: number) =>
    fetch(`${API_URL}/open-dm`, { method: 'POST', headers: headers(), body: JSON.stringify({ user_id }) }).then(r => r.json()),
  blockDM: (conversation_id: number) =>
    fetch(`${API_URL}/block-dm`, { method: 'POST', headers: headers(), body: JSON.stringify({ conversation_id }) }).then(r => r.json()),
  clearDM: (conversation_id: number) =>
    fetch(`${API_URL}/clear-dm`, { method: 'POST', headers: headers(), body: JSON.stringify({ conversation_id }) }).then(r => r.json()),

  getGifts: () =>
    fetch(`${API_URL}/gifts/list`, { headers: headers() }).then(r => r.json()),
  sendGift: (gift_id: number, recipient_id: number, message: string) =>
    fetch(`${API_URL}/gifts/send`, { method: 'POST', headers: headers(), body: JSON.stringify({ gift_id, recipient_id, message }) }).then(r => r.json()),
  getReceivedGifts: (user_id: number) =>
    fetch(`${API_URL}/gifts/received?user_id=${user_id}`, { headers: headers() }).then(r => r.json()),

  upload: (data: string, type: string, category = 'media') =>
    fetch(`${API_URL}/upload`, { method: 'POST', headers: headers(), body: JSON.stringify({ data, type, category }) }).then(r => r.json()),

  getSettings: () =>
    fetch(`${API_URL}/settings`, { headers: headers() }).then(r => r.json()),
  saveSettings: (settings: any) =>
    fetch(`${API_URL}/settings`, { method: 'POST', headers: headers(), body: JSON.stringify(settings) }).then(r => r.json()),
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
