var fioriLogin = {};

(function () {
  // IE8 support
  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g, "");
    };
  }
  function testBase64Chars(s) {
    var re = /[^0-9A-Za-z+/]/g;
    return !re.test(s);
  }
  function encode_utf8(s) {
    return unescape(encodeURIComponent(s));
  }
  function decode_utf8(s) {
    return decodeURIComponent(escape(s));
  }
  fioriLogin.encodeHash = function (s) {
    var encoded;
    if (s) {
      encoded = btoa(encode_utf8(s));
      encoded = encoded.replace(/=/g, "");
    } else {
      encoded = "";
    }
    return encoded;
  };
  fioriLogin.decodeHash = function (s) {
    var hash = "";
    if (s && testBase64Chars(s)) {
      try {
        hash = decode_utf8(atob(s));
      } catch (error) {}
    }
    return hash;
  };
  // Lightweight URL parsing
  function URL(url) {
    this._parse(url);
  }
  URL.prototype._parse = function (url) {
    var parseRegExp = /([^?#]+)(\?[^#]*)?(#.*)?/;
    var matches = parseRegExp.exec(url);
    this.path = matches[1];
    this.hash = matches[3] || "";
    this.parameters = this._parseSearch(matches[2]);
  };
  URL.prototype._parseSearch = function (search) {
    var paramRegExp, matches, params;
    params = {};
    if (search) {
      paramRegExp = /[?&]([^&=]+)=?([^&]*)/g;
      matches = paramRegExp.exec(search);
      while (matches) {
        params[matches[1]] = matches[2];
        matches = paramRegExp.exec(search);
      }
    }
    return params;
  };
  URL.prototype.getParameter = function (name) {
    return decodeURIComponent(this.parameters[name]);
  };
  URL.prototype.removeParameter = function (name) {
    delete this.parameters[name];
  };
  URL.prototype.setParameter = function (name, value) {
    this.parameters[name] = encodeURIComponent(value);
  };
  Object.defineProperties(URL.prototype, {
    href: {
      get: function () {
        var href;
        href = this.path + this.search + this.hash;
        return href;
      },
    },
    search: {
      get: function () {
        var search, params, name, value;
        search = "";
        params = this.parameters;
        for (name in params) {
          if (params.hasOwnProperty(name)) {
            value = params[name];
            if (search.length > 0) {
              search += "&";
            }
            search += name;
            if (value) {
              search += "=";
              search += value;
            }
          }
        }
        if (search.length > 0) {
          search = "?" + search;
        }
        return search;
      },
    },
  });
  // Browser
  fioriLogin.isLegacyIE = function () {
    var ieRegExp,
      result,
      ieVersion,
      legacy = false;
    if (navigator.appName === "Microsoft Internet Explorer") {
      ieRegExp = /MSIE ([0-9]+[\.0-9]*)/;
      result = ieRegExp.exec(navigator.userAgent);
      if (result != null) {
        ieVersion = parseFloat(result[1]);
        legacy = ieVersion < 10;
      }
    }
    return legacy;
  };
  fioriLogin.userAgentParser = {};
  fioriLogin.userAgentParser.webkit = function (ua) {
    var reWebkit, reChrome, reAndroid, reSafari, match, browser;
    reWebkit = /webkit[ \/]([\w.]+)/;
    match = reWebkit.exec(ua);
    if (match) {
      browser = {};
      browser.engine = { name: "webkit", version: match[1] };
      reChrome = /(chrome)\/(\d+\.\d+).\d+/;
      reAndroid = /(android) .+ version\/(\d+\.\d+)/;
      match = reChrome.exec(ua) || reAndroid.exec(ua);
      if (match) {
        browser.name = match[1];
        browser.version = match[2];
      } else {
        reSafari = /version\/(\d+\.\d+).*safari/;
        match = reSafari.exec(ua);
        if (match) {
          browser.name = "safari";
          browser.version = match[1];
        }
      }
    }
    return browser;
  };
  fioriLogin.userAgentParser.opera = function (ua) {
    var reOpera, match, browser;
    reOpera = /opera(?:.*version)?[ \/]([\w.]+)/;
    match = reOpera.exec(ua);
    if (match) {
      browser = { name: "opera", version: match[1] };
      browser.engine = { name: "opera", version: match[1] };
    }
    return browser;
  };
  fioriLogin.userAgentParser.firefox = function (ua) {
    var reFirefox, match, browser;
    reFirefox = /firefox\/([\w.]+)/;
    match = reFirefox.exec(ua);
    if (match) {
      browser = { name: "firefox", version: match[1] };
      browser.engine = { name: "firefox", version: match[1] };
    }
    return browser;
  };
  fioriLogin.userAgentParser.msie = function (ua) {
    var reTrident, reMSIE, msie, match, browser, msieFromTrident;
    reTrident = /trident\/([\w.]+);.*rv:([\w.]+)/;
    reMSIE = /msie ([\w.]+)/;
    msieFromTrident = { "4.0": "8.0", "5.0": "9.0", "6.0": "10.0" };
    match = reTrident.exec(ua);
    if (match) {
      browser = { name: "msie" };
      browser.engine = { name: "trident", version: match[1] };
      if (match[2]) {
        browser.version = match[2];
      } else {
        browser.version = msieFromTrident[match[2]];
        match = reMSIE.exec(ua);
        if (match) {
          browser.compatibilityMode = match[1];
        }
      }
    } else {
      match = reMSIE.exec(ua);
      if (match) {
        browser = { name: "msie", version: match[1] };
        browser.engine = { name: "trident", version: "0" };
      }
    }
    return browser;
  };
  fioriLogin.getBrowser = function () {
    var ua, browser;
    ua = window.navigator.userAgent.toLowerCase();
    browser =
      fioriLogin.userAgentParser.webkit(ua) ||
      fioriLogin.userAgentParser.opera(ua) ||
      fioriLogin.userAgentParser.firefox(ua) ||
      fioriLogin.userAgentParser.msie(ua);
    if (!browser) {
      browser = { name: "", version: "0" };
    }
    return browser;
  };

  // atob/btoa polyfill for IE 9
  if (!window.atob) {
    (function () {
      "use strict";
      var B, d, a, c, e;
      B = {};
      d = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      (function () {
        var b, i, j;
        a = [];
        e = [];
        c = [];
        for (i = 0; i < 128; ++i) {
          a[i] = -1;
        }
        for (i = 0; i < 64; ++i) {
          b = d.charCodeAt(i);
          c[i] = d[i];
          a[b] = i;
        }
        for (i = 0; i < 64; ++i) {
          for (j = 0; j < 64; ++j) {
            e[64 * i + j] = d[i] + d[j];
          }
        }
      })();
      function f(s, i) {
        throw new Error("Invalid character '" + s[i] + "' at position " + i);
      }

      B.encode = function (s) {
        var b, l, t, i, g, h, j;
        if (!s) {
          return "";
        }
        b = "";
        l = s.length;
        t = l % 3;
        l -= t;
        for (i = 0; i < l; ++i) {
          g = s.charCodeAt(i) << 4;
          h = s.charCodeAt(++i);
          g |= h >>> 4;
          h = (h & 15) << 8;
          h |= s.charCodeAt(++i);
          b += e[g] + e[h];
        }
        if (t) {
          h = s.charCodeAt(i);
          g = h >>> 2;
          if (t === 1) {
            h = (h & 3) << 4;
            b += c[g] + c[h] + "==";
          } else {
            j = s.charCodeAt(++i);
            h = ((h & 3) << 4) | (j >>> 4);
            j = (j & 15) << 2;
            b += c[g] + c[h] + c[j] + "=";
          }
        }
        return b;
      };
      B.decode = function (s) {
        var b, l, t, i, g, h, j, k;
        if (!s) {
          return "";
        }
        b = "";
        l = s.length;
        t = l & 3;
        if (t) {
          if (t === 1 || b[l - 1] === "=") {
            throw new Error("Invalid base64 input");
          }
          l -= t;
        } else {
          if (s[l - 1] === "=") {
            t = 3;
            if (s[l - 2] === "=") {
              t = 2;
            }
            l -= 4;
          }
        }
        for (i = 0; i < l; ++i) {
          g = a[s.charCodeAt(i)];
          if (g < 0) {
            f(s, i);
          }
          h = a[s.charCodeAt(++i)];
          if (h < 0) {
            f(s, i);
          }
          j = a[s.charCodeAt(++i)];
          if (j < 0) {
            f(s, i);
          }
          k = a[s.charCodeAt(++i)];
          if (k < 0) {
            f(s, i);
          }
          g = (g << 2) | (h >>> 4);
          h = ((h & 15) << 4) | (j >>> 2);
          j = ((j & 3) << 6) | k;
          b += String.fromCharCode(g, h, j);
        }
        if (t) {
          g = a[s.charCodeAt(i)];
          if (g < 0) {
            f(s, i);
          }
          h = a[s.charCodeAt(++i)];
          if (h < 0) {
            f(s, i);
          }
          g = (g << 2) | (h >>> 4);
          b += String.fromCharCode(g);
          if (t === 3) {
            j = a[s.charCodeAt(++i)];
            if (j < 0) {
              f(s, i);
            }
            h = ((h & 15) << 4) | (j >>> 2);
            b += String.fromCharCode(h);
          }
        }
        return b;
      };
      window.atob = B.decode;
      window.btoa = B.encode;
    })();
  }

  // CSS
  fioriLogin.addClass = function (className, element) {
    var startClassName = element.className;
    if (startClassName) {
      var regexp = new RegExp("\\b" + className + "\\b");
      if (!regexp.test(startClassName)) {
        element.className = startClassName + " " + className;
      }
    } else {
      element.className = className;
    }
  };
  fioriLogin.removeClass = function (className, element) {
    if (element.className) {
      var regexp = new RegExp("\\b" + className + "\\b");
      element.className = element.className.replace(regexp, "");
    }
  };
  // Language handling
  fioriLogin.lang = {};
  fioriLogin.lang.compare = function (lang1, lang2) {
    if (lang1.value < lang2.value) {
      return -1;
    } else if (lang1.value > lang2.value) {
      return 1;
    } else {
      return 0;
    }
  };
  fioriLogin.lang.createOption = function (lang) {
    var option = document.createElement("option");
    option.value = lang.value;
    if (lang.value) {
      option.text = lang.value + " - " + lang.label;
    } else {
      option.text = lang.label;
    }
    return option;
  };
  fioriLogin.lang.getAppLanguages = function () {
    var appLanguages;
    if (sraLogin.languages.application) {
      var langs = sraLogin.languages.application.split(",");
      var langCount = langs.length;
      for (var idx = 0; idx < langCount; ++idx) {
        if (!appLanguages) {
          appLanguages = {};
        }
        var lang = langs[idx].trim();
        appLanguages[lang.toUpperCase()] = true;
      }
    }
    return appLanguages;
  };
  fioriLogin.lang.isAllowed = function (lang, appLanguages) {
    var allowed = true;
    if (appLanguages && lang && lang.length > 0) {
      allowed = appLanguages[lang];
    }
    return allowed;
  };
  fioriLogin.lang.getSelection = function () {
    var select, index, lang;
    lang = "";
    select = document.getElementById("LANGUAGE_SELECT");
    index = select.selectedIndex;
    if (index >= 0 && index < sraLogin.languages.available.length) {
      lang = sraLogin.languages.available[index].value;
    }
    return lang;
  };
  fioriLogin.lang.initLangSelect = function () {
    var browser,
      languages = sraLogin.languages.available;
    var langCount = languages.length;
    if (sraLogin.options.selectLanguage && langCount > 1) {
      var appLanguages = fioriLogin.lang.getAppLanguages();
      sraLogin.languages.available = [];
      languages.sort(fioriLogin.lang.compare);
      fioriLogin.lang.selectControl = document.getElementById(
        "LANGUAGE_SELECT"
      );
      var langSelect = fioriLogin.lang.selectControl;
      browser = fioriLogin.getBrowser();
      if (browser.name === "firefox") {
        fioriLogin.addClass("sapUiMozSraSelect", langSelect);
        langSelect.style.marginTop = "10px";
        setTimeout(fioriLogin.lang.adjustMozSelect, 15);
        setInterval(fioriLogin.lang.adjustMozSelect, 100);
      }
      var selectedLang = 1;
      var langIndex = 0;
      for (var idx = 0; idx < langCount; ++idx) {
        if (fioriLogin.lang.isAllowed(languages[idx].value, appLanguages)) {
          sraLogin.languages.available.push(languages[idx]);
          var option = fioriLogin.lang.createOption(languages[idx]);
          langSelect.add(option);
          if (sraLogin.languages.lang === option.value) {
            selectedLang = langIndex;
          }
          langIndex++;
        }
      }
      if (langIndex <= 1) {
        var englishLang = { value: "EN", label: "English" };
        sraLogin.languages.available.push(englishLang);
        var option = fioriLogin.lang.createOption(englishLang);
        langSelect.add(option);
      }
      langSelect.selectedIndex = selectedLang;
    }
  };
  fioriLogin.lang.adjustMozSelect = function () {
    var top, height, langSelect;
    langSelect = fioriLogin.lang.selectControl;
    height = langSelect.clientHeight;
    if (height && height != fioriLogin.lang.selectControlHeight) {
      fioriLogin.lang.selectControlHeight = height;
      top = Math.round((40 - height) / 2);
      langSelect.style.marginTop = "" + top + "px";
    }
  };
  fioriLogin.lang.setParam = function () {
    var selectParam = document.getElementById("LANGUAGE_PARAM_VALUE");
    if (selectParam) {
      selectParam.value = fioriLogin.lang.getSelection();
    }
  };
  // Error messages
  fioriLogin.error = {};
  fioriLogin.error.getMessage = function () {
    var errorLabel = document.getElementById("LOGIN_LBL_ERROR");
    if (fioriLogin.isLegacyIE()) {
      return errorLabel.innerText;
    } else {
      return errorLabel.textContent;
    }
  };
  fioriLogin.error.show = function (text) {
    var errorLabel = document.getElementById("LOGIN_LBL_ERROR");
    if (fioriLogin.isLegacyIE()) {
      errorLabel.innerText = text;
    } else {
      errorLabel.textContent = text;
    }
    var errorBlock = document.getElementById("LOGIN_ERROR_BLOCK");
    errorBlock.style.visibility = "visible";
  };
  fioriLogin.error.hide = function () {
    var errorLabel = document.getElementById("LOGIN_LBL_ERROR");
    if (fioriLogin.isLegacyIE()) {
      errorLabel.innerText = "";
    } else {
      errorLabel.textContent = "";
    }
    var errorBlock = document.getElementById("LOGIN_ERROR_BLOCK");
    errorBlock.style.visibility = "hidden";
  };

  // input
  fioriLogin.getInputValue = function (inputId) {
    var elt, val;
    elt = document.getElementById(inputId);
    if (elt) {
      val = elt.value;
    }
    return val;
  };
  fioriLogin.setInputFocus = function (inputId) {
    var input = document.getElementById(inputId);
    if (input) {
      input.focus();
    }
  };
  fioriLogin.validateInput = function (id, errorText, validRegexp) {
    var input = document.getElementById(id);
    var inputValid = false;
    if (validRegexp) {
      inputValid = validRegexp.test(input.value);
    } else {
      if (input.value) {
        inputValid = true;
      }
    }
    if (!inputValid) {
      fioriLogin.error.show(errorText);
      input.focus();
    }
    return inputValid;
  };

  fioriLogin.submitLogin = function (inputProcessing, formEvent, submitForm) {
    var userInput;
    if (sraLogin.options.selectLanguage) {
      fioriLogin.lang.setParam();
    }
    userInput = document.getElementById("USERNAME_FIELD-inner");
    if (userInput.value !== userInput.value.trim()) {
      userInput.value = userInput.value.trim();
    }
    if (
      fioriLogin.validateInput(
        "USERNAME_FIELD-inner",
        sraLogin.texts.error_user_initial
      ) &&
      fioriLogin.validateInput(
        "PASSWORD_FIELD-inner",
        sraLogin.texts.error_pwd_initial
      ) &&
      fioriLogin.validateInput(
        "CLIENT_FIELD-inner",
        sraLogin.texts.error_client_initial,
        /\d{3}/
      )
    ) {
      fioriLogin.error.hide();
      fioriLogin.addClass("sapUiSraAfterLogin", document.body);
      if (!fioriLogin.isLegacyIE()) {
        fioriLogin.addClass("sapUiSraShowLogonAnimation", document.body);
      }
      document.getElementsByName(inputProcessing)[0].value = formEvent;
      if (submitForm) {
        document.loginForm.submit();
      }
      return true;
    } else {
      return false;
    }
  };

  fioriLogin.getHiddenField = function (name) {
    var input, value;
    input = document.getElementsByName(name);
    if (input.length === 0) {
      value = "";
    } else {
      value = input[0].value;
    }
    return value;
  };
  fioriLogin.setHiddenField = function (name, value) {
    var form, input;
    input = document.getElementsByName(name);
    if (input.length === 0) {
      form = document.forms[0];
      if (form) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    } else {
      input[0].value = value;
    }
  };
  fioriLogin.deleteHiddenField = function (name) {
    var input;
    input = document.getElementsByName(name);
    if (input.length > 0) {
      input = input[0];
      input.parentNode.removeChild(input);
    }
  };
  fioriLogin.getHashValue = function () {
    var hash;
    hash = fioriLogin.getHiddenField("sap-hash");
    hash = fioriLogin.decodeHash(hash);
    return hash;
  };
  fioriLogin.setHashValue = function () {
    var form,
      url,
      hash = fioriLogin.encodeHash(window.location.hash);
    form = document.loginForm || document.changePWForm || document.forms[0];
    url = new URL(form.action);
    fioriLogin.setHiddenField("sap-hash", hash);
    if (hash) {
      fioriLogin.setHiddenField("__sap-sl__dummy", "1");
      url.setParameter("_sap-hash", hash);
      form.action = url.href;
    } else {
      fioriLogin.deleteHiddenField("__sap-sl__dummy");
      url.removeParameter("_sap-hash");
      form.action = url.href;
    }
  };
  fioriLogin.initHash = function () {
    var hash;
    window.onhashchange = fioriLogin.onHashChange;
    hash = fioriLogin.getHashValue();
    if (hash) {
      window.location.hash = hash;
    }
    fioriLogin.setHashValue();
  };
  fioriLogin.onHashChange = function () {
    var hash;
    fioriLogin.setHashValue();
  };
  fioriLogin.initLoginForm = function () {
    try {
      fioriLogin.lang.initLangSelect();
      fioriLogin.setInputFocus("USERNAME_FIELD-inner");
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.onPasswordChange = function () {
    var newPassword = document.getElementById("NEW_PASSWORD_FIELD-inner").value;
    var confirmPasswordInput = document.getElementById(
      "CONFIRM_PASSWORD_FIELD-inner"
    );
    var confirmPasswordLabel = document.getElementById(
      "CONFIRM_PASSWORD_LABEL"
    );
    var confirmPassword = confirmPasswordInput.value;

    var passwordConfirmed = newPassword === confirmPassword;
    if (passwordConfirmed) {
      fioriLogin.removeClass(
        sraLogin.styles.confirmPassword_error,
        confirmPasswordLabel
      );
      fioriLogin.removeClass(
        sraLogin.styles.confirmPassword_error,
        confirmPasswordInput
      );
    } else {
      fioriLogin.addClass(
        sraLogin.styles.confirmPassword_error,
        confirmPasswordLabel
      );
      fioriLogin.addClass(
        sraLogin.styles.confirmPassword_error,
        confirmPasswordInput
      );
    }
  };
  fioriLogin.validateNewPassword = function () {
    var newPassword = document.getElementById("NEW_PASSWORD_FIELD-inner").value;
    var confirmPassword = document.getElementById(
      "CONFIRM_PASSWORD_FIELD-inner"
    ).value;
    var passwordValid = newPassword && newPassword === confirmPassword;
    if (!passwordValid) {
      fioriLogin.error.show(sraLogin.texts.error_confirm_newpwd);
    }
    return passwordValid;
  };
  fioriLogin.submitChangePassword = function (
    inputProcessing,
    formEvent,
    submitForm
  ) {
    if (
      formEvent === "onCancelPwd" ||
      fioriLogin.validateInput(
        "PASSWORD_FIELD-inner",
        sraLogin.texts.error_pwd_initial
      )
    ) {
      fioriLogin.error.hide();
      document.getElementsByName(inputProcessing)[0].value = formEvent;
      var sap_pwd = document.getElementsByName("sap-password")[0];
      if (sap_pwd)
        sap_pwd.value = document.getElementsByName(
          "sap-system-login-password"
        )[0].value;
      fioriLogin.addClass("sapUiSraAfterLogin", document.body);
      if (!fioriLogin.isLegacyIE()) {
        fioriLogin.addClass("sapUiSraShowLogonAnimation", document.body);
      }
      if (submitForm) {
        document.changePWForm.submit();
      }
      return true;
    } else {
      return false;
    }
  };
  fioriLogin.initChangePasswordForm = function () {
    try {
      var newPasswordInput = document.getElementById(
        "NEW_PASSWORD_FIELD-inner"
      );
      var confirmPasswordInput = document.getElementById(
        "CONFIRM_PASSWORD_FIELD-inner"
      );
      if (newPasswordInput.addEventListener) {
        newPasswordInput.addEventListener("input", fioriLogin.onPasswordChange);
        confirmPasswordInput.addEventListener(
          "input",
          fioriLogin.onPasswordChange
        );
      }
      fioriLogin.setInputFocus("PASSWORD_FIELD-inner");
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.initChangePasswordEndForm = function () {
    try {
      fioriLogin.setInputFocus("LOGIN_CONFIRM_BLOCK");
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.initChangePasswordCancelForm = function () {
    try {
      fioriLogin.setInputFocus("LOGIN_ERROR_BLOCK");
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.initMessageForm = function () {
    try {
      fioriLogin.setInputFocus("LOGIN_ERROR_BLOCK");
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.submitForm = function (event) {
    document.getElementsByName(
      "sap-system-login-oninputprocessing"
    )[0].value = event;
    var form = document.loginForm || document.changePWForm;
    form.submit();
    return true;
  };
  fioriLogin.msgSelfSubmit = function (submit, event, delay) {
    try {
      if (delay > 0) {
        window.setTimeout(function () {
          submit.call(window, event);
        }, delay);
      }
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };
  fioriLogin.footerFix = function () {
    fioriLogin.addClass("sapUiSraFooterAbsolute", document.body);
  };
  fioriLogin.foterReset = function () {
    fioriLogin.removeClass("sapUiSraFooterAbsolute", document.body);
  };
  fioriLogin.monitorInputs = function () {
    var k, n, input;
    var inputs = document.getElementsByTagName("input");
    n = inputs.length;
    for (k = 0; k < n; ++k) {
      input = inputs[k];
      if (input.addEventListener) {
        input.addEventListener("focus", fioriLogin.footerFix);
        input.addEventListener("blur", fioriLogin.foterReset);
      }
    }
  };
  fioriLogin.main = function () {
    try {
      fioriLogin.initHash();
      fioriLogin.monitorInputs();
      fioriLogin.zMain();

      switch (sraLogin.context) {
        case "login":
          fioriLogin.initLoginForm();
          break;
        case "changepwd":
          fioriLogin.initChangePasswordForm();
          break;
        case "changepwd_end":
          fioriLogin.initChangePasswordEndForm();
          break;
        case "changepwd_cancel":
          fioriLogin.initChangePasswordCancelForm();
          break;
        case "msg":
          fioriLogin.initMessageForm();
          break;
      }
    } catch (error) {
      if (console) {
        console.error(error.message);
      }
    }
  };

  //ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ

  fioriLogin.zMain = function () {
    fioriLogin.zSetView("default");
    fioriLogin.zRequestedSMS = false;
    sraLogin.texts.error_confirm_newpwd =
      "Введенные пароли не совпадают. Повторите ввод.";
    setTimeout(function () {
      fioriLogin.zSetBusy(false);
    }, 4000);
    document.getElementById("USERNAME_FIELD-inner").oninput =
      fioriLogin.zOnLoginInput;
  };

  fioriLogin.zButtonSendSMS = function () {
    var userInput;
    if (sraLogin.options.selectLanguage) {
      fioriLogin.lang.setParam();
    }
    userInput = document.getElementById("USERNAME_FIELD-inner");
    if (userInput.value !== userInput.value.trim()) {
      userInput.value = userInput.value.trim();
    }
    if (
      fioriLogin.validateInput(
        "USERNAME_FIELD-inner",
        sraLogin.texts.error_user_initial
      ) &&
      fioriLogin.validateInput(
        "PASSWORD_FIELD-inner",
        sraLogin.texts.error_pwd_initial
      ) &&
      fioriLogin.validateInput(
        "CLIENT_FIELD-inner",
        sraLogin.texts.error_client_initial,
        /\d{3}/
      )
    ) {
      fioriLogin.zLogin(
        document.getElementById("USERNAME_FIELD-inner").value,
        document.getElementById("PASSWORD_FIELD-inner").value
      );
    }
    return false;
  };

  fioriLogin.zButtonLogin = function (inputProcessing, formEvent) {
    var sUser = document.getElementById("USERNAME_FIELD-inner").value;
    var sPass = document.getElementById("PASSWORD_FIELD-inner").value;

    fioriLogin.zCheckSMS().then(oResponse => {
      if (!oResponse.ok) {
        if (oResponse.sendNewCode) {
          setTimeout(function () {
            fioriLogin.zLogin(sUser, sPass);
          }, 3000);
        }
        fioriLogin.error.show(oResponse.error || "Возникла неизвестная ошибка");
        return;
      }

      fioriLogin.zGetAnnouncements(sUser, sPass).then(oResponseAnnouncements => {
        var aAnnouncements = (oResponseAnnouncements || {}).announcements || [];

        fioriLogin.showAnnouncements(aAnnouncements, sUser, sPass, function () {
          document.loginForm.action = fioriLogin.zUpdateUrlParameter(
            document.loginForm.action,
            "znornickel-sms",
            document.getElementById("SMS_FIELD-inner").value
          );
          fioriLogin.submitLogin(inputProcessing, formEvent, true /*submitForm*/);
        });
      });
    });

    return false;
  };

  fioriLogin.zButtonChangePassword = function () {
    fioriLogin.zCheckUserPassword(
      document.getElementById("USERNAME_FIELD-inner").value,
      document.getElementById("PASSWORD_FIELD-inner").value
    ).then(oResponse => {
      if (oResponse.ok) {
        fioriLogin.zSetView("changePassword");
      } else {
        fioriLogin.error.show(oResponse.error || "Возникла неизвестная ошибка");
      }
    });
    return false;
  };

  fioriLogin.zButtonProceedChangePassword = function () {
    if (!fioriLogin.validateNewPassword()) {
      return false;
    }

    fioriLogin.zChangePassword().then(oResponse => {
      if (oResponse.ok) {
        //transfer new password to old password field
        var sNewPassword = document.getElementById("NEW_PASSWORD_FIELD-inner")
          .value;
        document.getElementById("PASSWORD_FIELD-inner").value = sNewPassword;
        fioriLogin.error.hide();
        fioriLogin.zSetView("default");
        if (fioriLogin.zRequestedSMS) {
          fioriLogin.zLogin(
            document.getElementById("USERNAME_FIELD-inner").value,
            sNewPassword
          );
        }
      } else {
        fioriLogin.error.show(oResponse.error || "Возникла неизвестная ошибка");
      }
    });

    return false;
  };

  fioriLogin.zLogin = function (sUser, sPass) {
    //alert("fioriLogin.zLogin user:" + sUser + " pass:" + sPass);
    if (!sUser || !sPass) {
      fioriLogin.zSetBusy(false);
      return;
    }
    fioriLogin.error.hide();

    fioriLogin.zRequestedSMS = true;

    document.getElementById("USERNAME_FIELD-inner").value = sUser;
    document.getElementById("PASSWORD_FIELD-inner").value = sPass;

    fioriLogin.zSendSMS(sUser, sPass).then(oResponse => {
      if (oResponse.ok) {
        fioriLogin.zSetView("sms");
        //wait some more and turn off busy state
        setTimeout(function () {
          fioriLogin.zSetBusy(false);
        }, 1000);
        fioriLogin.zShowTimer(oResponse.seconds);
        //adjust name for correct standard form proccessing
        document.getElementById("USERNAME_FIELD-inner").name = oResponse.aliasUsed
          ? "sap-alias"
          : "sap-user";
      } else if (oResponse.changePassword) {
        fioriLogin.zSetView("changePassword");
      } else if (oResponse.waitForRetry) {
        fioriLogin.zShowTimer(oResponse.seconds);
      } else {
        fioriLogin.error.show(oResponse.error || "Возникла неизвестная ошибка");
        fioriLogin.zSetBusy(false);
      }
    })
  };

  fioriLogin.zCheckUserPassword = function (sUser, sPass) {
    return fioriLogin.zGeneralPost([
      "type=checkUserPassword",
      "user=" + sUser,
      "password=" + sPass,
    ]);
  };

  fioriLogin.zSendSMS = function (sUser, sPass) {
    return fioriLogin.zGeneralPost([
      "type=sendSMS",
      "user=" + sUser,
      "password=" + sPass,
    ]);
  };

  fioriLogin.zCheckSMS = function () {
    return fioriLogin.zGeneralPost([
      "type=checkSMS",
      "user=" + document.getElementById("USERNAME_FIELD-inner").value,
      "sms=" + document.getElementById("SMS_FIELD-inner").value,
    ]);
  };

  fioriLogin.zChangePassword = function () {
    return fioriLogin.zGeneralPost([
      "type=changePassword",
      "user=" + document.getElementById("USERNAME_FIELD-inner").value,
      "password=" + document.getElementById("PASSWORD_FIELD-inner").value,
      "newPassword=" +
        document.getElementById("NEW_PASSWORD_FIELD-inner").value,
    ]);
  };

  fioriLogin.zGetAnnouncements = function (sUser, sPass) {
    return fioriLogin.zGeneralPost([
      "type=getAnnouncements",
      "user=" + sUser,
      "password=" + sPass,
    ]);
  };

  fioriLogin.zAnnouncementRead = function (sUser, sPass, sId) {
    return fioriLogin.zGeneralPost([
      "type=announcementRead",
      "user=" + sUser,
      "password=" + sPass,
      "id=" + sId,
    ]);
  };

  fioriLogin.zGeneralPost = async function (aBody) {
    var oXHR = new XMLHttpRequest();
    oXHR.open("POST", "/sap/bc/z_auth_service"); // async
    oXHR.setRequestHeader(
      "Content-Type",
      "application/x-www-form-urlencoded; charset=UTF-8"
    );
    oXHR.send(aBody.join("&"));

    await new Promise(resolve => {
      oXHR.onload = function () {
        resolve();
      };
      oXHR.onerror = function () {
        resolve();
      };
    })

    try {
      return JSON.parse(oXHR.responseText);
    } catch (e) {
      /**/
    }
    return {};
  };

  fioriLogin.zShowTimer = function (iInitialTime) {
    var iTime = iInitialTime;
    var fnSetMessage = function (sText) {
      document.getElementById("TIMER_TEXT")[
        fioriLogin.isLegacyIE() ? "innerText" : "textContent"
      ] = sText || "";
      document.getElementById("TIMER_BLOCK").style.display = sText
        ? ""
        : "none";
    };

    fioriLogin.zHide("SEND_SMS_BLOCK");
    fioriLogin.zHide("SEND_SMS_BLOCK_AGAIN");

    var fnTick = function () {
      iTime--;
      var sText = "Повторно код можно запросить через " + iTime + " секунд",
        iLastShifted = (iTime + 5) % 10;
      if (!~[11, 12, 13, 14].indexOf(iTime) && iLastShifted >= 6) {
        sText += iLastShifted == 6 ? "у" : "ы";
      }
      fnSetMessage(sText); // show/update text
      if (iTime <= 0) {
        clearInterval(iTimer);
        fnSetMessage("");
        fioriLogin.zShow("SEND_SMS_BLOCK_AGAIN");
      }
    };

    fnTick();
    var iTimer = setInterval(fnTick, 1000);
  };

  fioriLogin.showAnnouncements = function (
    aAnnouncements,
    sUser,
    sPass,
    fnAllOk
  ) {
    if (!aAnnouncements.length) {
      fnAllOk();
      return;
    }
    var oAnnouncement = aAnnouncements.shift();

    document.getElementById("zAnnouncementHeaderTitle").textContent =
      oAnnouncement.title;
    document.getElementById("zAnnouncementBody").innerHTML =
      oAnnouncement.content;
    document.getElementById("zAnnouncementOk").onclick = function () {
      fioriLogin.zHide("zAnnouncement");
      //TODO xhr call
      fioriLogin.zAnnouncementRead(sUser, sPass, oAnnouncement.id).then(() => {
        fioriLogin.showAnnouncements(aAnnouncements, sUser, sPass, fnAllOk);
      });
    };
    setTimeout(function () {
      fioriLogin.zShow("zAnnouncement");
    }, 500);
  };

  fioriLogin.zOnLoginInput = function (evt) {
    this.value = this.value.replace(/\D/g, "");
    if (this.value && this.value[0] !== "7") {
      this.value = "7" + this.value;
    }
    // if (!this.value || !~this.value.indexOf("7")) {
    // this.value = "7" + this.value;
    // }
  };

  fioriLogin.zShow = function (sId) {
    document.getElementById(sId).style.display = "";
  };
  fioriLogin.zHide = function (sId) {
    document.getElementById(sId).style.display = "none";
  };

  fioriLogin.zSetView = function (sVariant) {
    var fnSetHeaderText = function (sText) {
      document.getElementById("HEADER_TITLE").textContent = sText;
    };

    fioriLogin.zShow("LOGIN_PAGE_FULL");

    //login field, password field, send sms button
    var aDefault = [
      "USERNAME_BLOCK",
      "PASSWORD_BLOCK",
      "SEND_SMS_BLOCK",
      "CHANGE_PASSWORD_BLOCK",
    ];
    //sms field, login button
    var aSms = ["SMS_BLOCK", "LOGIN_BLOCK", "CHANGE_PASSWORD_BLOCK"];
    //new password field, confirm password field, change password button
    var aChangePassword = [
      "NEW_PASSWORD_ROW",
      "CONFIRM_PASSWORD_ROW",
      "PROCEED_CHANGE_PASSWORD_BLOCK",
    ];
    //temp visibility
    var aTempVisibility = ["SEND_SMS_BLOCK_AGAIN"];

    //hide all
    var aAll = [].concat(aDefault, aSms, aChangePassword, aTempVisibility);
    aAll.forEach(fioriLogin.zHide);

    if (sVariant === "default") {
      aDefault.forEach(fioriLogin.zShow);
      fioriLogin.setInputFocus("USERNAME_FIELD-inner");
      var sSubmit = "SEND_SMS_BLOCK";
      fnSetHeaderText("Введите логин и пароль");
    } else if (sVariant === "sms") {
      aSms.forEach(fioriLogin.zShow);
      fioriLogin.setInputFocus("SMS_FIELD-inner");
      sSubmit = "LOGIN_BLOCK";
      fnSetHeaderText("Введите код из СМС");
    } else if (sVariant === "changePassword") {
      aChangePassword.forEach(fioriLogin.zShow);
      fioriLogin.setInputFocus("NEW_PASSWORD_FIELD-inner");
      sSubmit = "PROCEED_CHANGE_PASSWORD_BLOCK";
      fnSetHeaderText("Вам необходимо сменить пароль");
    }

    //set type Submit only for visible buttons
    document
      .querySelectorAll("#LOGIN_PAGE_FULL [data-type='submit']")
      .forEach(function (oBtn) {
        oBtn.type = sSubmit === oBtn.parentElement.id ? "submit" : "button";
      });
  };

  fioriLogin.zSetBusy = function (bBusy) {
    console.log("zSetBusy", bBusy);
    if (bBusy) {
      fioriLogin.addClass("zShowBusy", document.body);
    } else {
      fioriLogin.removeClass("zShowBusy", document.body);
    }
  };

  // Add / Update a key-value pair in the URL query parameters
  fioriLogin.zUpdateUrlParameter = function (uri, key, value) {
    // remove the hash part before operating on the uri
    var i = uri.indexOf("#");
    var hash = i === -1 ? "" : uri.substr(i);
    uri = i === -1 ? uri : uri.substr(0, i);

    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf("?") !== -1 ? "&" : "?";
    if (uri.match(re)) {
      uri = uri.replace(re, "$1" + key + "=" + value + "$2");
    } else {
      uri = uri + separator + key + "=" + value;
    }
    return uri + hash; // finally append the hash as well
  };
})();
if (document.readyState === "complete") {
  fioriLogin.main();
} else {
  document.onreadystatechange = function () {
    if (document.readyState === "complete") {
      fioriLogin.main();
    }
  };
}
