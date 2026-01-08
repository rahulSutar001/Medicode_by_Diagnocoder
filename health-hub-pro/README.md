# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Authentication)

## Supabase Authentication Setup

This application uses Supabase for user authentication. To set up authentication:

1. **Create a Supabase project** (if you haven't already):
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Create a new project or use an existing one

2. **Get your project credentials**:
   - Navigate to Project Settings → API
   - Copy your `Project URL` and `anon/public` key

3. **Configure environment variables**:
   - Create a `.env` file in the root directory (copy from `.env.example`)
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your-project-url-here
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

4. **Enable Email Authentication with OTP** (in Supabase Dashboard):
   - Go to Authentication → Providers
   - Enable "Email" provider
   - Go to Authentication → Settings → Email Templates
   - **Configure OTP Email Template:**
     - Find "Magic Link" template (this is used for OTP)
     - Update the template to include: `{{ .Token }}` for the OTP code
     - Example template body:
       ```
       Your OTP code is: {{ .Token }}
       This code will expire in 1 hour.
       ```
   - **Important:** The app uses passwordless OTP signup, so ensure "Magic Link" template is configured
   - Go to Authentication → Settings → URL Configuration
   - Set "Site URL" to your production URL (or keep localhost for development)
   - **Optional:** Configure custom SMTP for better email delivery (recommended for production)

5. **Restart the development server** after adding environment variables:
   ```sh
   npm run dev
   ```

The authentication is now integrated with:
- ✅ Login functionality
- ✅ Sign up functionality
- ✅ Session persistence
- ✅ Automatic session refresh
- ✅ Logout functionality

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
