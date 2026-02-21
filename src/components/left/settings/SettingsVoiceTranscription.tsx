import {
  memo,
  useState,
} from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { AccountSettings, TranscriptionSource } from '../../../types';

import useHistoryBack from '../../../hooks/useHistoryBack';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import Checkbox from '../../ui/Checkbox';
import InputText from '../../ui/InputText';
import RadioGroup from '../../ui/RadioGroup';

import styles from './SettingsVoiceTranscription.module.scss';

type OwnProps = {
  isActive?: boolean;
  onReset: () => void;
};

type StateProps = Pick<AccountSettings, 'shouldUseCustomStt' | 'customSttServerUrl' | 'transcriptionSource'> & {
  isPremium: boolean;
};

const SettingsVoiceTranscription = ({
  isActive,
  shouldUseCustomStt,
  customSttServerUrl,
  transcriptionSource,
  isPremium,
  onReset,
}: OwnProps & StateProps) => {
  const { setSettingOption } = getActions();

  const lang = useLang();

  const [urlError, setUrlError] = useState<string | undefined>();

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  useHistoryBack({
    isActive,
    onBack: onReset,
  });

  const handleUseCustomSttChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSettingOption({
      shouldUseCustomStt: checked,
      transcriptionSource: checked ? 'custom' : 'telegram',
    });
  });

  const handleServerUrlChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    if (url && !validateUrl(url)) {
      setUrlError(lang('InvalidUrl'));
    } else {
      setUrlError(undefined);
    }
    setSettingOption({
      customSttServerUrl: url,
    });
  });

  const handleTranscriptionSourceChange = useLastCallback((value: string) => {
    setSettingOption({
      transcriptionSource: value as TranscriptionSource,
    });
  });

  const radioOptions = [
    { value: 'custom', label: lang('CustomStt') },
  ];

  if (isPremium) {
    radioOptions.push({ value: 'telegram', label: lang('TelegramPremium') });
  }

  return (
    <div className="settings-content custom-scroll">
      <div className="settings-section">
        <div className="settings-item">
          <div className="settings-item__content">
            <div className="settings-item__title">
              {lang('UseCustomStt')}
            </div>
            <div className="settings-item__subtitle">
              {lang('UseCustomSttDescription')}
            </div>
          </div>
          <Checkbox
            name="shouldUseCustomStt"
            checked={shouldUseCustomStt}
            onChange={handleUseCustomSttChange}
          />
        </div>

        {shouldUseCustomStt && (
          <>
            <div className="settings-item">
              <div className="settings-item__content">
                <div className="settings-item__title">
                  {lang('SttServerUrl')}
                </div>
              </div>
            </div>
            <div className={styles.inputWrapper}>
              <InputText
                value={customSttServerUrl}
                onChange={handleServerUrlChange}
                placeholder="http://localhost:8009"
                error={urlError}
              />
            </div>
          </>
        )}
      </div>

      {(shouldUseCustomStt || isPremium) && (
        <div className="settings-section">
          <div className="settings-item">
            <div className="settings-item__content">
              <div className="settings-item__title">
                {lang('TranscriptionSource')}
              </div>
            </div>
          </div>
          <RadioGroup
            name="transcriptionSource"
            options={radioOptions}
            selected={transcriptionSource}
            onChange={handleTranscriptionSourceChange}
          />
        </div>
      )}
    </div>
  );
};

export default memo(withGlobal<OwnProps>((global): StateProps => {
  const { shouldUseCustomStt, customSttServerUrl, transcriptionSource } = global.settings.byKey;
  const isPremium = global.users.byId[global.currentUserId!]?.isPremium ?? false;

  return {
    shouldUseCustomStt,
    customSttServerUrl,
    transcriptionSource,
    isPremium,
  };
})(SettingsVoiceTranscription));
