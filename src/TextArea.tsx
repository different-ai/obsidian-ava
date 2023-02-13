import * as React from 'react';
import { forwardRef } from 'react';

const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

export const TextArea = forwardRef(function Input(
  { className, type = 'text', ...args }: any,
  ref
) {
  return (
    <textarea
      rows={6}
      type={type}
      className={classNames(
        'block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border',
        className
      )}
      ref={ref}
      {...args}
    />
  );
});

export const Label = ({ className, children, optional = false }: any) => (
  <div className="flex justify-between">
    <label
      className={classNames(
        'block pb-1 text-sm font-medium text-gray-700',
        className
      )}
    >
      {children}
    </label>
    {optional && <span className="text-sm text-gray-500">Optional</span>}
  </div>
);
