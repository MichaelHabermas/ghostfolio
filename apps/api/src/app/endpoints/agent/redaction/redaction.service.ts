import { Injectable } from '@nestjs/common';

import type { ToolResponse } from '../types';

const ACCOUNT_KEY_PATTERN = /account(name|label)?$/i;
const PII_KEY_PATTERN =
  /(email|username|user_name|firstname|lastname|fullname|accountownername|ownername)/i;
const VALUE_KEY_PATTERN =
  /(balance|value|amount|worth|netperformance|currentvalue|investment|total)/i;
const NON_MONETARY_KEY_PATTERN = /(percentage|ratio|count|quantity|price|weight)/i;

@Injectable()
export class RedactionService {
  public redactToolResponse(
    _toolName: string,
    response: ToolResponse<unknown>
  ): ToolResponse<unknown> {
    if (!response.success || response.data === undefined) {
      return response;
    }

    const accountLabels = new Map<string, string>();
    const data = this.redactValue(response.data, [], accountLabels);

    return {
      ...response,
      data
    };
  }

  private redactValue(
    value: unknown,
    path: string[],
    accountLabels: Map<string, string>
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.redactValue(item, [...path, String(index)], accountLabels)
      );
    }

    if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const redacted: Record<string, unknown> = {};

      for (const [key, child] of Object.entries(source)) {
        if (PII_KEY_PATTERN.test(key)) {
          continue;
        }

        const currentPath = [...path, key];

        if (typeof child === 'string' && ACCOUNT_KEY_PATTERN.test(key)) {
          redacted[key] = this.getAccountLabel(child, accountLabels);
          continue;
        }

        redacted[key] = this.redactValue(child, currentPath, accountLabels);
      }

      return redacted;
    }

    if (typeof value === 'number') {
      const key = path[path.length - 1] ?? '';
      if (this.shouldRoundValueKey(key)) {
        return Math.round(value / 100) * 100;
      }
    }

    return value;
  }

  private getAccountLabel(
    rawAccountName: string,
    accountLabels: Map<string, string>
  ): string {
    const existing = accountLabels.get(rawAccountName);
    if (existing) {
      return existing;
    }

    const label = `Account ${this.toAlphaLabel(accountLabels.size)}`;
    accountLabels.set(rawAccountName, label);

    return label;
  }

  private shouldRoundValueKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return (
      VALUE_KEY_PATTERN.test(normalized) &&
      !NON_MONETARY_KEY_PATTERN.test(normalized)
    );
  }

  private toAlphaLabel(index: number): string {
    let n = index;
    let output = '';

    do {
      output = String.fromCharCode(65 + (n % 26)) + output;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return output;
  }
}
