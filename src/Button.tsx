import * as React from 'react';
import { ButtonProps } from './WriteComponent';

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  className,
  ...props
}) => (
  <button
    className={`mod-cta cursor-pointer ${className}`}
    disabled={props.disabled}
    onClick={props.onClick}
    {...props}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  ...props
}) => (
  <button
    className={`${props.disabled ? 'opacity-50' : 'cursor-pointer'}`}
    disabled={props.disabled}
    onClick={props.onClick}
    {...props}
  >
    {children}
  </button>
);
