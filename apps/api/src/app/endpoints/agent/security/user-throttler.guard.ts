import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit by authenticated user ID when available (e.g. agent endpoint behind JWT),
 * otherwise fall back to request IP so unauthenticated paths still get per-client limiting.
 */
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: string } | undefined;
    if (user?.id) {
      return `user:${user.id}`;
    }
    return super.getTracker(req);
  }
}
