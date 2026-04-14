import prisma from './prisma.js';
import { isPostgresDatabase } from './signTables.js';

function adaptSql(sql) {
  if (!isPostgresDatabase()) {
    return sql;
  }

  let index = 0;
  return String(sql).replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function resolveClient(candidate) {
  if (candidate && typeof candidate.$queryRawUnsafe === 'function' && typeof candidate.$executeRawUnsafe === 'function') {
    return candidate;
  }

  return prisma;
}

function extractClientAndParams(args) {
  if (
    args[0]
    && typeof args[0] === 'object'
    && typeof args[0].$queryRawUnsafe === 'function'
    && typeof args[0].$executeRawUnsafe === 'function'
  ) {
    return {
      client: resolveClient(args[0]),
      params: args.slice(1),
    };
  }

  return {
    client: prisma,
    params: args,
  };
}

export function queryRaw(sql, ...args) {
  const { client, params } = extractClientAndParams(args);
  return client.$queryRawUnsafe(adaptSql(sql), ...params);
}

export function executeRaw(sql, ...args) {
  const { client, params } = extractClientAndParams(args);
  return client.$executeRawUnsafe(adaptSql(sql), ...params);
}
