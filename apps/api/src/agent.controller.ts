import { Controller, Get, Post, Body, Param, UseGuards, Sse, Headers, Query } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AgentService } from './agent.service.js';
import { TokenGuard } from './auth.guard.js';
import { validate, s, objectInput } from '../../../src/core/schema.js';
import { invariant } from '../../../src/core/errors.js';
@Controller('api')
@UseGuards(TokenGuard)
export class AgentController {
    private readonly service: AgentService;
    constructor(
    @Inject(AgentService)
    service: AgentService) { this.service = service; }
    @Get('capabilities')
    capabilities() { return this.service.capabilities(); }
    @Get('runs')
    list() { return this.service.list(); }
    @Post('runs')
    create(
    @Body()
    body: unknown) {
        const schema = s.object({ prompt: { type: 'string', minLength: 1, maxLength: 16000 }, previousRunId: s.string(36), skill: s.string(64) }, ['prompt']);
        validate(schema, body);
        const input = objectInput(body);
        return this.service.create(input['prompt'] as string, input['previousRunId'] as string | undefined, input['skill'] as string | undefined);
    }
    @Get('runs/:id')
    get(
    @Param('id')
    id: string) { return this.service.get(id); }
    @Post('runs/:id/approve')
    approve(
    @Param('id')
    id: string, 
    @Body()
    body: unknown) { validate(s.object({ callId: s.string(200), allow: { type: 'boolean' } }), body); const input = objectInput(body); return this.service.approve(id, input['callId'] as string, input['allow'] as boolean); }
    @Post('runs/:id/reconcile')
    reconcile(
    @Param('id')
    id: string, 
    @Body()
    body: unknown) {
        validate(s.object({ callId: s.string(200), notExecuted: { type: 'boolean' }, result: {} }, ['callId']), body);
        const input = objectInput(body);
        if (input['notExecuted'] === true) {
            invariant(input['result'] === undefined, 'RECONCILIATION_INPUT', '不能同时提供 result 和 notExecuted');
            return this.service.reconcile(id, input['callId'] as string, { kind: 'not_executed' });
        }
        const result = objectInput(input['result']);
        invariant(typeof result['ok'] === 'boolean', 'RECONCILIATION_INPUT', 'result 缺少 ok');
        if (result['ok'] === true) {
            invariant(result['data'] !== undefined, 'RECONCILIATION_INPUT', 'result 缺少 data');
            return this.service.reconcile(id, input['callId'] as string, { kind: 'result', result: { ok: true, data: result['data'] } });
        }
        validate(s.object({ code: s.string(100), message: s.string(2000), retryable: { type: 'boolean' } }), result['error']);
        const error = result['error'] as {
            code: string;
            message: string;
            retryable: boolean;
        };
        return this.service.reconcile(id, input['callId'] as string, { kind: 'result', result: { ok: false, error } });
    }
    @Post('runs/:id/cancel')
    cancel(
    @Param('id')
    id: string) { return this.service.cancel(id); }
    @Post('runs/:id/resume')
    resume(
    @Param('id')
    id: string) { return this.service.resume(id); }
    @Sse('runs/:id/events')
    async events(
    @Param('id')
    id: string, 
    @Query('after')
    after: string | undefined, 
    @Headers('last-event-id')
    last: string | undefined): Promise<Observable<MessageEvent>> {
        await this.service.get(id);
        let cursor = Number(after ?? last ?? 0);
        invariant(Number.isSafeInteger(cursor) && cursor >= 0, 'EVENT_CURSOR', '事件游标不合法');
        return new Observable<MessageEvent>(subscriber => {
            let stopped = false, reading = false;
            const poll = async () => {
                if (stopped || reading)
                    return;
                reading = true;
                try {
                    const state = await this.service.get(id);
                    if (stopped)
                        return;
                    for (const event of state.events)
                        if (event.seq > cursor) {
                            subscriber.next({ id: String(event.seq), type: 'agent', data: event });
                            cursor = event.seq;
                        }
                    if (['completed', 'failed', 'cancelled', 'waiting_approval', 'reconciliation_required'].includes(state.status)) {
                        subscriber.complete();
                    }
                }
                catch (e) {
                    if (!stopped)
                        subscriber.error(e);
                }
                finally {
                    reading = false;
                }
            };
            const timer = setInterval(() => { void poll(); }, 300);
            void poll();
            return () => { stopped = true; clearInterval(timer); };
        });
    }
}
