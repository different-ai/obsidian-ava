import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import * as React from 'react';
import { SecondaryButton } from './Button';

export const CopyToClipboardButton = ({
  text,
  extraOnClick,
  small = false,
}: {
  text: string;
  extraOnClick?: (text: string) => void;
  small?: boolean;
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

  if (small) {
    return isCopied ? (
      <ClipboardDocumentCheckIcon height={14} />
    ) : (
      <ClipboardDocumentListIcon
        height={14}
        onClick={handleCopy}
        className="cursor-pointer"
      />
    );
  }

  return (
    <SecondaryButton onClick={handleCopy}>
      {isCopied && <ClipboardDocumentCheckIcon height={24} />}
      {isCopied && <span>Copied!</span>}
      {!isCopied && <ClipboardDocumentListIcon height={24} />}
      {!isCopied && <span>Copy</span>}
    </SecondaryButton>
  );
};
