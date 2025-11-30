'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { createUser } from '@/lib/api/auth';
import { ROLES, type Role } from '@/lib/constants/roles';
import { getCsrfToken } from '@/lib/security/csrf';
import { LOCALE_REGION_MAPPING, type Locale } from '@/config/lang';

const GREETINGS: Record<Locale, string> = {
  en: 'Welcome',
  fr: 'Bienvenue',
  sw: 'Karibu',
  es: '¡Bienvenido!',
  de: 'Willkommen',
  zh: '欢迎',
};

const SignupSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'One uppercase letter')
      .regex(/\d/, 'One number')
      .regex(/[\W_]/, 'One special character'),
    confirmPassword: z.string(),
    role: z.enum(ROLES),
    language: z
      .string()
      .refine((l) => Object.keys(LOCALE_REGION_MAPPING).includes(l), {
        message: 'Select a valid language',
      }),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

type SignupForm = z.infer<typeof SignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams?.get('ref') ?? '';

  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [csrf, setCsrf] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setCsrf(getCsrfToken());
  }, []);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
  } = useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    mode: 'onChange',
    defaultValues: {
      referralCode: refCode,
      language: '',
    },
  });

  const watched = watch();
  const PASSWORD = watched.password ?? '';
  const LOCALES = Object.keys(LOCALE_REGION_MAPPING) as Locale[];

  const steps = [
    'Account Details',
    'Pick Your Role',
    'Choose Your Language',
    'Referral & Review',
    '🎉 You’re In!',
  ] as const;

  const onSubmit = async (data: SignupForm) => {
    await createUser({ ...data, csrfToken: csrf });
    setShowConfetti(true);
    setStep(4);

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push(`/login?email=${encodeURIComponent(data.email)}`);
        }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-tr from-blue-50 to-purple-50 overflow-hidden">
      {showConfetti && <Confetti numberOfPieces={300} recycle={false} />}

      <motion.div
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30"
        animate={{ x: [0, 200, 0], y: [0, 150, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40"
        animate={{ x: [0, -200, 0], y: [0, -100, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mx-auto max-w-md p-8 bg-white/85 backdrop-blur rounded-2xl shadow-lg">
        <h1 className="text-3xl font-extrabold text-center mb-6">{steps[step]}</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <label className="block text-sm font-medium">Email</label>
                <input type="email" {...register('email')} className="w-full border rounded px-3 py-2" />
                {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}

                <label className="block text-sm font-medium">Password</label>
                <input type="password" {...register('password')} className="w-full border rounded px-3 py-2" />
                <div className="h-2 bg-gray-200 rounded mt-1 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-red-500 to-green-500" animate={{ width: `${Math.min(100, PASSWORD.length * 12)}%` }} />
                </div>
                {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}

                <label className="block text-sm font-medium">Confirm Password</label>
                <input type="password" {...register('confirmPassword')} className="w-full border rounded px-3 py-2" />
                {errors.confirmPassword && <p className="text-red-600 text-sm">{errors.confirmPassword.message}</p>}

                <button type="button" onClick={() => setStep(1)} disabled={!isValid} className="w-full bg-indigo-600 text-white py-2 rounded disabled:opacity-50">Next</button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-4">
                      {ROLES.map((role) => (
                        <div key={role} onClick={() => field.onChange(role)} className={`cursor-pointer border rounded-lg p-4 text-center ${field.value === role ? 'border-indigo-600 bg-indigo-100' : 'border-gray-300'}`}>
                          <div className="text-xl font-semibold capitalize">{role}</div>
                        </div>
                      ))}
                    </div>
                  )}
                />
                {errors.role && <p className="text-red-600 text-sm">{errors.role.message}</p>}

                <div className="flex justify-between mt-4">
                  <button type="button" onClick={() => setStep(0)} className="px-4 py-2 border rounded">Back</button>
                  <button type="button" onClick={() => setStep(2)} disabled={!watch('role')} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Next</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 gap-4">
                      {LOCALES.map((loc) => (
                        <div key={loc} onClick={() => field.onChange(loc)} className={`cursor-pointer border rounded-lg p-4 text-center ${field.value === loc ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                      <div className="text-lg font-semibold">{loc}</div>
<p className="text-sm text-gray-500 mt-1">
  {LOCALE_REGION_MAPPING[loc]}
</p>
</div>
))}
</div>
)}
/>
{errors.language && (
<p className="text-red-600 text-sm">{errors.language.message}</p>
)}

<div className="flex justify-between mt-4">
<button
  type="button"
  onClick={() => setStep(1)}
  className="px-4 py-2 border rounded hover:bg-gray-100"
>
  Back
</button>
<button
  type="button"
  onClick={() => setStep(3)}
  disabled={!watch('language')}
  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
>
  Next
</button>
</div>
</motion.div>
)}

{step === 3 && (
<motion.div
  key="step3"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
  className="space-y-4"
>
  {/* Referral & Review */}
  <div>
    <label className="block text-sm font-medium">
      Referral Code (optional)
    </label>
    <input
      type="text"
      {...register('referralCode')}
      className="mt-1 w-full border rounded px-3 py-2"
    />
  </div>

  <div className="space-y-1">
    <p>
      <strong>Email:</strong> {watched.email}
    </p>
    <p>
      <strong>Role:</strong> {watched.role}
    </p>
    <p>
      <strong>Language:</strong> {watched.language}
    </p>
  </div>

  <div className="flex justify-between mt-4">
    <button
      type="button"
      onClick={() => setStep(2)}
      className="px-4 py-2 border rounded hover:bg-gray-100"
    >
      Back
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
    >
      {isSubmitting ? 'Creating account…' : 'Finish & Celebrate'}
    </button>
  </div>
</motion.div>
)}

{step === 4 && (
<motion.div
  key="step4"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
  className="text-center space-y-4 py-8"
>
  <h2 className="text-2xl font-bold">
    {(GREETINGS[watched.language as Locale] ?? 'Welcome')},{' '}
    {watched.role.charAt(0).toUpperCase() + watched.role.slice(1)}!
  </h2>
  <p className="text-gray-600">
    Redirecting to login in <strong>{countdown}</strong>…
  </p>
  <button
    onClick={() =>
      router.push(`/login?email=${encodeURIComponent(watched.email)}`)
    }
    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Go to Login Now
  </button>
</motion.div>
)}
</AnimatePresence>
</form>
</div>
</main>