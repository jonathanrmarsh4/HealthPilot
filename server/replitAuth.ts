// Replit Auth integration for OpenID Connect authentication
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Always use secure cookies
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    username: "", // OAuth users don't have usernames
    password: "", // OAuth users don't have passwords
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

// Helper to determine which OAuth strategy domain to use
function getOAuthDomain(hostname: string): string {
  const configuredDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
  
  // If hostname exactly matches a configured domain, use it
  if (configuredDomains.includes(hostname)) {
    return hostname;
  }
  
  // If REPLIT_DEV_DOMAIN exists and hostname is not a configured domain,
  // assume it's a dev URL (workspace, webview, etc.) and map to dev domain
  if (process.env.REPLIT_DEV_DOMAIN) {
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    // Check if dev domain is in configured domains
    if (configuredDomains.includes(devDomain)) {
      console.log(`📍 Mapping ${hostname} -> ${devDomain} (dev environment)`);
      return devDomain;
    }
  }
  
  // Fallback to first configured domain
  console.log(`⚠️ Unknown domain ${hostname}, using fallback: ${configuredDomains[0]}`);
  return configuredDomains[0];
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log("🎫 Received tokens from OAuth:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenKeys: Object.keys(tokens),
      expiresIn: tokens.expires_in
    });
    const user = {};
    updateUserSession(user, tokens);
    console.log("👤 User object after updateUserSession:", {
      keys: Object.keys(user),
      hasRefreshToken: !!(user as any).refresh_token
    });
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Register strategies for all configured domains
  const configuredDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
  for (const domain of configuredDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`✅ Registered OAuth strategy for: ${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => {
    console.log("📦 Serializing user:", { 
      keys: Object.keys(user),
      hasClaims: !!(user as any).claims,
      hasExpiresAt: !!(user as any).expires_at
    });
    cb(null, user);
  });
  passport.deserializeUser((user: Express.User, cb) => {
    console.log("📤 Deserializing user:", { 
      keys: Object.keys(user),
      hasClaims: !!(user as any).claims,
      hasExpiresAt: !!(user as any).expires_at
    });
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    console.log("🔐 Login request:", {
      requestHostname: req.hostname,
      strategyName: `replitauth:${req.hostname}`
    });
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("🔄 OAuth callback:", {
      requestHostname: req.hostname,
      strategyName: `replitauth:${req.hostname}`,
      hasCode: !!req.query.code,
      hasError: !!req.query.error
    });
    
    // If Replit returned an error, log it clearly
    if (req.query.error) {
      console.error("❌ OAuth Error from Replit:", {
        error: req.query.error,
        description: req.query.error_description
      });
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    console.log("🚪 Logout request - destroying session");
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Error destroying session:", err);
        } else {
          console.log("✅ Session destroyed successfully");
        }
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}/logged-out`,
          }).href
        );
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  console.log("🔍 isAuthenticated check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!user,
    userKeys: user ? Object.keys(user) : [],
    hasClaims: !!user?.claims,
    hasExpiresAt: !!user?.expires_at,
    expiresAt: user?.expires_at,
    sub: user?.claims?.sub
  });

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("❌ Auth failed - missing expires_at or not authenticated - destroying session");
    req.logout(() => {
      req.session.destroy(() => {
        res.status(401).json({ message: "Unauthorized" });
      });
    });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  console.log("⏰ Token expiration check:", {
    currentTime: now,
    expiresAt: user.expires_at,
    isExpired: now > user.expires_at,
    hasRefreshToken: !!user.refresh_token
  });
  
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("❌ Token expired and no refresh_token available - destroying session");
    req.logout(() => {
      req.session.destroy(() => {
        res.status(401).json({ message: "Unauthorized" });
      });
    });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.log("❌ Token refresh failed - destroying session");
    req.logout(() => {
      req.session.destroy(() => {
        res.status(401).json({ message: "Unauthorized" });
      });
    });
    return;
  }
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser || dbUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware for webhook authentication (for external services like iOS Health Auto Export)
// Uses shared secret authentication instead of session-based auth
export const webhookAuth: RequestHandler = async (req, res, next) => {
  const webhookSecret = req.headers['x-webhook-secret'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!webhookSecret || !userId) {
    return res.status(401).json({ 
      message: "Unauthorized - Missing webhook credentials",
      required: "Headers: X-Webhook-Secret and X-User-Id"
    });
  }

  // Verify webhook secret matches environment variable
  const validSecret = process.env.WEBHOOK_SECRET || "dev-webhook-secret-12345";
  if (webhookSecret !== validSecret) {
    return res.status(401).json({ message: "Unauthorized - Invalid webhook secret" });
  }

  // Verify user exists
  try {
    const dbUser = await storage.getUser(userId);
    if (!dbUser) {
      return res.status(401).json({ message: "Unauthorized - Invalid user ID" });
    }

    // Set req.user to match the format expected by routes
    req.user = {
      claims: {
        sub: userId
      }
    } as any;

    next();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
