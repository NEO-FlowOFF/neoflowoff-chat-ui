import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();
  const ct = response.headers.get("content-type") ?? "";
  if (ct.startsWith("text/html") && !ct.includes("charset")) {
    response.headers.set("content-type", "text/html; charset=utf-8");
  }
  return response;
});
