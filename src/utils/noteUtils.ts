
export const calculateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

export const calculateWordCount = (text: string): number => {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

// Alias for consistency with hook usage
export const getWordCount = calculateWordCount;

export const extractPlainText = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Alias for consistency with hook usage
export const stripHtml = extractPlainText;

export const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const exportToMarkdown = (title: string, content: string): string => {
  const plainContent = stripHtml(content);
  return `# ${title}\n\n${plainContent}`;
};

export const exportToPDF = (title: string, content: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const plainContent = stripHtml(content);
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            p { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div>${plainContent.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

export const generateNoteSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const searchNotes = (notes: any[], query: string) => {
  if (!query.trim()) return notes;
  
  const searchTerms = query.toLowerCase().split(' ');
  
  return notes.filter(note => {
    const searchableText = `${note.title} ${note.plain_text} ${note.tags?.join(' ')} ${note.category}`.toLowerCase();
    return searchTerms.every(term => searchableText.includes(term));
  });
};

export const filterNotesByCategory = (notes: any[], category: string) => {
  if (!category || category === 'All') return notes;
  return notes.filter(note => note.category === category);
};

export const filterNotesByTag = (notes: any[], tag: string) => {
  if (!tag) return notes;
  return notes.filter(note => note.tags?.includes(tag));
};

export const sortNotes = (notes: any[], sortBy: 'updated' | 'created' | 'title') => {
  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'updated':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });
};
