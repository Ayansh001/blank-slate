
export interface Note {
  id: string;
  title: string;
  content: string;
  plainText: string;
  tags: string[];
  category: string;
  wordCount: number;
  readingTime: number;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

export interface NoteFilters {
  search: string;
  category: string;
  tags: string[];
  sortBy: 'title' | 'createdAt' | 'updatedAt' | 'wordCount';
  sortOrder: 'asc' | 'desc';
}
