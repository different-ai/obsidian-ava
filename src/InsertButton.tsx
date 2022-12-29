import { Editor } from 'obsidian';
import * as React from 'react';
import { PrimaryButton } from './Button';

export const InsertButton = ({
  editorContext,
  text,
}: {
  editorContext: Editor;
  text: string;
}) => {
  const handleReplace = () => {
    editorContext.replaceSelection(text);
  };
  return <PrimaryButton onClick={handleReplace}>Insert</PrimaryButton>;
};
