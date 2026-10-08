// Penyedia identitas OIDC PALSU untuk menguji login SSO secara lokal (tanpa tenant Pertamina). BUKAN untuk produksi.
//   node scripts/fake-oidc.mjs            (port 4010)
// Aplikasi dijalankan dengan:
//   OIDC_ISSUER=http://localhost:4010 OIDC_CLIENT_ID=uji-client OIDC_CLIENT_SECRET=uji-rahasia pnpm dev
// Kendali uji: GET /_set?email=a@b.c&name=Nama&tamper=1&badnonce=1&badaud=1  (mengatur identitas berikutnya & jenis serangan)
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

const PORT = 4010;
const ISSUER = `http://localhost:${PORT}`;
const CLIENT_ID = "uji-client";
const CLIENT_SECRET = "uji-rahasia";
const { publicKey, privateKey } = await generateKeyPair("RS256");
const { privateKey: wrongKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "uji-1", alg: "RS256", use: "sig" };

let current = { email: "sso.uji@pertamina.example", name: "SSO Uji", tamper: false, badnonce: false, badaud: false };
const codes = new Map();

const json = (res, body, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, ISSUER);
    if (url.pathname === "/.well-known/openid-configuration") {
      return json(res, { issuer: ISSUER, authorization_endpoint: `${ISSUER}/authorize`, token_endpoint: `${ISSUER}/token`, jwks_uri: `${ISSUER}/jwks` });
    }
    if (url.pathname === "/jwks") return json(res, { keys: [jwk] });
    if (url.pathname === "/_set") {
      const q = url.searchParams;
      current = { email: q.get("email") ?? current.email, name: q.get("name") ?? current.name, tamper: q.get("tamper") === "1", badnonce: q.get("badnonce") === "1", badaud: q.get("badaud") === "1" };
      return json(res, current);
    }
    if (url.pathname === "/authorize") {
      const code = randomBytes(12).toString("hex");
      codes.set(code, { nonce: url.searchParams.get("nonce"), challenge: url.searchParams.get("code_challenge"), redirect: url.searchParams.get("redirect_uri"), who: { ...current } });
      const back = new URL(url.searchParams.get("redirect_uri"));
      back.searchParams.set("code", code);
      back.searchParams.set("state", url.searchParams.get("state"));
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (url.pathname === "/token" && req.method === "POST") {
      let raw = "";
      for await (const c of req) raw += c;
      const f = new URLSearchParams(raw);
      const entry = codes.get(f.get("code"));
      if (!entry || f.get("client_id") !== CLIENT_ID || f.get("client_secret") !== CLIENT_SECRET) return json(res, { error: "invalid_client" }, 400);
      const pkce = createHash("sha256").update(f.get("code_verifier") ?? "").digest("base64url");
      if (pkce !== entry.challenge) return json(res, { error: "invalid_grant", error_description: "PKCE gagal" }, 400);
      codes.delete(f.get("code"));
      const idToken = await new SignJWT({ email: entry.who.email, name: entry.who.name, nonce: entry.who.badnonce ? "nonce-salah" : entry.nonce })
        .setProtectedHeader({ alg: "RS256", kid: "uji-1" })
        .setIssuer(ISSUER)
        .setAudience(entry.who.badaud ? "client-lain" : CLIENT_ID)
        .setSubject("uji-" + entry.who.email)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(entry.who.tamper ? wrongKey : privateKey);
      return json(res, { id_token: idToken, access_token: "x", token_type: "Bearer" });
    }
    res.writeHead(404);
    res.end();
  })
  .listen(PORT, () => console.log("fake OIDC siap di", ISSUER));
