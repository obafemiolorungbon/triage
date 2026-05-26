import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { WidgetRateLimitService } from './widget-rate-limit.service';

type WidgetSecurityConfig = {
  widgetKey: string;
  archivedAt: Date | null;
  allowedOrigins: string[];
  devMode: boolean;
  rateLimitPerMinute: number;
  configRateLimitPerMinute: number;
};

type WidgetPublicRequest = Request & {
  body?: { widgetKey?: unknown };
  params?: { widgetKey?: string };
};

@Injectable()
export class WidgetPublicGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: WidgetRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<WidgetPublicRequest>();
    const widgetKey = this.widgetKeyFromRequest(req);
    const widget = await this.prisma.client.widget.findUnique({
      where: { widgetKey },
      select: {
        widgetKey: true,
        archivedAt: true,
        allowedOrigins: true,
        devMode: true,
        rateLimitPerMinute: true,
        configRateLimitPerMinute: true,
      },
    });
    if (!widget || widget.archivedAt) {
      throw new BadRequestException('Invalid widget key');
    }

    this.assertOriginAllowed(req, widget);
    await this.rateLimit.hit({
      widgetKey,
      clientIp: this.clientIp(req),
      bucket: this.bucket(req),
      limit:
        this.bucket(req) === 'config'
          ? widget.configRateLimitPerMinute
          : widget.rateLimitPerMinute,
    });
    return true;
  }

  private widgetKeyFromRequest(req: WidgetPublicRequest) {
    const value = req.params?.widgetKey ?? req.body?.widgetKey;
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException('Invalid widget key');
    }
    return value.trim();
  }

  private bucket(req: Request): 'config' | 'submit' {
    return req.method === 'GET' ? 'config' : 'submit';
  }

  private clientIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private assertOriginAllowed(req: Request, widget: WidgetSecurityConfig) {
    const rules = widget.allowedOrigins.filter(Boolean);
    if (rules.length === 0) return;

    const origin = this.requestOrigin(req);
    if (!origin) {
      throw new ForbiddenException('Widget origin is not allowed');
    }

    if (this.isLocalOrigin(origin)) {
      if (widget.devMode) return;
      throw new ForbiddenException('Widget origin is not allowed');
    }

    if (!rules.some((rule) => this.originMatches(rule, origin))) {
      throw new ForbiddenException('Widget origin is not allowed');
    }
  }

  private requestOrigin(req: Request) {
    const hostOrigin = req.headers['x-triage-host-origin'];
    if (typeof hostOrigin === 'string' && hostOrigin && hostOrigin !== 'null') {
      return this.normalizeOrigin(hostOrigin);
    }
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin && origin !== 'null') {
      return this.normalizeOrigin(origin);
    }
    const referer = req.headers.referer;
    if (typeof referer === 'string' && referer) {
      return this.normalizeOrigin(referer);
    }
    return null;
  }

  private normalizeOrigin(value: string) {
    try {
      return new URL(value).origin.toLowerCase();
    } catch {
      return null;
    }
  }

  private isLocalOrigin(origin: string) {
    try {
      const url = new URL(origin);
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  private originMatches(rule: string, origin: string) {
    try {
      const originUrl = new URL(origin);
      if (!rule.includes('*.')) {
        return this.normalizeOrigin(rule) === origin;
      }
      const match = rule
        .trim()
        .toLowerCase()
        .match(/^(https?):\/\/\*\.([^/:]+)(?::(\d+))?\/?$/);
      if (!match) return false;
      const [, protocol, suffix, port = ''] = match;
      const ruleProtocol = `${protocol}:`;
      if (ruleProtocol !== originUrl.protocol) return false;
      if (port !== originUrl.port) return false;
      return (
        originUrl.hostname !== suffix &&
        originUrl.hostname.endsWith(`.${suffix}`)
      );
    } catch {
      return false;
    }
  }
}
