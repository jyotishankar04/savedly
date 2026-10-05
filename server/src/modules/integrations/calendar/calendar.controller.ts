import type { Request, Response } from "express";
import { ApiResponse } from "../../../shared/response/api-response";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors/app-error";
import { logger } from "../../../shared/utils/logger";
import { signCalendarStateToken, verifyCalendarStateToken } from "../../../shared/utils/jwt";
import { getMemoryById } from "../../memory/memory.service";
import {
  buildGoogleCalendarAuthUrl,
  exchangeGoogleCalendarCode,
  isGoogleCalendarConfigured,
} from "./google-calendar-client";
import {
  bestEffortRevoke,
  connectCalendar,
  createStandaloneCalendarEvent,
  deleteEventForMemory,
  deleteExternalCalendarEvent,
  disconnectCalendar,
  getConnections,
  listEvents,
  pushMemoryToCalendar,
  updateEventForMemory,
  updateExternalCalendarEvent,
  type CalendarProviderKey,
} from "./calendar.service";
import type {
  CreateEventInput,
  ExternalEventParams,
  ListEventsQuery,
  PushEventInput,
  UpdateEventInput,
  UpdateExternalEventInput,
} from "./calendar.schema";
import { db } from "../../../db";
import { calendarConnections } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { CalendarProvider } from "../../../db/enums";
import { decryptToken } from "../../../shared/crypto/token-cipher";
import { isCalendarProviderEnabled, isCalendarSyncEnabled } from "../../feature-flags/feature-flags.service";

async function initiateConnect(req: Request, res: Response, provider: CalendarProviderKey) {
  // Switched off by an admin: back to Integrations, which explains why. This
  // is a page navigation, so a JSON error would leave the user on a blank page.
  if (!(await isCalendarSyncEnabled()) || !(await isCalendarProviderEnabled(provider))) {
    return res.redirect(`${env.FRONTEND_URL}/app/integrations`);
  }
  if (!(await isGoogleCalendarConfigured())) {
    return res.status(503).json(ApiResponse.error("CALENDAR_NOT_CONFIGURED", "Google Calendar isn't configured yet"));
  }

  const state = signCalendarStateToken({ typ: "calendar_connect", userId: req.user!.id, provider });
  const url = await buildGoogleCalendarAuthUrl(state);
  res.redirect(url);
}

async function handleCallback(req: Request, res: Response, provider: CalendarProviderKey) {
  const { code, state } = req.query as { code?: string; state?: string };
  const failureUrl = `${env.FRONTEND_URL}/app/settings?calendar=error`;

  if (!code || !state) return res.redirect(failureUrl);

  const payload = verifyCalendarStateToken(state);
  if (!payload || payload.provider !== provider) return res.redirect(failureUrl);

  try {
    const tokens = await exchangeGoogleCalendarCode(code);
    await connectCalendar(payload.userId, provider, tokens);
  } catch (err) {
    logger.warn({ err, provider }, "[calendar] connect callback failed");
    return res.redirect(failureUrl);
  }

  res.redirect(`${env.FRONTEND_URL}/app/settings?calendar=connected`);
}

export class CalendarController {
  static async listConnections(req: Request, res: Response) {
    const connections = await getConnections(req.user!.id);
    res.status(200).json(ApiResponse.success({ connections }));
  }

  static async connectGoogle(req: Request, res: Response) {
    await initiateConnect(req, res, "google");
  }

  static async googleCallback(req: Request, res: Response) {
    await handleCallback(req, res, "google");
  }

  static async disconnect(req: Request, res: Response) {
    const provider = req.params.provider as CalendarProviderKey;
    const [row] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.userId, req.user!.id),
          eq(calendarConnections.provider, CalendarProvider.GOOGLE),
        ),
      )
      .limit(1);

    await disconnectCalendar(req.user!.id, provider);

    if (row?.encryptedRefreshToken) {
      void bestEffortRevoke(provider, decryptToken(row.encryptedRefreshToken));
    }

    res.status(200).json(ApiResponse.success({ disconnected: true }));
  }

  static async pushEvent(req: Request, res: Response) {
    const { provider } = req.body as PushEventInput;
    const memory = await getMemoryById(req.user!.id, req.params.id as string);

    if (!memory.eventAt) {
      throw new AppError("This memory has no event date set", 400, "NO_EVENT_DATE");
    }

    const result = await pushMemoryToCalendar(req.user!.id, provider, {
      id: memory.id,
      title: memory.title,
      description: memory.description,
      url: memory.url,
      eventAt: memory.eventAt,
    });

    res.status(200).json(ApiResponse.success(result));
  }

  static async listEvents(req: Request, res: Response) {
    const { from, to } = req.query as unknown as ListEventsQuery;
    const events = await listEvents(req.user!.id, { from: new Date(from), to: new Date(to) });
    res.status(200).json(ApiResponse.success({ events }));
  }

  static async createEvent(req: Request, res: Response) {
    const input = req.body as CreateEventInput;
    const result = await createStandaloneCalendarEvent(req.user!.id, input);
    res.status(201).json(ApiResponse.success(result));
  }

  static async updateMemoryEvent(req: Request, res: Response) {
    const input = req.body as UpdateEventInput;
    await updateEventForMemory(req.user!.id, req.params.id as string, input);
    res.status(200).json(ApiResponse.success({ updated: true }));
  }

  static async deleteMemoryEvent(req: Request, res: Response) {
    await deleteEventForMemory(req.user!.id, req.params.id as string);
    res.status(200).json(ApiResponse.success({ deleted: true }));
  }

  static async updateExternalEvent(req: Request, res: Response) {
    const { provider, externalId } = req.params as unknown as ExternalEventParams;
    const input = req.body as UpdateExternalEventInput;
    const durationMs = (input.durationMinutes ?? 60) * 60 * 1000;
    const startAt = new Date(input.startAt).toISOString();
    const endAt = new Date(new Date(input.startAt).getTime() + durationMs).toISOString();
    await updateExternalCalendarEvent(req.user!.id, provider, externalId, {
      title: input.title,
      description: input.description ?? null,
      startAt,
      endAt,
    });
    res.status(200).json(ApiResponse.success({ updated: true }));
  }

  static async deleteExternalEvent(req: Request, res: Response) {
    const { provider, externalId } = req.params as unknown as ExternalEventParams;
    await deleteExternalCalendarEvent(req.user!.id, provider, externalId);
    res.status(200).json(ApiResponse.success({ deleted: true }));
  }
}
