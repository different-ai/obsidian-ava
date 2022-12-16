import * as React from 'react';
/* This example requires Tailwind CSS v3.0+ */
import { CheckIcon } from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

const tiers = [
  {
    id: 'tier-hobby',
    name: 'Hobby',
    href: 'https://ben915475.typeform.com/to/dGhx3R8I',
    onClick: () => posthog.capture('hobby'),
    priceMonthly: 12.99,
    description: 'For those who want to take their writing to the next level.',
    features: [
      'Access to powerful AI technology',
      'Generate and rewrite 2000 paragraphs',
      'Generate 100 pictures',
    ],
  },
  {
    id: 'tier-pro',
    name: 'Pro',
    href: 'https://ben915475.typeform.com/to/dGhx3R8I',
    onClick: () => posthog.capture('pro'),
    priceMonthly: 18.99,
    description: 'For serious writers and bloggers.',
    features: [
      'Access to advanced AI technology',
      'Generate and rewrite 5000 paragraphs',
      'Generate 500 blog posts',
      'Generate 4000 pictures',
    ],
  },
];

export default function PricingSection() {
  return (
    <div className="bg-gray-900">
      <div className="relative overflow-hidden pt-32 pb-96 lg:pt-40">
        <div>
          <img
            className="absolute bottom-0 left-1/2 w-[1440px] max-w-none -translate-x-1/2"
            src="https://tailwindui.com/img/component-images/grid-blur-purple-on-black.jpg"
            alt=""
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-4xl">
            <h2 className="text-lg font-semibold leading-8 text-indigo-400">
              Pricing
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-white">
              Introducing Obsidian AI, the ultimate tool for content creation
            </p>
            <p className="mt-6 text-lg leading-8 text-white/60">
              Get the hosted version. No Config. No Hassle.
            </p>
          </div>
        </div>
      </div>
      <div className="flow-root bg-white pb-32 lg:pb-40">
        <div className="relative -mt-80">
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:max-w-4xl lg:grid-cols-2 lg:gap-8">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className="flex flex-col rounded-3xl bg-white shadow-xl ring-1 ring-black/10"
                >
                  <div className="p-8 sm:p-10">
                    <h3
                      className="text-lg font-semibold leading-8 tracking-tight text-indigo-600"
                      id={tier.id}
                    >
                      {tier.name}
                    </h3>
                    <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-gray-900">
                      ${tier.priceMonthly}
                      <span className="text-lg font-semibold leading-8 tracking-normal text-gray-500">
                        /mo
                      </span>
                    </div>
                    <p className="mt-6 text-base leading-7 text-gray-600">
                      {tier.description}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col p-2">
                    <div className="flex flex-1 flex-col justify-between rounded-2xl bg-gray-50 p-6 sm:p-8">
                      <ul role="list" className="space-y-6">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <div className="flex-shrink-0">
                              <CheckIcon
                                className="h-6 w-6 text-indigo-600"
                                aria-hidden="true"
                              />
                            </div>
                            <p className="ml-3 text-sm leading-6 text-gray-600">
                              {feature}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-8">
                        <a
                          onClick={tier.onClick}
                          href={tier.href}
                          className="inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold leading-5 text-white shadow-md hover:bg-indigo-700"
                          aria-describedby={tier.id}
                        >
                          Get started today
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
