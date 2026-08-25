
/**
 * UI Protection Types - These interfaces LOCK the current Learn.tsx UI structure
 * and prevent any changes to the rich quiz generator interface.
 * 
 * CRITICAL: These types must NEVER be changed without explicit user approval.
 * The rich UI (Image 2) must remain permanent.
 */

export interface LearnPageUILock {
  readonly layout: 'three-column';
  readonly contentSelection: {
    readonly hasFileTab: true;
    readonly hasNoteTab: true;
    readonly hasPreview: true;
    readonly hasEyeButton: true;
  };
  readonly aiTools: {
    readonly hasQuizGenerator: true;
    readonly hasContentEnhancer: true;
    readonly hasTabs: true;
  };
  readonly richQuizGenerator: {
    readonly hasQuizTypeSelection: true;
    readonly hasDifficultySelection: true;
    readonly hasQuestionCountSelection: true;
    readonly hasCustomQuestionCount: true;
    readonly hasAdvancedOption: true;
    readonly hasContentPreview: true;
  };
}

export interface QuizGeneratorUILock {
  readonly requiredProps: {
    content: string;
    source?: {
      type: 'file' | 'note';
      id: string;
      name: string;
    };
  };
  readonly prohibitedProps: {
    readonly noTopicString: true;
    readonly noSimpleInterface: true;
  };
  readonly requiredFeatures: {
    readonly multipleQuizTypes: true;
    readonly difficultyLevels: true;
    readonly questionCountOptions: true;
    readonly contentPreview: true;
    readonly advancedQuizDialog: true;
  };
}

/**
 * UI Protection Guard - Validates that components maintain the locked structure
 */
export function validateLearnPageStructure(props: any): props is LearnPageUILock {
  return (
    props.layout === 'three-column' &&
    props.contentSelection?.hasFileTab === true &&
    props.contentSelection?.hasNoteTab === true &&
    props.aiTools?.hasQuizGenerator === true &&
    props.richQuizGenerator?.hasQuizTypeSelection === true
  );
}

export function validateQuizGeneratorProps(props: any): props is QuizGeneratorUILock['requiredProps'] {
  return (
    typeof props.content === 'string' &&
    props.content.length > 0 &&
    (!props.source || (
      typeof props.source.type === 'string' &&
      typeof props.source.id === 'string' &&
      typeof props.source.name === 'string'
    ))
  );
}
