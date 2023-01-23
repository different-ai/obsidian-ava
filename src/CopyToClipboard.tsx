import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import * as React from 'react';
import { SecondaryButton } from './Button';

export const CopyToClipboardButton = ({
  text,
  extraOnClick,
  disabled,
}: {
  text: string;
  extraOnClick?: (text: string) => void;
  disabled: boolean;
}) => {
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    if (isCopied === false) return;
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [isCopied, setIsCopied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    extraOnClick?.(text);
    setIsCopied(true);
  };

  return (
    <SecondaryButton disabled={disabled} onClick={handleCopy}>
      {isCopied && <ClipboardDocumentCheckIcon height={24} />}
      {isCopied && <span>Copied!</span>}
      {!isCopied && <ClipboardDocumentListIcon height={24} />}
      {!isCopied && <span>Copy</span>}
    </SecondaryButton>
  );
};
