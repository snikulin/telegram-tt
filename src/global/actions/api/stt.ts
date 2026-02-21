import { addActionHandler, getGlobal, setGlobal, getActions } from '../../../global';

import type { ApiTranscription } from '../../../api/types/messages';
import { ApiMediaFormat } from '../../../api/types';

import { getMediaHash } from '../../../global/helpers';
import { updateChatMessage } from '../../../global/reducers';
import { selectChat, selectChatMessage } from '../../../global/selectors';
import {
  saveCustomTranscription,
} from '../../../util/customTranscriptions';
import * as mediaLoader from '../../../util/mediaLoader';
import {
  checkSttHealth,
  createTranscriptionJob,
  pollTranscriptionResult,
} from '../../../api/stt';

addActionHandler('transcribeAudioWithCustomStt', async (global, actions, payload): Promise<void> => {
  const { messageId, chatId } = payload;

  const chat = selectChat(global, chatId);
  const message = selectChatMessage(global, chatId, messageId);

  if (!chat || !message || !message.content.voice) return;

  const { shouldUseCustomStt, customSttServerUrl, transcriptionSource } = global.settings.byKey;

  if (!shouldUseCustomStt || transcriptionSource !== 'custom') return;

  const voice = message.content.voice;

  const mediaHash = getMediaHash(voice, 'inline');

  const health = await checkSttHealth(customSttServerUrl);
  global = getGlobal();

  if (!health || !health.model_ready) {
    global = updateChatMessage(global, chatId, messageId, {
      transcriptionId: '',
      isTranscriptionError: true,
    });
    setGlobal(global);
    getActions().showNotification({ message: { key: 'CustomSttTranscriptionFailed' } });
    return;
  }

  // Add pending transcription entry to show loading indicator
  const pendingTranscriptionId = `custom-stt-${chatId}-${messageId}`;
  const pendingTranscription: ApiTranscription = {
    text: '',
    isPending: true,
    transcriptionId: pendingTranscriptionId,
  };
  global = {
    ...global,
    transcriptions: {
      ...global.transcriptions,
      [pendingTranscriptionId]: pendingTranscription,
    },
  };
  global = updateChatMessage(global, chatId, messageId, {
    transcriptionId: pendingTranscriptionId,
  });
  setGlobal(global);

  let blob: Blob | undefined;
  let blobUrl: string | undefined;

  // Get the blob URL from media loader, then fetch actual blob data
  if (mediaHash) {
    try {
      // This triggers the download and returns a blob URL
      blobUrl = await mediaLoader.fetch(mediaHash, ApiMediaFormat.BlobUrl);
      // Fetch actual blob data from the URL
      if (blobUrl) {
        const response = await fetch(blobUrl);
        blob = await response.blob();
      }
    } catch {
      // Failed to download audio
    }
  }

  // Update global after await
  global = getGlobal();

  if (!blob) {
    // Cleanup blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    // Remove pending entry on error
    if (pendingTranscriptionId in global.transcriptions) {
      const { [pendingTranscriptionId]: _, ...restTranscriptions } = global.transcriptions;
      global = {
        ...global,
        transcriptions: restTranscriptions,
      };
    } else {
      global = {
        ...global,
        transcriptions: { ...global.transcriptions },
      };
    }
    global = updateChatMessage(global, chatId, messageId, {
      transcriptionId: '',
      isTranscriptionError: true,
    });
    setGlobal(global);
    getActions().showNotification({ message: { key: 'CustomSttTranscriptionFailed' } });
    return;
  }

  // Send OGG directly to STT server
  const job = await createTranscriptionJob(customSttServerUrl, blob);

  // Cleanup blob URL after use
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }

  // Update global after await
  global = getGlobal();

  if (!job) {
    // Remove pending entry on error
    if (pendingTranscriptionId in global.transcriptions) {
      const { [pendingTranscriptionId]: _, ...restTranscriptions } = global.transcriptions;
      global = {
        ...global,
        transcriptions: restTranscriptions,
      };
    } else {
      global = {
        ...global,
        transcriptions: { ...global.transcriptions },
      };
    }
    global = updateChatMessage(global, chatId, messageId, {
      transcriptionId: '',
      isTranscriptionError: true,
    });
    setGlobal(global);
    getActions().showNotification({ message: { key: 'CustomSttTranscriptionFailed' } });
    return;
  }

  const result = await pollTranscriptionResult(customSttServerUrl, job.id);

  global = getGlobal();

  if (!result || result.status === 'error') {
    // Remove pending entry on error
    if (pendingTranscriptionId in global.transcriptions) {
      const { [pendingTranscriptionId]: _, ...restTranscriptions } = global.transcriptions;
      global = {
        ...global,
        transcriptions: restTranscriptions,
      };
    } else {
      global = {
        ...global,
        transcriptions: { ...global.transcriptions },
      };
    }
    global = updateChatMessage(global, chatId, messageId, {
      transcriptionId: '',
      isTranscriptionError: true,
    });
    setGlobal(global);
    getActions().showNotification({ message: { key: 'CustomSttTranscriptionFailed' } });
    return;
  }

  // Save to persistent storage
  await saveCustomTranscription(chatId, messageId, result.text || '');

  // Update global after await
  global = getGlobal();

  // Update pending transcription with actual result
  const finalTranscription: ApiTranscription = {
    text: result.text || '',
    transcriptionId: pendingTranscriptionId,
  };

  global = {
    ...global,
    transcriptions: {
      ...global.transcriptions,
      [pendingTranscriptionId]: finalTranscription,
    },
  };

  global = updateChatMessage(global, chatId, messageId, {
    transcriptionId: pendingTranscriptionId,
    isTranscriptionError: false,
  });

  setGlobal(global);
});
