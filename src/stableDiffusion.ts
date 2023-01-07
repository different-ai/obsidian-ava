import fs from 'fs';
import path from 'path';
import { API_HOST, buildHeaders } from './constants';

export interface RequestImageCreate {
  // e.g. 512, 768, 1024
  size?: number;
  // e.g. 1, 2, 3, 4
  limit?: number;
  // e.g. "A group of Giraffes visiting a zoo on mars populated by humans"
  prompt: string;
  outputDir: string;
}

// curl -X POST "https://obsidian-ai.web.app/v1/image/create" -H "Content-Type: application/json" -d '{"size":512,"limit":1,"prompt":"A group of Giraffes visiting a zoo on mars populated by humans"}' > giraffes2.jpg

export interface ResponseImageCreate {
  imagePaths: string[];
}

/**
 * Create an image from a prompt
 * Only one image is supported at the moment
 * @param request
 * @returns
 */
export const createImage = async (
  request: RequestImageCreate,
  token: string,
  version: string
): Promise<ResponseImageCreate> => {
  const response = await fetch(`${API_HOST}/v1/image/create`, {
    method: 'POST',
    headers: buildHeaders(token, version),
    body: JSON.stringify({
      size: request.size || 512,
      limit: request.limit || 1,
      prompt: request.prompt,
    }),
  });

  if (response.status !== 200) {
    const data = await response.json();
    throw new Error(`Failed to create image: ${data.message};
    }`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // file name is "time"_"the prompt as a writable encoded path" (only keep alphanumeric and underscores)
  const encoded = request.prompt.replace(/[^a-zA-Z0-9_]/g, '_');
  // if it's too long, truncate it
  const truncated = encoded.length > 100 ? encoded.substring(0, 100) : encoded;
  const fileName = `${Date.now()}_${truncated}`;
  const filePath = path.resolve(
    path.join(request.outputDir, `${fileName}.jpg`)
  );

  fs.writeFileSync(filePath, buffer);

  return {
    imagePaths: [filePath],
  };
};
