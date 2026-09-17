import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
/** 单开发者 / 单租户令牌入口。企业 SSO、细粒度角色和用户生命周期不在此实现中。 */
@Injectable()
export class TokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
        }>();
        const expected = process.env['API_AUTH_TOKEN'];
        if (!expected || expected.length < 32)
            throw new UnauthorizedException('服务端访问令牌未正确配置');
        const authorization = request.headers['authorization'] ?? '';
        const actual = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        if (!actual || !timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest()))
            throw new UnauthorizedException('访问令牌无效');
        return true;
    }
}
