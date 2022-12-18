import * as React from 'react';
import { LegacySettings } from './LegacySettings';
import AvaPlugin from './main';
import PricingSection from './PricingSection';

export const CustomSettings = ({ plugin }: { plugin: AvaPlugin }) => {
  return (
    <div>
      <LegacySettings plugin={plugin} />
      <PricingSection />
    </div>
  );
};
