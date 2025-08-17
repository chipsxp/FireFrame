# FireFrame Share

A modern social media platform built with Next.js and Supabase, featuring real-time posts, user authentication, and a sleek user interface.

## 🚀 Features

### Authentication & User Management
- **Email/Password Authentication**: Secure signup and signin with email validation
- **OAuth Integration**: Multiple OAuth providers supported:
  - Google
  - Azure
  - Discord
  - Facebook
- **User Profiles**: Customizable user profiles with avatar, bio, and contact information
- **Protected Routes**: Secure access to authenticated-only features
- **Real-time Session Management**: Automatic session handling and persistence

### Social Media Functionality
- **Post Creation**: Upload images with captions and share with the community
- **Real-time Feed**: Live updates of posts from all users
- **User Profiles**: View individual user profiles with their post history
- **Post Filtering**: Filter posts by trending, recent, or other criteria
- **Image Upload**: Support for image uploads with automatic optimization
- **Responsive Design**: Optimized for desktop and mobile devices

### User Interface
- **Modern Design**: Clean, Instagram-inspired interface
- **Dark/Light Mode**: Automatic theme detection and switching
- **Responsive Layout**: Mobile-first design that works on all devices
- **Interactive Components**: Smooth animations and transitions
- **Toast Notifications**: Real-time feedback for user actions

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 15.3.3**: React framework with App Router
- **React 18**: Latest React with concurrent features
- **TypeScript**: Full type safety throughout the application

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible, unstyled UI components:
  - Dialog, Dropdown Menu, Avatar, Tabs
  - Form components (Input, Textarea, Button)
  - Navigation components (Accordion, Collapsible)
- **Lucide React**: Beautiful, customizable icons
- **shadcn/ui**: Pre-built component library built on Radix UI

### State Management
- **Zustand**: Lightweight state management for user authentication and posts
- **React Hook Form**: Efficient form handling with validation
- **Zod**: Schema validation for forms and data

### Backend & Database
- **Supabase**: Backend-as-a-Service providing:
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication system
  - File storage
  - Row Level Security (RLS)

### Development Tools
- **TypeScript**: Static type checking
- **ESLint**: Code linting and formatting
- **Turbopack**: Fast development server (Next.js)

## 🔐 Authentication System

FireFrame uses Supabase Auth for comprehensive user authentication:

### Signup Process
- **Form Validation**: Comprehensive form validation with Zod schema
- **Password Strength**: Real-time password strength indicator
- **Email Verification**: Email confirmation required for account activation
- **Username Uniqueness**: Automatic username validation
- **Terms & Privacy**: Required acceptance of terms and privacy policy

### Signin Options
- **Email/Password**: Traditional authentication method
- **OAuth Providers**: One-click signin with:
  - Google OAuth
  - Microsoft Azure AD
  - Discord
  - Facebook
- **Session Persistence**: Automatic session management across browser sessions
- **Secure Redirects**: Safe callback handling for OAuth flows

### Security Features
- **Row Level Security**: Database-level security policies
- **JWT Tokens**: Secure token-based authentication
- **Automatic Token Refresh**: Seamless session management
- **Protected Routes**: Client-side route protection

## 🗄️ Supabase Integration

### Database Schema
- **Users Table**: User profiles with metadata
- **Posts Table**: Social media posts with relationships
- **Real-time Subscriptions**: Live updates for posts and user data

### Storage
- **Image Upload**: Secure image storage with automatic optimization
- **CDN Integration**: Fast image delivery through Supabase CDN
- **File Management**: Organized storage buckets for different content types

### Real-time Features
- **Live Posts**: Real-time post updates across all users
- **User Status**: Live user presence and activity
- **Instant Notifications**: Real-time feedback for user interactions

### Security & Performance
- **Row Level Security (RLS)**: User data isolation and security
- **Connection Pooling**: Optimized database connections
- **Automatic Backups**: Built-in data protection
- **Edge Functions**: Serverless functions for custom logic

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FireFrame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.local.template .env.local
   ```

   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:9002`

### Supabase Setup

1. **Create a new Supabase project**
2. **Set up authentication providers** in the Supabase dashboard
3. **Configure OAuth providers** (Google, Azure, Discord, Facebook)
4. **Set up database tables** using the provided SQL schema
5. **Configure Row Level Security** policies
6. **Set up storage buckets** for image uploads

## 📱 Usage

### Creating an Account
1. Click "Sign Up" on the homepage
2. Fill in your details (username, email, password)
3. Accept terms and privacy policy
4. Verify your email address
5. Complete your profile setup

### Posting Content
1. Click the "+" button in the header
2. Upload an image or take a photo
3. Add a caption
4. Click "Share" to publish

### Exploring Content
1. Browse the main feed for trending posts
2. Use filters to sort content
3. Visit user profiles to see their posts
4. Interact with posts through likes and comments

## 🔧 Development

### Project Structure
```
FireFrameShare/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and configurations
│   └── ai/                 # AI integration features
├── docs/                   # Documentation
└── public/                 # Static assets
```

### Key Components
- **AuthProvider**: Global authentication context
- **ProtectedRoute**: Route protection wrapper
- **PostCard**: Individual post display component
- **NewPostDialog**: Post creation interface
- **Header**: Navigation and search

### Custom Hooks
- **useAuth**: Authentication state management
- **usePostStore**: Post data management
- **Form hooks**: Form validation and submission

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in the `/docs` folder
- Review the Supabase setup instructions
- Open an issue on GitHub

---

Built with ❤️ using Next.js and Supabase
