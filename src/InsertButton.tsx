import { Editor } from 'obsidian';
import * as React from 'react';
import { SecondaryButton } from './Button';

export const InsertButton = ({
  editorContext,
  text,
  extraOnClick,
}: {
  editorContext: Editor;
  text: string;
  extraOnClick?: (text: string) => void;
}) => {
  const handleReplace = () => {
    editorContext.replaceSelection(text);
    extraOnClick?.(text);
  };
  return <SecondaryButton onClick={handleReplace}>Insert</SecondaryButton>;
};
