import 'reflect-metadata';
import { Module, Controller, Get, Catch, HttpException } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyReply } from 'fastify';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { TokenGuard } from './auth.guard.js';
import { ZodError } from 'zod';
import { StudioHost } from '../../../integrations/langchain/host.js';
import { StudioController, STUDIO } from './studio.controller.js';
import type { Resources } from './resources.js';
import { RESOURCES, makeResources } from './resources.js';
import { AgentError } from '../../../src/core/errors.js';
@Controller()
class HealthController {
    @Get('health')
    health() { return { ok: true, service: 'ts-agent-api', version: '0.2.0' }; }
}
@Catch()
class SafeErrorFilter implements ExceptionFilter {
    catch(error: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<FastifyReply>();
        const status = error instanceof ZodError ? 400 : error instanceof HttpException ? error.getStatus() : error instanceof AgentError ? (error.code === 'NOT_FOUND' ? 404 : ['CONFLICT', 'RUN_BUSY'].includes(error.code) ? 409 : 400) : 500;
        const code = error instanceof AgentError ? error.code : error instanceof ZodError ? 'VALIDATION_ERROR' : error instanceof HttpException ? 'HTTP_ERROR' : 'INTERNAL_ERROR';
        response.status(status).send({ error: { code, message: status === 500 ? '服务内部错误，请根据服务器日志排查' : error instanceof Error ? error.message : '请求失败' } });
    }
}
@Module({ controllers: [HealthController, AgentController, StudioController], providers: [TokenGuard, AgentService, { provide: RESOURCES, useFactory: makeResources }, { provide: STUDIO, inject: [RESOURCES], useFactory: (r: Resources) => StudioHost.create(r, process.cwd()) }] })
export class AppModule {
}
async function bootstrap() {
    if ((process.env['API_AUTH_TOKEN'] ?? '').length < 32)
        throw new Error('API_AUTH_TOKEN 至少 32 字符；先运行 node scripts/init-env.mjs');
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 65536, trustProxy: false }), { logger: ['error', 'warn', 'log'] });
    app.enableCors({ origin: (process.env['WEB_ORIGIN'] ?? 'http://127.0.0.1:3000,http://localhost:3000').split(','), methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID'], credentials: false });
    app.useGlobalFilters(new SafeErrorFilter());
    app.enableShutdownHooks();
    await app.listen(Number(process.env['PORT'] ?? 3001), process.env['HOST'] ?? '127.0.0.1');
}
if (!process.env['NEST_TEST_IMPORT'])
    await bootstrap();
