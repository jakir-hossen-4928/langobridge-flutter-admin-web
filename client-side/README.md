# LangoBridge Admin

LangoBridge Admin is a secure web application for managing Korean-Bangla learning resources, vocabulary, and educational content.

## Features

- **Supabase Dashboard Stats**: Real-time statistics from Supabase.
- **Admin Authentication**: Secure login system with `AuthContext` and protected routes.
- **Vocabulary Management**: Add, edit, and bulk upload Korean-Bangla vocabulary.
- **Resource Management**: Upload and manage study materials and PDFs.
- **Blog System**: Full blog management with Flutter-compatible Markdown support.
- **Responsive Design**: Sidebar-based navigation optimized for both desktop and mobile.

## Technology Stack

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS
- Supabase (Backend & Auth)
- ImgBB (Image Hosting)

## Getting Started

### Prerequisites

- Node.js & npm installed.
- Supabase project credentials.
- ImgBB API Key.

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   ```

2. Navigate to the project directory:
   ```sh
   cd kora-bangla-bridge
   ```

3. Install dependencies:
   ```sh
   npm i
   ```

4. Create a `.env` file based on `.env.example` and add your keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
   VITE_IMGBB_API_KEY=your_imgbb_key
   ```

5. Start the development server:
   ```sh
   npm run dev
   ```

## Deployment

To build the project for production:
```sh
npm run build
```
The output will be in the `dist` folder.
"# langobridge-flutter-admin-web" 
