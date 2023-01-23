import { Editor } from 'obsidian';
import * as React from 'react';
import { SecondaryButton } from './Button';

export const InsertButton = ({
  editorContext,
  text,
  extraOnClick,
  disabled,
}: {
  editorContext: Editor;
  text: string;
  extraOnClick?: (text: string) => void;
  disabled: boolean;
}) => {
  const handleReplace = () => {
    editorContext.replaceSelection(text);
    extraOnClick?.(text);
  };
  return (
    <SecondaryButton disabled={disabled} onClick={handleReplace}>
      Insert
    </SecondaryButton>
  );
};
