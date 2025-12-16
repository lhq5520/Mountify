import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
  // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Get user input
        const email = String(credentials?.email || "");
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

                
        // 2. Basic validation
        if (!email || !password) {
          return null;
        }
                
        // 3. Query database
        const result = await query(
          "SELECT id, email, password_hash, role FROM users WHERE email = $1",
          [email]
        );
                
        // 4. User does not exist
        if (result.rows.length === 0) {
          return null;
        }
                
        const user = result.rows[0];

        //Oauth new logic - Oauth user can't login with passowrd
        if (!user.password_hash) {
          return null;
        }
                
        // 5. Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
                
        if (!isValid) {
          return null;
        }
                
        // 6. Authentication successful - return user info
        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
    
  pages: {
    signIn: '/auth/signin',  // Custom sign-in page path
  },
    
  session: {
    strategy: "jwt",  // Use JWT
  },

  callbacks: {
    //step5d- Oauth new logic for google login
    async jwt({ token, user, account }) {
      // Credentials login - On login (when user exists), add user.id and user.role to the token
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }

      //google Oauth logic - will upsert(high concurrency) into user table
      if (account?.provider === "google") {
        const email = token.email;
        if (!email) return token; // shouldn't be null but safety measure

        try {
          const res = await query(
            `
            INSERT INTO users (email, password_hash, role)
            VALUES ($1, NULL, 'customer')
            ON CONFLICT (email)
            DO UPDATE SET email = EXCLUDED.email
            RETURNING id, role
            `,
            [email]
          );

          token.id = res.rows[0].id.toString();
          token.role = res.rows[0].role;
        } catch (e) {
          console.error("OAuth upsert failed:", e);
          }
      }

    return token;
  },

    async session({ session, token }) {
      // Add token.id and token.role to session.user

      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }

      return session;
    }
  }

});