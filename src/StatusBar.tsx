/* eslint-disable require-jsdoc */
import { Check, Clear, Error, Warning } from '@mui/icons-material';
import { CircularProgress, Tooltip } from '@mui/material';

import React from 'react';

interface StatusBarProps {
  status: 'success' | 'error' | 'loading' | 'disabled' | 'warning';
  statusMessage?: string;
}

export const StatusBar = ({ status, statusMessage }: StatusBarProps) => {
  return (
    <Tooltip title={statusMessage || ''}>
      {status === 'success' ? (
        <Check fontSize="small" />
      ) : status === 'error' ? (
        <Error />
      ) : status === 'loading' ? (
        <CircularProgress size="24px" />
      ) : status === 'disabled' ? (
        <Clear fontSize="small" />
      ) : status === 'warning' ? (
        <Warning fontSize="small" />
      ) : (
        <></>
      )}
    </Tooltip>
  );
};
