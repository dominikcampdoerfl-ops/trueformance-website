const PRIMARY_HOST = "trueformance.de";
const WWW_HOST = `www.${PRIMARY_HOST}`;

async function serveAsset(request, env, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === WWW_HOST) {
      url.hostname = PRIMARY_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/") {
      return serveAsset(request, env, "/index.html");
    }

    if (!url.pathname.includes(".") && !url.pathname.endsWith("/")) {
      const htmlResponse = await serveAsset(request, env, `${url.pathname}.html`);

      if (htmlResponse.status !== 404) {
        return htmlResponse;
      }
    }

    return serveAsset(request, env, url.pathname);
  },
};
