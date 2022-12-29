import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import * as React from 'react';
import { PrimaryButton } from './Button';

export const CopyToClipboardButton = ({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    if (isCopied === false) return;
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [isCopied, setIsCopied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
  };

  return (
    <PrimaryButton onClick={handleCopy}>
      {isCopied && <ClipboardDocumentCheckIcon height={24} />}
      {isCopied && <span>Copied!</span>}
      {!isCopied && <ClipboardDocumentListIcon height={24} />}
      {!isCopied && <span>Copy</span>}
    </PrimaryButton>
  );
};
