import { getConfig, setConfig } from './Database.js';

/**
 * Read/write helpers for the config table.
 * Thin wrapper around Database config functions with typed accessors.
 */

export function isKillSwitchActive(): boolean {
  return getConfig('kill_switch') === 'true';
}

export function setKillSwitch(active: boolean): void {
  setConfig('kill_switch', active ? 'true' : 'false');
}

export function getPerTradeLimit(): number {
  return parseFloat(getConfig('per_trade_limit') ?? '5');
}

export function setPerTradeLimit(percent: number): void {
  setConfig('per_trade_limit', String(percent));
}

export function getDailyVolumeCap(): number {
  return parseFloat(getConfig('daily_volume_cap') ?? '10');
}

export function setDailyVolumeCap(sol: number): void {
  setConfig('daily_volume_cap', String(sol));
}

export function getSlippageCap(): number {
  return parseFloat(getConfig('slippage_cap') ?? '1');
}

export function setSlippageCap(percent: number): void {
  setConfig('slippage_cap', String(percent));
}

export function getCooldownPeriod(): number {
  return parseInt(getConfig('cooldown_period') ?? '30', 10);
}

export function setCooldownPeriod(seconds: number): void {
  setConfig('cooldown_period', String(seconds));
}

export function getConfirmationThreshold(): number {
  return parseFloat(getConfig('confirmation_threshold') ?? '50');
}

export function setConfirmationThreshold(sol: number): void {
  setConfig('confirmation_threshold', String(sol));
}

export function getAuthToken(): string | undefined {
  return getConfig('auth_token');
}

export function setAuthToken(token: string): void {
  setConfig('auth_token', token);
}
