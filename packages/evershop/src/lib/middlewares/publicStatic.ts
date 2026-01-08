import fs from 'fs/promises';
import { join } from 'path';
import staticMiddleware from 'serve-static';
import { EvershopRequest, EvershopResponse } from '../../types/index.js';
import { CONSTANTS } from '../helpers.js';

export default async function publicStatic(
  request: EvershopRequest,
  response: EvershopResponse,
  next
) {
  // Get the request path
  const { path } = request;
  try {
    if (!path.includes('.')) {
      throw new Error('No file extension');
    }
    // Asynchoronously check if the path is a file and exists in the public folder
    const test = await fs.stat(join(CONSTANTS.ROOTPATH, 'public', path));
    if (test.isFile()) {
      // If it is a file, serve it
      staticMiddleware(join(CONSTANTS.ROOTPATH, 'public'))(
        request,
        response,
        next
      );
    }
  } catch (e) {
    // Fallback: If image not found in public/assets, try to find by filename in media/
    if (path.startsWith('/assets/')) {
      const filename = path.split('/').pop();
      // Search recursively in media folder
      async function findFile(dir, name) {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          if (file.isDirectory()) {
            const found = await findFile(join(dir, file.name), name);
            if (found) return found;
          } else if (file.name === name) {
            return join(dir, file.name);
          }
        }
        return null;
      }

      try {
        const mediaPath = join(CONSTANTS.ROOTPATH, 'media');
        const foundPath = await findFile(mediaPath, filename);

        if (foundPath) {
          return response.sendFile(foundPath);
        }
      } catch (err) {
        // media folder might not exist or other error, just ignore
      }
    }

    // Fallback for fonts (e.g., slick.woff from node_modules)
    if (path.includes('/fonts/') && /\.(woff|woff2|ttf|eot)$/i.test(path)) {
      const filename = path.split('/').pop();
      try {
        // Try to find in node_modules
        const nodeModulesPath = join(CONSTANTS.ROOTPATH, 'node_modules');
        async function findFont(dir, name, depth = 0) {
          if (depth > 4) return null; // Limit recursion depth
          try {
            const files = await fs.readdir(dir, { withFileTypes: true });
            for (const file of files) {
              if (file.isDirectory() && !file.name.startsWith('.')) {
                const found = await findFont(join(dir, file.name), name, depth + 1);
                if (found) return found;
              } else if (file.name === name) {
                return join(dir, file.name);
              }
            }
          } catch {
            // Ignore errors
          }
          return null;
        }

        const foundFont = await findFont(nodeModulesPath, filename);
        if (foundFont) {
          return response.sendFile(foundFont);
        }
      } catch (err) {
        // Ignore
      }
    }

    // If the path is not a file or does not exist in the public folder, call next
    next();
  }
}
