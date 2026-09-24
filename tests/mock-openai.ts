// Test-only provider. No mock hooks are compiled into application routes.
import { createServer } from "node:http";
import sharp from "sharp";

async function main() {
  const image = await sharp({
    create: { width: 1072, height: 1456, channels: 3, background: "#799475" },
  })
    .png()
    .toBuffer();
  let failImages = 0;
  let failMetadata = 0;
  const server = createServer(async (request, response) => {
    const parts: Buffer[] = [];
    for await (const chunk of request) parts.push(Buffer.from(chunk));
    const body = Buffer.concat(parts).toString();
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/control") {
      const control = JSON.parse(body);
      failImages = control.failImages || 0;
      failMetadata = control.failMetadata || 0;
      response.end("{}");
      return;
    }
    if (request.url === "/health") {
      response.end("{}");
      return;
    }
    if (request.url === "/v1/responses") {
      if (failMetadata > 0) {
        failMetadata--;
        response.statusCode = 500;
        response.end(
          JSON.stringify({ error: { message: "Test metadata failure" } }),
        );
        return;
      }
      response.end(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          created_at: Date.now(),
          status: "completed",
          output: [
            {
              type: "message",
              id: "msg_test",
              role: "assistant",
              status: "completed",
              content: [
                {
                  type: "output_text",
                  annotations: [],
                  text: JSON.stringify({
                    title: "The Secret Garden",
                    author: "Frances Hodgson Burnett",
                  }),
                },
              ],
            },
          ],
        }),
      );
    } else if (request.url === "/v1/images/edits") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (failImages > 0) {
        failImages--;
        response.statusCode = 429;
        response.end(
          JSON.stringify({
            error: { message: "Test rate limit", type: "rate_limit_error" },
          }),
        );
        return;
      }
      response.end(
        JSON.stringify({
          created: Date.now(),
          data: [{ b64_json: image.toString("base64") }],
        }),
      );
    } else {
      response.statusCode = 404;
      response.end("{}");
    }
  });
  server.listen(4011, "127.0.0.1", () =>
    console.log("Test provider ready on 4011"),
  );
}
void main();
