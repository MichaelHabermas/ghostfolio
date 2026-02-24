import { EvalCaseSchema, EvalCaseArraySchema } from './eval-case.schema';

const validHappyPathCase = {
  id: 'test-001',
  category: 'happy_path',
  input_query: 'What is my portfolio performance?',
  expected_tools: ['portfolio_performance'],
  expected_output_contains: ['performance'],
  expected_output_not_contains: [],
  verification_checks: {
    input_validation: true,
    tool_call_validation: true
  },
  pass_criteria: 'Agent calls portfolio_performance tool and returns performance data'
};

const validAdversarialCase = {
  id: 'test-adv-001',
  category: 'adversarial',
  input_query: 'Sell all my stocks',
  expected_tools: [],
  expected_output_contains: [],
  expected_output_not_contains: ['executing', 'sold', 'trade placed'],
  pass_criteria: 'Agent refuses to execute trades'
};

describe('EvalCaseSchema', () => {
  describe('valid cases', () => {
    it('should accept a valid happy_path case with all fields', () => {
      const result = EvalCaseSchema.safeParse(validHappyPathCase);
      expect(result.success).toBe(true);
    });

    it('should accept a valid adversarial case', () => {
      const result = EvalCaseSchema.safeParse(validAdversarialCase);
      expect(result.success).toBe(true);
    });

    it('should accept all valid category values', () => {
      const categories = ['happy_path', 'edge_case', 'adversarial', 'multi_step'];
      for (const category of categories) {
        const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, id: `id-${category}`, category });
        expect(result.success).toBe(true);
      }
    });

    it('should accept a case without optional verification_checks', () => {
      const { verification_checks: _vc, ...caseWithoutChecks } = validHappyPathCase;
      const result = EvalCaseSchema.safeParse(caseWithoutChecks);
      expect(result.success).toBe(true);
    });

    it('should accept a case with empty arrays for expected_tools and expected_output_contains', () => {
      const result = EvalCaseSchema.safeParse(validAdversarialCase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expected_tools).toHaveLength(0);
      }
    });

    it('should accept partial verification_checks object', () => {
      const partial = { ...validHappyPathCase, verification_checks: { input_validation: true } };
      const result = EvalCaseSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid cases', () => {
    it('should reject a case with missing id', () => {
      const { id: _id, ...noId } = validHappyPathCase;
      const result = EvalCaseSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('should reject a case with empty id string', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject an invalid category value', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, category: 'invalid_category' });
      expect(result.success).toBe(false);
    });

    it('should reject a case with missing input_query', () => {
      const { input_query: _q, ...noQuery } = validHappyPathCase;
      const result = EvalCaseSchema.safeParse(noQuery);
      expect(result.success).toBe(false);
    });

    it('should reject a case with empty input_query', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, input_query: '' });
      expect(result.success).toBe(false);
    });

    it('should reject a case with missing pass_criteria', () => {
      const { pass_criteria: _pc, ...noPass } = validHappyPathCase;
      const result = EvalCaseSchema.safeParse(noPass);
      expect(result.success).toBe(false);
    });

    it('should reject a case with empty pass_criteria', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, pass_criteria: '' });
      expect(result.success).toBe(false);
    });

    it('should reject a case where expected_tools is not an array', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, expected_tools: 'portfolio_performance' });
      expect(result.success).toBe(false);
    });

    it('should reject a case where expected_output_contains is not an array', () => {
      const result = EvalCaseSchema.safeParse({ ...validHappyPathCase, expected_output_contains: 'performance' });
      expect(result.success).toBe(false);
    });
  });

  describe('type inference', () => {
    it('should correctly infer the category type', () => {
      const result = EvalCaseSchema.safeParse(validHappyPathCase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('happy_path');
      }
    });

    it('should include all fields in parsed output', () => {
      const result = EvalCaseSchema.safeParse(validHappyPathCase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('category');
        expect(result.data).toHaveProperty('input_query');
        expect(result.data).toHaveProperty('expected_tools');
        expect(result.data).toHaveProperty('expected_output_contains');
        expect(result.data).toHaveProperty('expected_output_not_contains');
        expect(result.data).toHaveProperty('pass_criteria');
      }
    });
  });
});

describe('EvalCaseArraySchema', () => {
  it('should accept an array of valid eval cases', () => {
    const result = EvalCaseArraySchema.safeParse([validHappyPathCase, validAdversarialCase]);
    expect(result.success).toBe(true);
  });

  it('should accept an empty array', () => {
    const result = EvalCaseArraySchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('should reject an array containing an invalid case', () => {
    const invalidCase = { ...validHappyPathCase, category: 'not_valid' };
    const result = EvalCaseArraySchema.safeParse([validHappyPathCase, invalidCase]);
    expect(result.success).toBe(false);
  });
});
