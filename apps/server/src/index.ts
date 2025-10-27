import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import routes from "@/rpc/connect";
import fastifyCors from "@fastify/cors";
import { cors as connectCors } from "@connectrpc/connect";
import { authInterceptor } from "@/rpc/interceptor";
import logger from "@/lib/logger";
import { auth } from "@/lib/auth";

async function startServer() {
  const server = fastify();
  
  // Configuration CORS pour production
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'https://poky-eta.vercel.app'];
  
  await server.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      logger.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: [...connectCors.allowedMethods],
    allowedHeaders: [...connectCors.allowedHeaders, "Authorization"],
    exposedHeaders: [...connectCors.exposedHeaders],
    credentials: true,
  });
  
  await server.register(fastifyConnectPlugin, {
    routes,
    interceptors: [authInterceptor],
  });
  
  server.get("/", (_, reply) => {
    reply.type("text/plain");
    reply.code(200);
    reply.send("Hello World!");
  });
  
  // Health check endpoint for Traefik
  server.get("/health", (_, reply) => {
    reply.type("application/json");
    reply.code(200);
    reply.send({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0"
    });
  });

  server.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`);
        
        // Convert Fastify headers to standard Headers object
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });
  
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });
  
        // Process authentication request
        const response = await auth.handler(req);
  
        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
  
      } catch (error) {
        logger.error("Authentication Error:", error);
        reply.status(500).send({ 
          error: "Internal authentication error",
          code: "AUTH_FAILURE"
        });
      }
    }
  });
  
  // Configuration serveur pour production
  const host = process.env.HOST || "0.0.0.0";
  const port = parseInt(process.env.PORT || "3000");
  
  await server.listen({ host, port });
  logger.info(`Server is listening at http://${host}:${port}`);
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
