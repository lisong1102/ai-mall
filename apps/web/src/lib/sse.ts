/**
 * 解析 SSE 响应流，按帧回调解析后的 JSON 负载。
 *
 * 帧格式（以空行分隔）：
 *   data: {"foo":"bar"}\n\n
 *   data: [DONE]\n\n
 *
 * 约定：
 * - 只处理 `data:` 前缀的帧，`[DONE]` 帧直接跳过；
 * - 单帧 JSON 解析失败时忽略该帧，不中断整条流；
 * - 调用方可在 onEvent 内 throw，异常会冒泡到 readSse 的调用处。
 */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (data: unknown) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 帧以空行分隔；保留最后一段未完成 buffer
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        onEvent(JSON.parse(payload));
      } catch {
        // 单帧 JSON 解析失败：忽略，不中断整条流
      }
    }
  }
}
