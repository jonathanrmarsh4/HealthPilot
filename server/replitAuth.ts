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
      secure: process.env.NODE_ENV === "production",
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

// Helper function to check if a domain is a Replit domain
function isReplitDomain(domain: string): boolean {
  const replitPatterns = [
    /\.repl\.co$/,           // workspace URLs
    /\.replit\.dev$/,        // general replit dev URLs
    /\.pike\.replit\.dev$/,  // pike dev URLs
    /\.id\.replit\.dev$/,    // id dev URLs
    /\.rcs\.replit\.dev$/,   // rcs dev URLs
  ];
  
  return replitPatterns.some(pattern => pattern.test(domain));
}

// Track registered strategies to avoid duplicates
const registeredStrategies = new Set<string>();

// Helper to register a strategy for a domain
async function registerStrategyForDomain(domain: string, verify: VerifyFunction) {
  const strategyName = `replitauth:${domain}`;
  
  if (registeredStrategies.has(strategyName)) {
    return strategyName;
  }

  const config = await getOidcConfig();
  const strategy = new Strategy(
    {
      name: strategyName,
      config,
      scope: "openid email profile offline_access",
      callbackURL: `https://${domain}/api/callback`,
    },
    verify,
  );
  
  passport.use(strategy);
  registeredStrategies.add(strategyName);
  console.log(`✅ Registered new auth strategy for domain: ${domain}`);
  
  return strategyName;
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
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Register strategies for all configured domains
  const configuredDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
  for (const domain of configuredDomains) {
    await registerStrategyForDomain(domain, verify);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    const hostname = req.hostname;
    const configuredDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
    
    console.log("🔐 Login attempt:", {
      hostname,
      host: req.headers.host,
      isReplitDomain: isReplitDomain(hostname),
      configuredDomains,
      isConfigured: configuredDomains.includes(hostname)
    });
    
    let strategyName: string;
    
    // If hostname is in configured domains, use it
    if (configuredDomains.includes(hostname)) {
      strategyName = `replitauth:${hostname}`;
    } 
    // If it's a Replit domain but not configured, dynamically register it
    else if (isReplitDomain(hostname)) {
      console.log(`🔧 Dynamically registering strategy for Replit domain: ${hostname}`);
      strategyName = await registerStrategyForDomain(hostname, verify);
    }
    // Otherwise fall back to first configured domain
    else {
      console.log(`⚠️ Unknown domain ${hostname}, using fallback: ${configuredDomains[0]}`);
      strategyName = `replitauth:${configuredDomains[0]}`;
    }
    
    console.log(`Using strategy: ${strategyName}`);
    
    passport.authenticate(strategyName, {
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    const hostname = req.hostname;
    const configuredDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
    
    console.log("🔄 OAuth callback:", {
      hostname,
      host: req.headers.host,
      queryParams: req.query,
      isReplitDomain: isReplitDomain(hostname),
      configuredDomains
    });
    
    let strategyName: string;
    
    // If hostname is in configured domains, use it
    if (configuredDomains.includes(hostname)) {
      strategyName = `replitauth:${hostname}`;
    }
    // If it's a Replit domain but not configured, it should already be registered from /api/login
    else if (isReplitDomain(hostname)) {
      strategyName = `replitauth:${hostname}`;
      // Double-check it's registered (it should be from the login flow)
      if (!registeredStrategies.has(strategyName)) {
        console.log(`🔧 Callback received before login - registering strategy for: ${hostname}`);
        strategyName = await registerStrategyForDomain(hostname, verify);
      }
    }
    // Otherwise fall back to first configured domain
    else {
      console.log(`⚠️ Unknown domain ${hostname}, using fallback: ${configuredDomains[0]}`);
      strategyName = `replitauth:${configuredDomains[0]}`;
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}/logged-out`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
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
