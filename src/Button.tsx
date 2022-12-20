import * as React from 'react';
import { ButtonProps } from './AvaComponent';

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => (
  <button
    className="mod-cta cursor-pointer"
    disabled={props.disabled}
    onClick={props.onClick}
    {...props}
  >
    {children}
  </button>
);
