import type { Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

export interface AuthenticatedUser {
    id: number;
    username: string;
}

export interface JwtPayload extends AuthenticatedUser {
    iat?: number;
    exp?: number;
}

export type AuthenticatedRequest<
    P extends ParamsDictionary = ParamsDictionary,
    ResBody = unknown,
    ReqBody = unknown,
    ReqQuery = ParsedQs
> = Request<P, ResBody, ReqBody, ReqQuery> & {
    user?: AuthenticatedUser;
};

export type RequestWithUser<T extends AuthenticatedRequest> = T & {
    user: AuthenticatedUser;
};
