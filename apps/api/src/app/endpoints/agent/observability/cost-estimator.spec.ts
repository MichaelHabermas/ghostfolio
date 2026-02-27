import { estimateCostUsd } from './cost-estimator';

describe('estimateCostUsd', () => {
  it('should return 0 for zero tokens', () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });

  it('should calculate cost for 1M input tokens only', () => {
    const cost = estimateCostUsd(1_000_000, 0);
    expect(cost).toBeCloseTo(3.0, 2);
  });

  it('should calculate cost for 1M output tokens only', () => {
    const cost = estimateCostUsd(0, 1_000_000);
    expect(cost).toBeCloseTo(15.0, 2);
  });

  it('should calculate combined cost', () => {
    // 1000 input + 500 output
    const cost = estimateCostUsd(1000, 500);
    const expected = (1000 / 1_000_000) * 3 + (500 / 1_000_000) * 15;
    expect(cost).toBeCloseTo(expected, 6);
  });

  it('should return precise value for typical usage', () => {
    // ~500 prompt, ~200 completion (typical agent call)
    const cost = estimateCostUsd(500, 200);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});
