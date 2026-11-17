const duty = document.getElementById("duty");
const logout = document.getElementById("logout");
const locked = document.getElementById("locked");
const desk = document.getElementById("desk");
const lockNote = document.getElementById("lock-note");
const authAlert = document.getElementById("auth-alert");
const registerForm = document.getElementById("register-form");
const signinForm = document.getElementById("signin-form");
const showRegister = document.getElementById("show-register");
const showSignin = document.getElementById("show-signin");
const cork = document.getElementById("cork");
const board = document.getElementById("board");
const count = document.getElementById("count");
const search = document.getElementById("search");
const pinForm = document.getElementById("pin-form");
const noticeForm = document.getElementById("notice-form");
const line = document.getElementById("line");
const pin = document.getElementById("pin");
const alertBox = document.getElementById("alert");
const noticeName = document.getElementById("notice-name");
const drawer = document.getElementById("drawer");
const drawerKicker = document.getElementById("drawer-kicker");
const drawerTitle = document.getElementById("drawer-title");
const drawerMeta = document.getElementById("drawer-meta");
const noticeOut = document.getElementById("notice-out");
const ack = document.getElementById("ack");

const POSTED = [
  "Tide at Penang turns at 14:10",
  "Visitor gate closes at 21:00",
  "Pilot boat leaves Lumut",
  "Berth 4 is closed for paint",
];

let currentUser = null;
let widgets = [];
let notices = [];
let filter = "all";
let openKey = "";

function setAlert(node, text) {
  if (text) {
    node.hidden = false;
    node.textContent = text;
  } else {
    node.hidden = true;
    node.textContent = "";
  }
}

function loadSet(name) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(name) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    return new Set();
  }
}

function saveSet(name, values) {
  sessionStorage.setItem(name, JSON.stringify(Array.from(values)));
}

function mark(name, key) {
  const values = loadSet(name);
  values.add(key);
  saveSet(name, values);
}

function seen(key) {
  return loadSet("nb-read").has(key) || loadSet("nb-ack").has(key);
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(function () { return {}; });
  return { response: response, body: body };
}

function showAuthForm(which) {
  const registerOn = which === "register";
  registerForm.hidden = !registerOn;
  signinForm.hidden = registerOn;
  showRegister.setAttribute("aria-selected", registerOn ? "true" : "false");
  showSignin.setAttribute("aria-selected", registerOn ? "false" : "true");
  setAlert(authAlert, "");
}

function slipTitle(widget) {
  const text = widget.text || "";
  if (text.indexOf("Tide at Penang") !== -1) return "Penang tide";
  if (text.indexOf("Visitor gate") !== -1) return "Visitor gate";
  if (text.indexOf("Pilot boat") !== -1) return "Lumut pilot";
  if (text.indexOf("Berth 4") !== -1) return "Berth 4";
  return text || widget.type || "Slip";
}

function isPosted(text) {
  return POSTED.some(function (line) { return (text || "").indexOf(line) !== -1; });
}

function matches(query, parts) {
  if (!query) return true;
  const hay = parts.join(" ").toLowerCase();
  return hay.indexOf(query) !== -1;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function openDrawer(kicker, title, meta, body, key) {
  openKey = key;
  drawerKicker.textContent = kicker;
  drawerTitle.textContent = title;
  drawerMeta.textContent = meta;
  noticeOut.textContent = body;
  mark("nb-read", key);
  if (!drawer.open) drawer.showModal();
  render();
}

function closeDrawer() {
  openKey = "";
  if (drawer.open) drawer.close();
}

async function openNotice(name) {
  const response = await fetch("/notice?name=" + encodeURIComponent(name), {
    headers: { Accept: "text/plain" },
  });
  const text = await response.text();
  const posted = notices.find(function (item) { return item.name === name; });
  openDrawer(
    "Notice",
    posted ? posted.title : name || "Notice",
    response.ok ? "Posted" : "Refused",
    text,
    "notice:" + name
  );
}

function cardButton(className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  return button;
}

function render() {
  const query = search.value.trim().toLowerCase();
  const read = loadSet("nb-read");
  const acked = loadSet("nb-ack");
  while (board.firstChild) board.removeChild(board.firstChild);

  const noticeCards = notices.filter(function (item) {
    if (filter === "tide" || filter === "clock") return false;
    return matches(query, [item.title || "", item.name || ""]);
  });
  const slips = widgets.filter(function (widget) {
    if (filter === "notice") return false;
    if (filter === "tide" && widget.type !== "tide") return false;
    if (filter === "clock" && widget.type !== "clock") return false;
    return matches(query, [slipTitle(widget), widget.text || "", widget.type || ""]);
  });

  noticeCards.forEach(function (item) {
    const key = "notice:" + item.name;
    const priority = item.name === "standing-order";
    const button = cardButton("slip slip-notice" + (priority ? " slip-priority" : "") + ((read.has(key) || acked.has(key)) ? " is-read" : ""));
    const clip = el("span", "clip");
    clip.setAttribute("aria-hidden", "true");
    const top = el("span", "card-top");
    top.appendChild(el("span", "kind", "Notice"));
    if (!seen(key)) top.appendChild(el("span", "dot"));
    const title = el("span", "title", item.title || item.name);
    const snippet = el("p", "snippet", priority
      ? "The duty order for this board. Open the slip to read it."
      : "The crew roster. Open the slip to read it.");
    const row = el("span", "meta-row");
    row.appendChild(el("span", "tag", "Posted"));
    button.appendChild(clip);
    button.appendChild(top);
    button.appendChild(title);
    button.appendChild(snippet);
    button.appendChild(row);
    button.addEventListener("click", function () {
      noticeName.value = item.name || "";
      openNotice(item.name || "").catch(function () {
        openDrawer("Notice", item.name || "Notice", "Refused", "The notice did not open.", "notice:" + item.name);
      });
    });
    board.appendChild(button);
  });

  slips.forEach(function (widget) {
    const title = slipTitle(widget);
    const key = "slip:" + (widget.type || "") + ":" + (widget.text || "");
    const posted = isPosted(widget.text);
    const kind = widget.type || "line";
    const button = cardButton("slip slip-" + kind + ((read.has(key) || acked.has(key)) ? " is-read" : ""));
    const tack = el("span", "tack");
    tack.setAttribute("aria-hidden", "true");
    const top = el("span", "card-top");
    top.appendChild(el("span", "kind", kind));
    if (!seen(key)) top.appendChild(el("span", "dot"));
    const heading = el("span", "title", title);
    const snippet = el("p", "snippet", widget.text || "—");
    const row = el("span", "meta-row");
    row.appendChild(el("span", "tag", posted ? "Posted" : "Pinned"));
    button.appendChild(tack);
    button.appendChild(top);
    button.appendChild(heading);
    button.appendChild(snippet);
    button.appendChild(row);
    button.addEventListener("click", function () {
      openDrawer(kind, title, posted ? "Posted when the board started" : "Pinned on this visit", widget.text || "—", key);
    });
    board.appendChild(button);
  });

  if (!noticeCards.length && !slips.length) {
    board.appendChild(el("p", "empty", "Nothing on the board matches."));
  }

  const slipCount = widgets.length;
  const noticeCount = notices.length;
  count.textContent = slipCount + " slips · " + noticeCount + " notices";
  pinForm.hidden = filter === "notice";
  noticeForm.hidden = filter === "tide" || filter === "clock";
}

async function refresh() {
  const response = await fetch("/board", { headers: { Accept: "application/json" } });
  if (!response.ok) return;
  const payload = await response.json();
  widgets = payload.widgets || [];
  render();
}

async function loadNotices() {
  const response = await fetch("/notices", { headers: { Accept: "application/json" } });
  if (!response.ok) return;
  const payload = await response.json();
  notices = payload.notices || [];
  render();
}

async function showSession(user) {
  currentUser = user || null;
  const signed = Boolean(currentUser);
  locked.hidden = signed;
  desk.hidden = signed;
  cork.hidden = !signed;
  logout.hidden = !signed;
  if (!signed) {
    duty.textContent = "Locked";
    closeDrawer();
    return;
  }
  duty.textContent = currentUser === "admin" ? "Duty officer" : "Visitor";
  await loadNotices();
  await refresh();
}

showRegister.addEventListener("click", function () { showAuthForm("register"); });
showSignin.addEventListener("click", function () { showAuthForm("signin"); });

registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  setAlert(authAlert, "");
  const result = await postJson("/register", {
    username: document.getElementById("reg-user").value,
    password: document.getElementById("reg-pass").value,
  });
  if (!result.response.ok) {
    setAlert(authAlert, result.body.error || "Registration was refused.");
    return;
  }
  await showSession(result.body.user);
});

signinForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  setAlert(authAlert, "");
  const result = await postJson("/login", {
    username: document.getElementById("user").value,
    password: document.getElementById("pass").value,
  });
  if (!result.response.ok) {
    setAlert(authAlert, result.body.error || "Those credentials were refused.");
    return;
  }
  await showSession(result.body.user);
});

logout.addEventListener("click", async function () {
  await fetch("/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  widgets = [];
  notices = [];
  await showSession(null);
});

let sampleFilter = "all";
const sampleSearch = document.getElementById("sample-search");

function renderSamples() {
  const query = sampleSearch.value.trim().toLowerCase();
  document.querySelectorAll("#samples .sample").forEach(function (card) {
    const kind = card.dataset.kind || "";
    const title = card.querySelector(".title").textContent.toLowerCase();
    const kindOk = sampleFilter === "all" || kind === sampleFilter;
    card.hidden = !(kindOk && (!query || title.indexOf(query) !== -1));
  });
}

document.querySelectorAll("#locked .chips button").forEach(function (button) {
  button.addEventListener("click", function () {
    sampleFilter = button.dataset.sample || "all";
    document.querySelectorAll("#locked .chips button").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip === button ? "true" : "false");
    });
    renderSamples();
  });
});

sampleSearch.addEventListener("input", renderSamples);

document.querySelectorAll("#samples .sample").forEach(function (card) {
  card.addEventListener("click", function () {
    lockNote.hidden = false;
    document.getElementById("reg-user").focus();
  });
});

document.querySelectorAll("#cork .chips button").forEach(function (button) {
  button.addEventListener("click", function () {
    filter = button.dataset.filter || "all";
    document.querySelectorAll(".chips button").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip === button ? "true" : "false");
    });
    render();
  });
});

search.addEventListener("input", render);
search.addEventListener("keyup", render);
search.addEventListener("search", render);

pinForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  setAlert(alertBox, "");
  pin.disabled = true;
  try {
    const response = await fetch("/widgets", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: line.value,
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      setAlert(alertBox, payload.error || "That widget type is not on the board list.");
      return;
    }
    await refresh();
  } catch (err) {
    setAlert(alertBox, "The board did not answer.");
  } finally {
    pin.disabled = false;
  }
});

noticeForm.addEventListener("submit", function (event) {
  event.preventDefault();
  openNotice(noticeName.value).catch(function () {
    openDrawer("Notice", noticeName.value || "Notice", "Refused", "The notice did not open.", "notice:" + noticeName.value);
  });
});

ack.addEventListener("click", function () {
  if (openKey) {
    mark("nb-ack", openKey);
    mark("nb-read", openKey);
  }
  closeDrawer();
  render();
});

document.getElementById("close-drawer").addEventListener("click", closeDrawer);
drawer.addEventListener("click", function (event) {
  if (event.target === drawer) closeDrawer();
});

fetch("/me", { headers: { Accept: "application/json" } })
  .then(function (response) { return response.json(); })
  .then(function (body) { return showSession(body.user || null); })
  .catch(function () { setAlert(authAlert, "The board did not answer."); });
