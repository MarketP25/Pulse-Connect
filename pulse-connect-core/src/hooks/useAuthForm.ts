// src/hooks/useAuthForm.ts
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

interface UseAuthForm {
  email: string;
  password: string;
  error: string;
  info: string;
  loading: boolean;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setInfo: React.Dispatch<React.SetStateAction<string>>;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleSignup: (e: React.FormEvent) => Promise<void>;
  handleResetPassword: (e: React.FormEvent) => Promise<void>;
}

export function useAuthForm(): UseAuthForm {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Guard against null searchParams
  const validSearchParams = useMemo(() => {
    if (!searchParams) {
      return new URLSearchParams(); // empty fallback
    }
    return searchParams;
  }, [searchParams]);

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  function getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/user-not-found':
        return 'No user found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      default:
        return 'Authentication error. Please try again.';
    }
  }

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('Please verify your email before logging in.');
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const referrer = validSearchParams.get('ref');

      if (referrer?.toLowerCase() === email.toLowerCase()) {
        setError('You cannot refer yourself.');
        return;
      }

      let referredBy: string | null = null;
      if (referrer) {
        const refSnap = await getDoc(doc(db, 'users', referrer));
        if (refSnap.exists()) {
          referredBy = referrer;
        } else {
          setError('Referral code is invalid.');
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'basic',
        referredBy,
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);
      router.push('/verify-email');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email to reset password.');
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    password,
    error,
    info,
    loading,
    setEmail,
    setPassword,
    setError,
    setInfo,
    handleLogin,
    handleSignup,
    handleResetPassword,
  };
}
