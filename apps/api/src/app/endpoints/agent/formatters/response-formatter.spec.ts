import { ResponseFormatter } from './response-formatter';

describe('ResponseFormatter', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  describe('format - structured JSON responses', () => {
    it('should parse valid structured JSON response', () => {
      const json = JSON.stringify({
        claims: [
          {
            statement: 'Portfolio value is $100,000',
            source_tool: 'portfolio_performance',
            source_field: 'currentValueInBaseCurrency',
            value: 100000
          }
        ],
        narrative: 'Your portfolio is performing well.'
      });

      const result = formatter.format(json);

      expect(result.narrative).toBe('Your portfolio is performing well.');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toEqual({
        tool: 'portfolio_performance',
        field: 'currentValueInBaseCurrency'
      });
    });

    it('should extract multiple sources from claims array', () => {
      const json = JSON.stringify({
        claims: [
          {
            statement: 'You have 5 holdings',
            source_tool: 'get_holdings',
            source_field: 'holdings',
            value: 5
          },
          {
            statement: '2 rules violated',
            source_tool: 'get_rules_report',
            source_field: 'statistics',
            value: 2
          }
        ],
        narrative: 'Summary here.'
      });

      const result = formatter.format(json);

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].tool).toBe('get_holdings');
      expect(result.sources[1].tool).toBe('get_rules_report');
    });

    it('should omit claims without source_tool or source_field from sources', () => {
      const json = JSON.stringify({
        claims: [
          {
            statement: 'General observation',
            value: 'some value'
          }
        ],
        narrative: 'Narrative text.'
      });

      const result = formatter.format(json);

      expect(result.sources).toHaveLength(0);
    });

    it('should flag high_impact_recommendation when requires_review is true', () => {
      const json = JSON.stringify({
        claims: [],
        narrative: 'Big recommendation.',
        recommendations: [
          {
            action: 'Sell 25% of equities',
            rationale: 'Overweight',
            impact_percentage: 25,
            requires_review: true
          }
        ]
      });

      const result = formatter.format(json);

      expect(result.flags).toContain('high_impact_recommendation');
    });

    it('should not flag high_impact when all requires_review are false', () => {
      const json = JSON.stringify({
        claims: [],
        narrative: 'Small recommendation.',
        recommendations: [
          {
            action: 'Rebalance slightly',
            rationale: 'Minor drift',
            impact_percentage: 2,
            requires_review: false
          }
        ]
      });

      const result = formatter.format(json);

      expect(result.flags).not.toContain('high_impact_recommendation');
    });

    it('should handle JSON embedded in markdown code blocks', () => {
      const json = JSON.stringify({
        claims: [],
        narrative: 'Embedded JSON narrative.'
      });

      const result = formatter.format(`Some text before\n${json}\nsome text after`);

      expect(result.narrative).toBe('Embedded JSON narrative.');
    });
  });

  describe('format - plain text fallback', () => {
    it('should return plain text as narrative when response is not JSON', () => {
      const plainText = 'Your portfolio looks good. You have 5 holdings.';

      const result = formatter.format(plainText);

      expect(result.narrative).toBe(plainText);
      expect(result.sources).toEqual([]);
      expect(result.flags).toContain('plain_text_response');
    });

    it('should fall back to plain text for malformed JSON', () => {
      const malformed = '{ claims: [bad json...';

      const result = formatter.format(malformed);

      expect(result.narrative).toBe(malformed);
      expect(result.sources).toEqual([]);
      expect(result.flags).toContain('plain_text_response');
    });

    it('should return empty sources for plain text', () => {
      const result = formatter.format('Just a plain response.');
      expect(result.sources).toEqual([]);
    });
  });

  describe('format - edge cases', () => {
    it('should handle response with no claims field', () => {
      const json = JSON.stringify({
        narrative: 'No claims here.'
      });

      const result = formatter.format(json);

      expect(result.narrative).toBe('No claims here.');
      expect(result.sources).toEqual([]);
    });

    it('should handle response with no recommendations field', () => {
      const json = JSON.stringify({
        claims: [],
        narrative: 'No recommendations.'
      });

      const result = formatter.format(json);

      expect(result.flags).not.toContain('high_impact_recommendation');
    });

    it('should handle empty claims array', () => {
      const json = JSON.stringify({
        claims: [],
        narrative: 'No data claims.'
      });

      const result = formatter.format(json);

      expect(result.sources).toEqual([]);
    });
  });
});
