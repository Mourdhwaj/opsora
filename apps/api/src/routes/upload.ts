import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { createWriteStream, readFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export async function uploadRoutes(app: FastifyInstance) {
  // Ensure uploads directory exists
  await mkdir(UPLOADS_DIR, { recursive: true });

  app.post('/upload', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const ext = data.filename.split('.').pop() || 'bin';
    const allowedExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'];
    if (!allowedExts.includes(ext.toLowerCase())) {
      return reply.status(400).send({ error: `File type .${ext} is not allowed. Supported: ${allowedExts.join(', ')}` });
    }

    const fileId = randomUUID();
    const safeFilename = `${fileId}.${ext}`;
    const filePath = join(UPLOADS_DIR, safeFilename);

    const writeStream = createWriteStream(filePath);
    await new Promise<void>((resolve, reject) => {
      data.file.on('error', reject);
      data.file.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const url = `/uploads/${safeFilename}`;
    return reply.send({ url, filename: data.filename });
  });

  // Serve uploaded files (manual file reading since @fastify/static is not registered)
  app.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    // Basic sanitization — no path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'File not found' });
    }
    const buffer = readFileSync(filePath);
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
    };
    reply.header('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.send(buffer);
  });
}
