import CryptoJS from 'crypto-js';

export function encryptData<T>(data: T, password: string): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
}

export function decryptData<T>(encrypted: string, password: string): T {
  const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
  if (!decrypted) {
    throw new Error('Invalid password');
  }
  return JSON.parse(decrypted) as T;
}

export function clearSecureItem(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function getSecureItem<T>(key: string, password: string): T | null {
  if (typeof window === 'undefined') return null;
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  try {
    return decryptData<T>(encrypted, password);
  } catch {
    throw new Error('Unable to decrypt data');
  }
}

export function setSecureItem<T>(key: string, data: T, password: string) {
  if (typeof window === 'undefined') return;
  const encrypted = encryptData<T>(data, password);
  localStorage.setItem(key, encrypted);
}
