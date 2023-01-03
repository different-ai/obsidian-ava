import { Editor } from 'obsidian';
import * as React from 'react';
import { PrimaryButton } from './Button';

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
  return <PrimaryButton onClick={handleReplace}>Insert</PrimaryButton>;
};
