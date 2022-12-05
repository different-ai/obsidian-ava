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
  TextField,
  Tooltip,
} from '@mui/material';
import CustomDivider from 'CustomerDivider';
import { Configuration, CreateCompletionRequest, OpenAIApi } from 'openai';
import * as React from 'react';
import AvaPlugin from './main';

export interface AvaSettings {
  openai: OpenAISettings;
  stableDiffusion: StableDiffusionSettings;
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
export interface StableDiffusionSettings {
  key: string;
}

export const DEFAULT_SETTINGS: AvaSettings = {
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
  stableDiffusion: {
    key: '',
  },
};

interface CustomSettingsProps {
  plugin: AvaPlugin;
}
export const CustomSettings = ({ plugin }: CustomSettingsProps) => {
  const [isLoading, setIsloading] = React.useState(false);
  const [openAiConfig, setOpenAiConfig] = React.useState<OpenAISettings>(
    plugin.settings.openai || DEFAULT_SETTINGS.openai
  );
  const [stableDiffusionConfig, setStableDiffusionConfig] =
    React.useState<StableDiffusionSettings>(
      plugin.settings.stableDiffusion || DEFAULT_SETTINGS.stableDiffusion
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
    openai
      .listModels()
      .then((models) =>
        setAvailableModels(models.data?.data?.map((m) => m.id!) || [])
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAiConfig?.key]);

  const onSave = async () => {
    setIsloading(true);

    await openai
      .listFiles()
      .then(() => {
        plugin.settings.openai = openAiConfig;
        plugin.settings.stableDiffusion = stableDiffusionConfig;
        return plugin.saveSettings();
      })
      .catch((e) => {
        console.error(e);
        setError('Invalid OpenAI API key');
      });
    setIsloading(false);
  };

  return (
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
      subheader={
        error ? (
          <Tooltip title={error}>
            <Error color="error" />
          </Tooltip>
        ) : (
          <Check color="success" />
        )
      }
    >
      <ListItem>
        <ListItemText primary="Settings" />
      </ListItem>
      <CustomDivider text="OpenAI" />
      <ListItem>
        <TextField
          variant="standard"
          label="OpenAI API Key"
          placeholder='sk-LS5Pgc9DaNlbholGwJu6N3BlbkFJD3hbVFYOgK9mxuNU3rOS'
          value={openAiConfig?.key}
          type={revealKey ? 'text' : 'password'}
          fullWidth
          InputProps={
            {
              disableUnderline: true,
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
          variant="standard"
          placeholder="org-L8pV8oipdXlb9M7xo1zGnLWi"
          label="OpenAI Organization ID"
          value={openAiConfig?.organization}
          color="primary"
          fullWidth
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

      <CustomDivider text="Stable diffusion" />
      <ListItem>
        <TextField
          variant="standard"
          label="Stable diffusion API key"
          placeholder=''
          value={stableDiffusionConfig?.key}
          type={revealKey ? 'text' : 'password'}
          color="primary"
          fullWidth
          InputProps={
            {
              disableUnderline: true,
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
            setStableDiffusionConfig({
              ...stableDiffusionConfig,
              key: e.target.value,
            });
          }}
        />
      </ListItem>
      <Divider />
      <ListItem
        sx={{
          textAlign: 'center',
        }}
      >
        <LoadingButton
          loading={isLoading}
          variant="contained"
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
    </List>
  );
};
