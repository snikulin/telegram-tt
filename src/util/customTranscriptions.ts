import { MAIN_IDB_STORE } from './browser/idb';

const CUSTOM_TRANSCRIPTIONS_KEY = 'custom-transcriptions';

export interface CustomTranscription {
  messageId: number;
  chatId: string;
  text: string;
  createdAt: number;
}

function getKey(chatId: string, messageId: number): string {
  return `${chatId}:${messageId}`;
}

export async function saveCustomTranscription(
  chatId: string,
  messageId: number,
  text: string,
): Promise<void> {
  const existing = await MAIN_IDB_STORE.get<Record<string, CustomTranscription>>(CUSTOM_TRANSCRIPTIONS_KEY);
  const transcriptions = existing || {};
  const key = getKey(chatId, messageId);
  transcriptions[key] = {
    messageId,
    chatId,
    text,
    createdAt: Date.now(),
  };
  await MAIN_IDB_STORE.set(CUSTOM_TRANSCRIPTIONS_KEY, transcriptions);
}

export async function loadCustomTranscriptions(): Promise<Record<string, CustomTranscription>> {
  const transcriptions = await MAIN_IDB_STORE.get<Record<string, CustomTranscription>>(CUSTOM_TRANSCRIPTIONS_KEY);
  return transcriptions || {};
}

export async function getCustomTranscription(
  chatId: string,
  messageId: number,
): Promise<CustomTranscription | undefined> {
  const transcriptions = await loadCustomTranscriptions();
  const key = getKey(chatId, messageId);
  return transcriptions[key];
}

export async function deleteCustomTranscription(chatId: string, messageId: number): Promise<void> {
  const existing = await MAIN_IDB_STORE.get<Record<string, CustomTranscription>>(CUSTOM_TRANSCRIPTIONS_KEY);
  if (existing) {
    const key = getKey(chatId, messageId);
    delete existing[key];
    await MAIN_IDB_STORE.set(CUSTOM_TRANSCRIPTIONS_KEY, existing);
  }
}

export async function clearCustomTranscriptions(): Promise<void> {
  await MAIN_IDB_STORE.del(CUSTOM_TRANSCRIPTIONS_KEY);
}
