/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/server/auth/index.ts
import NextAuth, { getServerSession } from "next-auth";

import { authConfig } from "./config";

export const handler = NextAuth(authConfig);

export const auth = () => getServerSession(authConfig);

export const getAuthSession = auth;

export { authConfig };