const SMARTAPP_HOST = "https://fiori-proxy-web.herokuapp.com";

function SmartAppInterceptor({ iframeSelector, smartAppUrl }) {
  this._iframe = document.querySelector(iframeSelector);
  this._smartAppUrl = smartAppUrl;
  this._serviceWorker = null;
  this._cookies = {};
  this._messagesCache = {};

  window.handleAndroidEvent = this._handleAndroidEvent.bind(this);

  this._installSW();
}

SmartAppInterceptor.prototype.log = function (...args) {
  console.log(...args);
  // document.body.append(
  //   args
  //     .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
  //     .join(" ")
  // );
  // document.body.append(document.createElement("hr"));
};

SmartAppInterceptor.prototype._handleMessage = function (event) {
  const message = event.data;
  const { url, method, headers, body, status, ref, messageId } = message;

  switch (message.type) {
    case "request":
      this.log("iframe => smartapp", message);

      if (messageId && !this._messagesCache[messageId]) {
        this.log('cache:add', messageId);
        this._messagesCache[messageId] = { url, messages: [] };
      }

      this._sendMessageToAndroid({
        url,
        method,
        headers,
        body,
        ref: messageId,
      });
      break;
    case "response":
      // this.log("express => smartapp", message);
      // this._handleAndroidEvent(message);
      break;
    default:
      // console.log("unknown event from iframe", message);
      break;
  }
};

SmartAppInterceptor.prototype._sendMessageToSW = function (message) {
  if (!this._serviceWorker) return;
  // this.log("[send::web]", message);
  this._serviceWorker.active.postMessage(message);
};

SmartAppInterceptor.prototype._sendMessageToAndroid = function ({
  url,
  method,
  body,
  headers,
  ref,
}) {
  const proxiedUrl = this._prepareFetchUrl(url);

  const requestHeaders = {
    ...headers,
    cookie: Object.entries(this._cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; "),
  };

  this.log('cookie', requestHeaders.cookie)

  const requestHeadersList = Object.entries(
    requestHeaders
  ).map(([key, value]) => ({ key, value }));

  this.log("smartapp => express", {
    data: { url, method, body, headers },
    ref,
  });

  if (typeof express === "undefined") {
    this.log('No object "express", cannot send message to Android');
    return;
  }
  if (!express.send) {
    this.log('No method "express.send", cannot send message to Android');
  }

  express.send(
    JSON.stringify({
      data: {
        url: proxiedUrl,
        method,
        body: body && base64.encode(body),
        headers: requestHeadersList,
        totalMessageCount: 1,
        messageNumber: 0,
      },
      type: 'fiori',
      ref,
    })
  );
};

SmartAppInterceptor.prototype._appendBuffer = function (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

SmartAppInterceptor.prototype._caclulateBody = async function (cache, data) {
  const dataWithRedirect = this._processRedirect(data);

  const body = cache.messages.reduce((buffer, message) => {
    if (!message.body) return buffer;

    return this._appendBuffer(
      buffer || new ArrayBuffer(),
      base64.decode(message.body)
    );
  }, null);

  const injectedBody = cache.url
    ? body && await this._injectScript(cache.url, body)
    : body;

  return injectedBody;
};

SmartAppInterceptor.prototype._checkAllMsgsRecieved = function (array, count) {
  if (array.length < count) return false;

  for (var i = 0; i < count; i++) {
    if (array[i] === undefined) return false;
  }

  return true;
};

SmartAppInterceptor.prototype._handleAndroidEvent = async function (responseText) {
  try {
    const response = JSON.parse(responseText);
    const { ref, headers, body, status, messageNumber, totalMessageCount } = response.data;
  
    const cache = this._messagesCache[ref];
    const url = cache && cache.url;
  
    this.log("smartapp => iframe", ref);
  
    const headersMap = this._processCookies.call(this, data);
    cache.messages[messageNumber] = data;
    
    const isAllMessagesReceived = this._checkAllMsgsRecieved(cache.messages, totalMessageCount)

    this.log("msgs recvd", ref, isAllMessagesReceived);

    // Not all messages of this ref received
    if (!isAllMessagesReceived) {
      return;
    }
  
    const calculatedBody = await this._caclulateBody(cache, data);

    this.log('cache:remove', ref);
    delete this._messagesCache[ref];
  
    this._sendMessageToSW({
      status,
      headers: headersMap,
      body: calculatedBody,
      messageId: ref,
    });
  } catch(e) {
    console.log('ERROR!!!', data, this._messagesCache, e)
  }
};

SmartAppInterceptor.prototype.dispose = function () {
  window.removeEventListener("message", this._handleMessage);
};

SmartAppInterceptor.prototype._installSW = function () {
  const _this = this;

  if (!navigator.serviceWorker) {
    document.body.innerHTML = "<h1>SW not supported</h1>";
  }

  window.addEventListener("message", _this._handleMessage.bind(_this));

  navigator.serviceWorker
    .register("!!proxy!!sw.js")
    .then(function (registration) {
      navigator.serviceWorker.addEventListener(
        "message",
        _this._handleMessage.bind(_this)
      );

      _this.log("SW installed");

      _this._serviceWorker = registration;
      _this._iframe.src = location.origin + _this._smartAppUrl;
    })
    .catch((error) => {
      document.body.innerHTML = "<h1>SW install error :(</h1>";
      console.error("SW error", error);
    });
};

SmartAppInterceptor.prototype._processCookies = function (data) {
  const _this = this;

  const responseHeaders = data.headers.reduce(
    (headers, { key: keyName, value: keyValue }) => {
      if (keyName === "set-cookie") {
        _this._cookies = keyValue.split(/,\s+/).reduce((cookies, text) => {
          const [, name, value] = text.match(/([^=]+)=([^;]+);/) || [];
          if (name && value) {
            return { ...cookies, [name]: value };
          }
          return cookies;
        }, _this._cookies);

        return headers;
      }

      return { ...headers, [keyName]: keyValue };
    },
    {}
  );

  return responseHeaders;
};

SmartAppInterceptor.prototype._processRedirect = function (data) {
  const { headers, status } = data;

  if (status < 300 || status > 399 || !headers.location) return data;

  return {
    ...data,
    headers: {
      ...headers,
      location: headers.location.replace(
        "https://mobile-dev.nornik.ru:8443",
        SMARTAPP_HOST
      ),
    },
  };
};

SmartAppInterceptor.prototype._prepareFetchUrl = function (url) {
  return url
    .replace(SMARTAPP_HOST, "https://mobile-dev.nornik.ru:8443")
    .replace(/^\//, "https://mobile-dev.nornik.ru:8443/");
};

SmartAppInterceptor.prototype._injectScript = function (url, body) {
  if (url.indexOf("sap/public/bc/ui2/zlogon/login.js") === -1) return body;

  return fetch("./!!proxy!!login.js").then((res) => res.arrayBuffer());
};

window.SmartAppInterceptor = SmartAppInterceptor;
