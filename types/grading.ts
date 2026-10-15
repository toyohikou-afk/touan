export type GradeResult = {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  score: number;
  isFatal: boolean;
  triggeredTraps: {
    trapName: string;
    detectedText: string;
    whyFatal: string;
  }[];
  structuralCheck: {
    orderOfParties: boolean;
    syllogismStrictness: 'High' | 'Medium' | 'Low';
    factEvaluationScore: 'Sufficient' | 'FactListingOnly';
  };
  criticalFeedback: string;
  idealStructure: string;
};