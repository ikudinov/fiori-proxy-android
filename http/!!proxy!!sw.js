const DEBUG = false;

self.addEventListener("activate", async function (event) {
  console.log("SW activated");
});

self.addEventListener("install", async function (event) {
  console.log("SW installed");
});

self.addEventListener("fetch", function (event) {
  event.respondWith(fetchInterceptor(event));
});

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fetchInterceptor(event) {
  if (DEBUG) {
    console.log(
      "[fetch:sw:0] url",
      event.request.url,
      "event.resultingClientId",
      event.resultingClientId
    );
  }

  const needToLoadImmediately = /https?:\/\/[^/]+\/\!\!proxy\!\!/.test(
    event.request.url
  );
  const needToUseCache = /\.(js|css|woff|woff2)[?]*/i.test(event.request.url);

  if (needToLoadImmediately) return fetch(event.request);

  if (!needToUseCache) {
    return loadDataThroughParent(event.request, event.resultingClientId);
  }

  return caches.open("_fiori_").then(cache =>
    cache.match(event.request).then(response => {
      if (DEBUG) {
        console.log('[sw] appcache', needToUseCache, event.request.url, !!response);
      }

      return (
        response ||
        loadDataThroughParent(event.request, event.resultingClientId)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
      )
    })
  );
}

function loadDataThroughParent(request, id) {
  const headers = Array.from(request.headers.entries()).reduce(
    (headers, [key, value]) => ({ ...headers, [key]: value }),
    {}
  );

  return request
    .arrayBuffer()
    .then((body) =>
      sendMessageToParent(
        {
          type: "request",
          url: request.url,
          method: request.method,
          headers,
          body: request.method === "GET" ? null : body,
        },
        true,
        id
      )
    )
    .then((response) => {
      const responseInit = {
        status: response.status,
        statusText: "smartAppIntercepted",
        headers: response.headers,
      };

      return new Response(response.body, responseInit);
    });
}

function sendMessageToParent(message, waitResponse, id) {
  const messageId = uuidv4();

  return self.clients
    .matchAll({
      includeUncontrolled: true,
      type: "all",
    })
    .then((clients) => {
      if (!clients.length)
        return Promise.reject("Client not found for postMessage");

      clients.map((client) => {
        if (client.id === id || client.type !== "window") {
          if (DEBUG) console.log("[send::sw] skip client", client);
          return;
        }

        if (DEBUG) console.log("[send::sw]", message, client);

        client.postMessage({ ...message, messageId });
      });
    })
    .then(() => {
      if (!waitResponse) return null;

      return new Promise((resolve) => {
        const handleMessage = (event) => {
          if (DEBUG) console.log("[recv::sw]", event.data);

          if (event.data.messageId === messageId) {
            self.removeEventListener("message", handleMessage);
            resolve(event.data);
          }
        };

        self.addEventListener("message", handleMessage);
      });
    });
}
