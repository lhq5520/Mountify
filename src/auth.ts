import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Get user input
        const email = credentials!.email as string;
        const password = credentials!.password as string;
                
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
    async jwt({ token, user }) {
      // On login (when user exists), add user.id to the token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Add token.id to session.user
      if (token.id) {
        session.user.id = token.id as string;
      }
      //role 
        if (token.role) {
        session.user.role = token.role as string; 
      }
      return session;
    }
  }

});