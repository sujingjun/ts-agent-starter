import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenGuard } from '../src/auth.guard.js';
import type { ExecutionContext } from '@nestjs/common';
function context(token: string) { return { switchToHttp() { return { getRequest() { return { headers: { authorization: token } }; } }; } } as ExecutionContext; }
test('API 必须显式提供合法访问令牌', () => { process.env['API_AUTH_TOKEN'] = 'a'.repeat(40); const guard = new TokenGuard(); assert.equal(guard.canActivate(context('Bearer ' + 'a'.repeat(40))), true); assert.throws(() => guard.canActivate(context('Bearer wrong'))); assert.throws(() => guard.canActivate(context(''))); });
