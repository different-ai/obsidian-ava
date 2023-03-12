// TODO: firebase hosting custom domain name does not work with SSE somehow?
export const API_HOST = process.env.API_HOST || "https://obsidian-ai-c6txy76x2q-uc.a.run.app";

export const buildHeaders = (token: string, version: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-Version': version,
});


export const feedbackUrl = 'https://forms.gle/RZLR4umCwCFpZcNE9';

export const creditsText = `Ava started as a weekend project by Ben & Louis as a mean to solve multiple problems related to having a large quantity of disparate notes. 
We are very grateful for your support and feedback.`

export const feedbackText = `Thank you for using Ava! We would love to hear your feedback.
Please fill out this form to send us your feedback.`;

export const calText = 'Feel free to schedule a call with us';
export const calUrl = 'https://cal.com/potato/20min';

// a nice svg looking like a wizard hat
export const iconAva = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_11_13)">
<path d="M126.5 64C126.5 98.5178 98.5178 126.5 64 126.5C29.4822 126.5 1.5 98.5178 1.5 64C1.5 29.4822 29.4822 1.5 64 1.5C98.5178 1.5 126.5 29.4822 126.5 64Z" stroke="currentColor" stroke-width="8"/>
<path d="M121.5 63.5C121.5 69.6612 118.037 75.3756 112.165 79.6072C106.294 83.8372 98.1093 86.5 89 86.5C79.8907 86.5 71.7055 83.8372 65.8353 79.6072C59.9629 75.3756 56.5 69.6612 56.5 63.5C56.5 57.3388 59.9629 51.6244 65.8353 47.3928C71.7055 43.1628 79.8907 40.5 89 40.5C98.1093 40.5 106.294 43.1628 112.165 47.3928C118.037 51.6244 121.5 57.3388 121.5 63.5Z" stroke="currentColor" stroke-width="8"/>
</g>
<defs>
<clipPath id="clip0_11_13">
<rect width="100" height="100" fill="white"/>
</clipPath>
</defs>
</svg>
`;
