(function () {
  var WEBHOOK_URL = "https://mayureshpandit.app.n8n.cloud/webhook-test/76c53030-e1fd-4de2-86a4-15d253d4779b";

  var dropZone = document.getElementById("drop-zone");
  var fileInput = document.getElementById("file-input");
  var viewer = document.getElementById("viewer");
  var pdfFrame = document.getElementById("pdf-frame");
  var replaceBtn = document.getElementById("replace-btn");
  var openLink = document.getElementById("open-link");
  var fileChip = document.getElementById("file-chip");
  var fileNameEl = document.getElementById("file-name");
  var fileSizeEl = document.getElementById("file-size");
  var uploadError = document.getElementById("upload-error");
  var messages = document.getElementById("messages");
  var suggestions = document.getElementById("suggestions");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var sendBtn = document.getElementById("send-btn");

  var currentUrl = null;
  var currentFile = null;
  var pending = false;

  // ---------- Contract upload and preview ----------
  function showError(text) {
    uploadError.textContent = text;
    uploadError.hidden = !text;
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function loadFile(file) {
    if (!file) return;
    var isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      showError("That file isn't a PDF. Please choose a PDF contract.");
      return;
    }
    showError("");
    currentFile = file;

    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(file);
    pdfFrame.src = currentUrl;
    openLink.href = currentUrl;

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatSize(file.size);
    fileChip.hidden = false;

    dropZone.hidden = true;
    viewer.hidden = false;
    replaceBtn.hidden = false;
    openLink.hidden = false;
    suggestions.hidden = false;
    chatInput.placeholder = "Ask a question about " + file.name + "…";

    addMessage("Loaded " + file.name + ". What would you like to know?", "bot");
  }

  function pickFile() { fileInput.click(); }

  dropZone.addEventListener("click", pickFile);
  dropZone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickFile();
    }
  });
  replaceBtn.addEventListener("click", pickFile);
  fileInput.addEventListener("change", function () {
    loadFile(fileInput.files[0]);
    fileInput.value = ""; // allow choosing the same file again
  });

  // Drag and drop works on the whole contract area, even with a PDF showing
  var contractBody = document.querySelector(".contract-body");
  ["dragenter", "dragover"].forEach(function (evt) {
    contractBody.addEventListener(evt, function (e) {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    contractBody.addEventListener(evt, function (e) {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });
  contractBody.addEventListener("drop", function (e) {
    loadFile(e.dataTransfer.files[0]);
  });

  // ---------- Chat ----------
  function scrollToEnd() {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(text, who) {
    var el = document.createElement("div");
    el.className = "msg " + who;
    el.textContent = text; // never parsed as HTML
    messages.appendChild(el);
    scrollToEnd();
    return el;
  }

  // Assistant reply: answer, then citations, then reasoning (all via textContent)
  function addAnswer(data) {
    var el = document.createElement("div");
    el.className = "msg bot answer";

    var resp = document.createElement("p");
    resp.className = "answer-text";
    resp.textContent = data.response;
    el.appendChild(resp);

    if (data.citation.length) {
      var label = document.createElement("p");
      label.className = "answer-label";
      label.textContent = "Citations";
      el.appendChild(label);
      var list = document.createElement("ul");
      list.className = "citations";
      data.citation.forEach(function (c) {
        var li = document.createElement("li");
        li.textContent = c;
        list.appendChild(li);
      });
      el.appendChild(list);
    }

    if (data.reasoning) {
      var rl = document.createElement("p");
      rl.className = "answer-label";
      rl.textContent = "Reasoning";
      el.appendChild(rl);
      var rt = document.createElement("p");
      rt.className = "reasoning";
      rt.textContent = data.reasoning;
      el.appendChild(rt);
    }

    messages.appendChild(el);
    scrollToEnd();
  }

  function addTyping() {
    var el = document.createElement("div");
    el.className = "msg bot typing";
    el.setAttribute("aria-label", "Assistant is typing");
    el.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(el);
    scrollToEnd();
    return el;
  }

  // Accepts the documented object, or n8n variants (single-item array, JSON string)
  function normalize(payload) {
    if (typeof payload === "string") payload = JSON.parse(payload);
    if (Array.isArray(payload)) payload = payload[0];
    if (!payload || typeof payload.response !== "string") {
      throw new Error("Unexpected response shape");
    }
    return {
      response: payload.response,
      citation: Array.isArray(payload.citation) ? payload.citation.map(String) : [],
      reasoning: typeof payload.reasoning === "string" ? payload.reasoning : ""
    };
  }

  function setPending(on) {
    pending = on;
    chatInput.disabled = on;
    sendBtn.disabled = on || chatInput.value.trim() === "";
  }

  function send(text) {
    text = text.trim();
    if (!text || pending) return;

    if (!currentFile) {
      addMessage(text, "user");
      addMessage("Please upload a PDF contract first, then ask your question.", "bot");
      return;
    }

    addMessage(text, "user");
    var typing = addTyping();
    setPending(true);

    var form = new FormData();
    form.append("file", currentFile, currentFile.name);
    form.append("message", text);

    fetch(WEBHOOK_URL, { method: "POST", body: form })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (body) {
        var data = normalize(JSON.parse(body));
        typing.remove();
        addAnswer(data);
      })
      .catch(function (err) {
        typing.remove();
        addMessage("Sorry, I couldn't get an answer from the contract service (" + err.message + "). Please try again.", "bot error-msg");
      })
      .then(function () {
        setPending(false);
        chatInput.focus();
      });
  }

  function updateSendState() {
    sendBtn.disabled = pending || chatInput.value.trim() === "";
  }

  chatInput.addEventListener("input", updateSendState);
  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    send(chatInput.value);
    chatInput.value = "";
    updateSendState();
    chatInput.focus();
  });

  suggestions.addEventListener("click", function (e) {
    if (e.target.classList.contains("chip")) send(e.target.textContent);
  });
})();
