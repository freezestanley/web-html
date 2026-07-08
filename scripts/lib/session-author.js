function getSessionKey(env = process.env) {
  return env.SESSION_KEY || env.SESSION || "";
}

function resolveAuthorFromSession(env = process.env) {
  const sessionKey = getSessionKey(env);
  const parts = sessionKey.split(":");
  if (parts.length >= 6 && parts[0] === "agent" && parts[4] === "dm") {
    return parts[3] || "";
  }
  return "";
}

function getSessionAuthor(env = process.env) {
  return resolveAuthorFromSession(env);
}

module.exports = {
  getSessionAuthor,
  getSessionKey,
  resolveAuthorFromSession
};
