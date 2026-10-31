// UI only checks that a real adapter exists. Gameplay owns validation and rollback.
export function startSession(adapter, session) {
  if (typeof adapter.start !== 'function') throw Object.assign(new Error('游戏启动接口尚未连接，无法入梦。'),{code:'START_UNAVAILABLE'});
  return adapter.start(session);
}
