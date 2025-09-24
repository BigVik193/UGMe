# UGMe - AI-Powered UGC Content Creation Platform

Transform your Amazon products into engaging user-generated content with the power of AI.

## Features

- **Modern Landing Page**: Beautiful, responsive design with pink/purple gradient theme
- **Complete Authentication**: Sign up and sign in with Supabase Auth
- **User Profiles**: Automatic profile creation with first name, last name, and email
- **Protected Dashboard**: User dashboard for managing content creation
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom gradients
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Deployment**: Ready for Vercel deployment

## Getting Started

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Your `.env` file is already configured with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zgyypucrupiaibradqph.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Database Setup**
   Run the migration in your Supabase SQL editor:
   ```sql
   -- Copy and run the contents of supabase/migrations/001_create_profiles.sql
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Your Browser**
   Navigate to `http://localhost:3000`

## Database Schema

The application creates a `profiles` table that:
- Links to Supabase Auth users via foreign key
- Stores user metadata (first_name, last_name, email)
- Has Row Level Security enabled
- Automatically creates profiles on user signup via triggers

## Authentication Flow

1. **Landing Page**: Users see the main landing page with sign up/sign in forms
2. **Sign Up**: New users create accounts with name, email, password
3. **Profile Creation**: Automatic profile creation in the database
4. **Dashboard Access**: Authenticated users are redirected to the dashboard
5. **Sign In**: Returning users can sign in and access their dashboard

## Project Structure

```
src/
├── app/
│   ├── dashboard/page.tsx       # Protected dashboard page
│   ├── globals.css              # Global styles with custom gradients
│   ├── layout.tsx               # Root layout with AuthProvider
│   └── page.tsx                 # Landing page with auth routing
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx       # Sign in form component
│   │   └── SignUpForm.tsx       # Sign up form component
│   └── LandingPage.tsx          # Main landing page component
├── contexts/
│   └── AuthContext.tsx          # Authentication context provider
├── lib/
│   └── supabase/
│       ├── client.ts            # Supabase client for client-side
│       └── server.ts            # Supabase client for server-side
└── middleware.ts                # Auth middleware for route protection
```

## Next Steps

To complete the UGC content creation platform:

1. **Amazon Product Integration**: Add functionality to parse Amazon URLs
2. **AI Content Generation**: Integrate AI models for content creation
3. **Content Management**: Build interfaces for managing generated content
4. **Export Features**: Add content export in various formats
5. **User Settings**: Expand user profile management

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
