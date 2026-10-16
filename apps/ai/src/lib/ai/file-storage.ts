import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * 知识库原文件的本地落盘 / 读取 / 删除。
 *
 * 存储结构：{UPLOADS_DIR}/{userId}/{uuid}.{ext}
 * - 不存 public/，避免 Next 静态缓存 + 鉴权不可控
 * - 通过 /api/knowledge/documents/[id]/download 路由鉴权后流式返回
 * - filePath 字段存相对 uploads 根的路径，DB 不存绝对路径便于迁移
 */

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/** 从文件名提取扩展名（小写，带点），无扩展名返回空串 */
export function extOf(fileName: string): string {
  const m = fileName.match(/\.[^.]+$/);
  return m ? m[0].toLowerCase() : "";
}

/**
 * 把 buffer 落盘到 uploads/{userId}/{uuid}{ext}，返回相对路径。
 */
export async function saveUploadedFile(
  buffer: Buffer,
  userId: string,
  fileName: string,
): Promise<string> {
  const ext = extOf(fileName);
  const uuid = randomUUID();
  const relPath = `${userId}/${uuid}${ext}`;
  const absPath = path.join(UPLOADS_DIR, relPath);

  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buffer);

  return relPath;
}

/**
 * 相对路径 → 绝对路径，带目录穿越防护（防 filePath 被篡改成 ../etc/passwd）。
 */
export function resolveUploadPath(relPath: string): string {
  const abs = path.resolve(UPLOADS_DIR, relPath);
  if (!abs.startsWith(UPLOADS_DIR + path.sep) && abs !== UPLOADS_DIR) {
    throw new Error("非法文件路径");
  }
  return abs;
}

/** 删除上传的原文件，文件不存在不报错（幂等） */
export async function deleteUploadedFile(relPath: string): Promise<void> {
  try {
    await unlink(resolveUploadPath(relPath));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export { UPLOADS_DIR };
