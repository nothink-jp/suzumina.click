import { NextResponse } from "next/server";

/**
 * Health check endpoint for Cloud Run
 * Returns 200 OK if the application is healthy
 */
export async function GET() {
  try {
    // Basic health check - verify the application is running
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "0.1.0",
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    // Return 503 Service Unavailable if health check fails
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}

// Support HEAD requests for load balancer health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}
