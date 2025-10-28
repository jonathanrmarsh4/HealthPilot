// Replit Auth integration for OpenID Connect authentication
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import crypto from "crypto";

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
  // Determine role from claims - check both 'role' and 'is_admin' for test compatibility
  const isAdmin = claims["role"] === "admin" || claims["is_admin"] === true;
  
  await storage.upsertUser({
    id: claims["sub"],
    username: "", // OAuth users don't have usernames
    password: "", // OAuth users don't have passwords
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: isAdmin ? "admin" : "user", // Extract role from OIDC claims if present
  });
}

// Helper to determine which OAuth strategy domain to use
// In-memory store for mobile auth tokens (in production, use Redis or database)
const mobileAuthTokens = new Map<string, { userId: string, expiresAt: number }>();

// Generate a secure random token for mobile auth
function generateMobileAuthToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
  mobileAuthTokens.set(token, { userId, expiresAt });
  
  // Clean up expired tokens
  setTimeout(() => {
    mobileAuthTokens.delete(token);
  }, 5 * 60 * 1000);
  
  return token;
}

// Verify and consume a mobile auth token
async function verifyMobileAuthToken(token: string): Promise<string | null> {
  const data = mobileAuthTokens.get(token);
  if (!data) return null;
  
  if (Date.now() > data.expiresAt) {
    mobileAuthTokens.delete(token);
    return null;
  }
  
  // Token is one-time use
  mobileAuthTokens.delete(token);
  return data.userId;
}

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
    const domain = getOAuthDomain(req.hostname);
    console.log("🔐 Login request:", {
      requestHostname: req.hostname,
      mappedDomain: domain,
      strategyName: `replitauth:${domain}`
    });
    
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const domain = getOAuthDomain(req.hostname);
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    
    console.log("🔄 OAuth callback:", {
      requestHostname: req.hostname,
      mappedDomain: domain,
      strategyName: `replitauth:${domain}`,
      hasCode: !!req.query.code,
      hasError: !!req.query.error,
      isMobile,
      userAgent
    });
    
    // If Replit returned an error, log it clearly
    if (req.query.error) {
      console.error("❌ OAuth Error from Replit:", {
        error: req.query.error,
        description: req.query.error_description
      });
    }
    
    passport.authenticate(`replitauth:${domain}`, (err: any, user: any) => {
      if (err) {
        console.error("❌ OAuth authentication error:", err);
        return res.redirect("/api/login");
      }
      
      if (!user) {
        console.error("❌ No user returned from OAuth");
        return res.redirect("/api/login");
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("❌ Login error:", loginErr);
          return res.redirect("/api/login");
        }
        
        // For mobile, generate a one-time token and redirect to app URL scheme
        if (isMobile) {
          const userId = user.claims?.sub;
          if (userId) {
            // Check if we've already generated a token in this session (prevent double redirect)
            if ((req.session as any).mobileAuthGenerated) {
              console.log("⚠️ Mobile auth already generated in this session, skipping duplicate");
              return res.send('<html><body><h1>Login Complete</h1><p>You can close this window and return to the app.</p></body></html>');
            }
            
            const token = generateMobileAuthToken(userId);
            (req.session as any).mobileAuthGenerated = true;
            console.log("📱 Generated mobile auth token for user:", userId);
            return res.redirect(`healthpilot://auth?token=${token}`);
          } else {
            console.error("❌ No user ID in claims for mobile auth");
            return res.redirect("/api/login");
          }
        }
        
        // For web, redirect to home
        res.redirect("/");
      });
    })(req, res, next);
  });

  // Endpoint for mobile app to exchange token for session
  app.post("/api/mobile-auth", async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }
    
    const userId = await verifyMobileAuthToken(token);
    if (!userId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a long-lived session token for the mobile app
      const sessionToken = crypto.randomBytes(32).toString('base64url');
      
      // Store session token in database (you'll need to add this to schema)
      await storage.createMobileSession({
        token: sessionToken,
        userId: userId,
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
      });
      
      console.log("✅ Mobile session created for user:", userId);
      
      res.json({ 
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
        }
      });
    } catch (error) {
      console.error("❌ Error creating mobile session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
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
  // Check for mobile auth token in Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const dbUser = await storage.getUserByMobileToken(token);
    
    if (dbUser) {
      console.log("✅ Mobile auth successful:", dbUser.id);
      // Create a user object that matches the session-based format
      (req as any).user = {
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          profile_image_url: dbUser.profileImageUrl,
        },
        // Set a far-future expiry for mobile tokens
        expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      };
      return next();
    } else {
      console.log("❌ Invalid mobile auth token");
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  // Fall back to session-based auth for web
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
    
    // Save the updated session
    req.login(user, (err) => {
      if (err) {
        console.log("❌ Failed to save updated session after token refresh");
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    });
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
    // Check OIDC claims first (for test environment support)
    console.log(`🔍 Checking admin access for ${user.claims?.sub}:`, {
      hasClaims: !!user.claims,
      claimKeys: user.claims ? Object.keys(user.claims) : [],
      role: user.claims?.role,
      is_admin: user.claims?.is_admin,
    });
    
    const isAdminFromClaims = user.claims?.role === "admin" || user.claims?.is_admin === true;
    
    // If claims indicate admin, allow access
    if (isAdminFromClaims) {
      console.log(`✅ Admin access granted via OIDC claims for ${user.claims.sub}`);
      return next();
    }
    
    // Otherwise check database record
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser || dbUser.role !== "admin") {
      console.log(`❌ Admin access denied for ${user.claims.sub}: dbUser role=${dbUser?.role || 'not found'}`);
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
