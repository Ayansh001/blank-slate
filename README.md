# StudyVault AI Nexus

**StudyVault AI Nexus** is an AI-powered study platform with smart notes, file management, and intelligent planning tools. Built with modern web technologies to help students and professionals organize, enhance, and optimize their learning experience.

## Features

- 🤖 **AI-Enhanced Learning**: Concept learning, quiz generation, and content analysis
- 📝 **Smart Notes**: Rich text editor with AI-powered enhancements
- 📁 **File Management**: Upload, organize, and process documents with OCR
- 📊 **Analytics Dashboard**: Track study sessions and productivity
- 🎯 **Study Planning**: Intelligent study plan generation and management
- 🔍 **Advanced Search**: Find content across notes and files instantly
- 📱 **Progressive Web App**: Works offline with full mobile support

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **AI Integration**: OpenAI, Google Gemini, Anthropic Claude
- **Additional**: React Query, React Router, Recharts

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend services)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd studyvault-ai-nexus
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your Supabase project settings in `.env`

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/         # Reusable UI components
├── features/          # Feature-specific components and logic
├── hooks/             # Custom React hooks
├── pages/             # Route components
├── services/          # API and business logic
├── utils/             # Utility functions
└── types/             # TypeScript definitions
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Deploy to Other Platforms

The built files in `dist/` can be deployed to any static hosting service.

## Configuration

### AI Services

Configure AI providers in your environment:
- OpenAI: Set `OPENAI_API_KEY`
- Google Gemini: Set `GEMINI_API_KEY`
- Anthropic: Set `ANTHROPIC_API_KEY`

### Supabase Setup

1. Create a new Supabase project
2. Run the migrations in `supabase/migrations/`
3. Deploy the Edge Functions in `supabase/functions/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.