import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${request.nextUrl.origin}/api/auth/callback/google`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Send user data to backend for authentication
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER}/auth/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clerkId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || '',
        avatar: googleUser.picture,
      }),
    });

    if (!backendResponse.ok) {
      const error = await backendResponse.text();
      console.error('Backend auth error:', error);
      return NextResponse.redirect(new URL('/login?error=backend_auth_failed', request.url));
    }

    const { accessToken, user } = await backendResponse.json();

    // Redirect to intermediate page that will save token to localStorage
    // We pass token and user data via query params (will be handled by intermediate page)
    const redirectUrl = new URL('/auth/google/callback', request.url);
    redirectUrl.searchParams.set('token', accessToken);
    // Encode user data to avoid URL issues
    redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(user)));

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}