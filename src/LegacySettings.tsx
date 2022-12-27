import {
  Check,
  Error,
  ExpandLess,
  ExpandMore,
  Settings,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  OutlinedInputProps,
  Select,
  Slider,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai';
import { posthog } from 'posthog-js';
import * as React from 'react';
import CustomDivider from './CustomerDivider';
import AvaPlugin from './main';

export interface AvaSettings {
  debug: boolean;
  openai: OpenAISettings;
  token: string;
}
type CompletionConfig = Omit<
  CreateCompletionRequest,
  'prompt' | 'stream' | 'echo'
>;
export interface OpenAISettings {
  promptLines: number;
  automatic: boolean;
  key: string;
  completionsConfig: CompletionConfig;
  organization?: string;
}

export const DEFAULT_SETTINGS: AvaSettings = {
  debug: false,
  openai: {
    promptLines: 5,
    automatic: false,
    key: '',
    completionsConfig: {
      model: 'code-davinci-002',
      stop: ['\n'],
      max_tokens: 100,
      temperature: 0.7,
    },
    organization: '',
  },
  token: '',
};

interface CustomSettingsProps {
  plugin: AvaPlugin;
}
export const LegacySettings = ({ plugin }: CustomSettingsProps) => {
  const [isLoading, setIsloading] = React.useState(false);
  const [openAiConfig, setOpenAiConfig] = React.useState<OpenAISettings>(
    plugin.settings.openai || DEFAULT_SETTINGS.openai
  );
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [revealKey, setRevealKey] = React.useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = React.useState(false);
  const [availableModels, setAvailableModels] = React.useState<string[]>([]);
  const configuration = new Configuration({
    apiKey: openAiConfig?.key,
    organization: openAiConfig?.organization,
  });
  const openai = new OpenAIApi(configuration);

  React.useEffect(() => {
    // don't call the API if the key is not fully typed
    if (openAiConfig?.key?.length < 50) return;

    openai
      .listModels()
      .then((models) =>
        setAvailableModels(models.data?.data?.map((m) => m.id!) || [])
      );
  }, [openAiConfig?.key]);

  const onSave = async () => {
    setIsloading(true);

    await openai
      .listFiles()
      .then(() => {
        plugin.settings.openai = openAiConfig;
      })
      .catch((e) => {
        console.error(e);
        setError('Invalid OpenAI API key');
      });
    setIsloading(false);
  };

  return (
    <>
      <List
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          // all child width are 100%
          '& > *': {
            width: '100%',
          },
        }}
      >
        <ListItem>
          <ListItemText primary="Settings" />
        </ListItem>
        <CustomDivider text="OpenAI" />
        <ListItem>
          <TextField
            label="OpenAI API Key"
            placeholder="sk-LS5Pgc9DaNlbholGwJu6N3BlbkFJD3hbVFYOgK9mxuNU3rOS"
            value={openAiConfig?.key}
            type={revealKey ? 'text' : 'password'}
            style={{ border: 'none' }}
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                border: 'none',
              },
              '& .MuiInputBase-root': {
                minHeight: '3rem',
              },
            }}
            InputProps={
              {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setRevealKey(!revealKey)}>
                      {revealKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              } as Partial<OutlinedInputProps>
            }
            onChange={(e) => {
              setOpenAiConfig({
                ...openAiConfig,
                key: e.target.value,
              });
            }}
          />
        </ListItem>
        <ListItem>
          <TextField
            placeholder="org-L8pV8oipdXlb9M7xo1zGnLWi"
            label="OpenAI Organization ID"
            value={openAiConfig?.organization}
            color="primary"
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                border: 'none',
              },
              '& .MuiInputBase-root': {
                minHeight: '3rem',
              },
            }}
            onChange={(e) => {
              setOpenAiConfig({
                ...openAiConfig,
                organization: e.target.value,
              });
            }}
          />
        </ListItem>
        <ListItemButton
          onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
        >
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Advanced settings" />
          {advancedSettingsOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse
          in={advancedSettingsOpen}
          timeout="auto"
          unmountOnExit
          sx={{
            width: '100%',
          }}
        >
          <List
            component="div"
            disablePadding
            sx={{
              width: '100%',
            }}
          >
            <ListItem>
              <FormControl fullWidth>
                <InputLabel id="model">Model</InputLabel>
                <Select
                  fullWidth
                  labelId="model"
                  id="demo-simple-select"
                  value={
                    openAiConfig?.completionsConfig?.model || 'text-davinci-003'
                  }
                  label="Model"
                  onChange={(e) =>
                    setOpenAiConfig({
                      ...openAiConfig,
                      completionsConfig: {
                        ...openAiConfig?.completionsConfig,
                        model: e.target.value,
                      },
                    })
                  }
                >
                  {availableModels.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItem>
            <ListItem>
              <Autocomplete
                fullWidth
                freeSolo
                multiple
                id="stops-outlined"
                options={
                  openAiConfig?.completionsConfig?.stop
                    ? [...openAiConfig!.completionsConfig!.stop!].map((s) => s)
                    : ['\n']
                }
                getOptionLabel={(option) => option}
                value={
                  openAiConfig?.completionsConfig?.stop
                    ? [...openAiConfig!.completionsConfig!.stop!].map((s) => s)
                    : []
                }
                filterSelectedOptions
                popupIcon={<></>}
                onChange={(e, value) => {
                  if (value.length > 3) return;
                  setOpenAiConfig({
                    ...openAiConfig,
                    completionsConfig: {
                      ...openAiConfig?.completionsConfig,
                      stop: value,
                    },
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Stops"
                    placeholder="stop"
                    error={
                      openAiConfig.completionsConfig?.stop &&
                      openAiConfig.completionsConfig!.stop!.length > 3
                        ? true
                        : false
                    }
                    helperText={
                      openAiConfig.completionsConfig?.stop &&
                      openAiConfig.completionsConfig!.stop!.length >= 3
                        ? 'Maximum stops reached'
                        : ''
                    }
                  />
                )}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Max tokens"
                sx={{
                  marginRight: '1rem',
                }}
              />
              <Slider
                value={openAiConfig?.completionsConfig?.max_tokens || 100}
                onChange={(e, value) =>
                  setOpenAiConfig({
                    ...openAiConfig,
                    completionsConfig: {
                      ...openAiConfig?.completionsConfig,
                      max_tokens: value as number,
                    },
                  })
                }
                step={1}
                marks
                min={1}
                max={8000}
                valueLabelDisplay="auto"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Temperature"
                sx={{
                  marginRight: '1rem',
                }}
              />
              <Slider
                value={openAiConfig?.completionsConfig?.temperature || 0.7}
                onChange={(e, value) =>
                  setOpenAiConfig({
                    ...openAiConfig,
                    completionsConfig: {
                      ...openAiConfig?.completionsConfig,
                      temperature: value as number,
                    },
                  })
                }
                step={0.1}
                marks
                min={0}
                max={1}
                valueLabelDisplay="auto"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Prompt lines"
                sx={{
                  marginRight: '1rem',
                }}
              />
              <Slider
                value={openAiConfig?.promptLines || 5}
                onChange={(e, value) =>
                  setOpenAiConfig({
                    ...openAiConfig,
                    promptLines: value as number,
                  })
                }
                step={1}
                marks
                min={1}
                max={50}
                valueLabelDisplay="auto"
              />
            </ListItem>
          </List>
        </Collapse>
        <Divider />
        <ListItem
          sx={{
            textAlign: 'center',
          }}
        >
          <LoadingButton
            loading={isLoading}
            onClick={onSave}
            color="primary"
            sx={{
              '& > .MuiLoadingButton-loadingIndicator': {
                color: 'primary.main',
              },
            }}
          >
            Save
          </LoadingButton>
        </ListItem>
        {error ? (
          <Tooltip title={error}>
            <Error color="error" />
          </Tooltip>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0rem',
              padding: '16px',
            }}
          >
            Valid Configuration
            <Check color="success" />
          </div>
        )}
        {plugin.settings.debug && (
          <div className="text-red-500 ava-bg-yellow-500">test</div>
        )}
      </List>
    </>
  );
};
export function AdvancedSettings({ plugin }: { plugin: AvaPlugin }) {
  const [isDebug, setDebug] = React.useState(plugin.settings.debug);

  const handleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    plugin.settings.debug = checked;
    plugin.saveSettings();
    setDebug(checked);
    checked && posthog.opt_out_capturing();
  };

  return (
    <ListItem disablePadding>
      <Switch
        checked={isDebug}
        onChange={handleDebug}
        inputProps={{ 'aria-labelledby': 'debug' }}
      />
      <ListItemText
        id="debug"
        primary="Debug"
        secondary="Requires Force Reload"
      />
    </ListItem>
  );
}
