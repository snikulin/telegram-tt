import type { GlobalState } from '../global/types';

import { IS_MOCKED_CLIENT } from '../config';
import { loadCache, loadCachedSharedState } from '../global/cache';
import {
  getGlobal, setGlobal,
} from '../global/index';
import { INITIAL_GLOBAL_STATE } from '../global/initialState';
import { updatePasscodeSettings } from '../global/reducers';
import { loadCustomTranscriptions } from './customTranscriptions';
import { cloneDeep } from './iteratees';
import { clearStoredSession } from './sessions';

export async function initGlobal(force: boolean = false, prevGlobal?: GlobalState) {
  prevGlobal = prevGlobal || getGlobal();
  if (!force && 'byTabId' in prevGlobal) {
    return;
  }

  const initial = cloneDeep(INITIAL_GLOBAL_STATE);
  const cache = await loadCache(initial);
  let global = cache || initial;
  if (IS_MOCKED_CLIENT) global.auth.state = 'authorizationStateReady';

  const { hasPasscode, isScreenLocked } = global.passcode;
  if (hasPasscode && !isScreenLocked) {
    global = updatePasscodeSettings(global, {
      isScreenLocked: true,
    });

    clearStoredSession();
  }

  if (force) {
    global.byTabId = prevGlobal.byTabId;
  }

  if (!cache) { // Try loading shared state separately
    const storedSharedState = await loadCachedSharedState();
    if (storedSharedState) {
      global.sharedState = storedSharedState;
    }
  }

  // Load custom transcriptions before setting global
  const customTranscriptions = await loadCustomTranscriptions();
  if (Object.keys(customTranscriptions).length > 0) {
    Object.values(customTranscriptions).forEach((t) => {
      const transcriptionId = `custom-stt-${t.chatId}-${t.messageId}`;
      global.transcriptions[transcriptionId] = {
        text: t.text,
        transcriptionId,
      };
    });
  }

  setGlobal(global);
}
