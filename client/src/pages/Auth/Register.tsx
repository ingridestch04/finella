import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './Auth.module.css';

interface RegisterForm {
  fullName: string; email: string; password: string; currency: string; gdprConsent: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUiStore((s) => s.addToast);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, formState: { errors }, trigger, getValues } = useForm<RegisterForm>({
    defaultValues: { currency: 'EUR', gdprConsent: false },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: RegisterForm) => apiClient.post('/auth/register', data).then((r) => r.data),
    onSuccess: (data) => { setAuth(data.user, data.accessToken); navigate('/'); },
    onError: (err: { response?: { data?: { error?: string } } }) => addToast('error', err.response?.data?.error ?? 'Erreur lors de la création'),
  });

  const nextStep = async () => {
    const ok = await trigger(['fullName', 'email', 'password']);
    if (ok) setStep(2);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoText}>finella</span>
        </div>
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`} />
          <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`} />
        </div>
        <h1 className={styles.title}>{step === 1 ? 'Créer un compte' : 'Finaliser'}</h1>
        <p className={styles.subtitle}>
          {step === 1 ? 'Rejoignez finella — gratuit et sécurisé' : 'Quelques préférences et le tour est joué'}
        </p>

        <form onSubmit={handleSubmit((d) => mutate(d))} className={styles.form}>
          {step === 1 && (
            <>
              <Input label="Nom complet" placeholder="Alice Dupont" error={errors.fullName?.message}
                {...register('fullName', { required: 'Nom requis', minLength: { value: 2, message: 'Min 2 caractères' } })} />
              <Input label="Email" type="email" placeholder="alice@exemple.com" error={errors.email?.message}
                {...register('email', { required: 'Email requis' })} />
              <Input label="Mot de passe" type="password" placeholder="Min 8 caractères" error={errors.password?.message}
                {...register('password', { required: 'Requis', minLength: { value: 8, message: 'Min 8 caractères' },
                  pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Doit contenir maj, min, chiffre' } })} />
              <Button type="button" fullWidth size="lg" onClick={nextStep}>Continuer →</Button>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                  Devise
                </label>
                <select style={{ width: '100%', padding: 'var(--space-3) var(--space-4)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 'var(--text-base)' }}
                  {...register('currency')}>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar US</option>
                  <option value="GBP">GBP — Livre sterling</option>
                  <option value="CHF">CHF — Franc suisse</option>
                </select>
              </div>
              <label className={styles.gdpr}>
                <input type="checkbox" {...register('gdprConsent', { required: 'Consentement requis' })} />
                <span>
                  J'accepte les <a href="#" target="_blank">conditions d'utilisation</a> et la{' '}
                  <a href="#" target="_blank">politique de confidentialité</a>. Mes données sont traitées conformément au RGPD.
                </span>
              </label>
              {errors.gdprConsent && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{errors.gdprConsent.message}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>← Retour</Button>
                <Button type="submit" fullWidth loading={isPending} size="lg">Créer mon compte</Button>
              </div>
            </>
          )}
        </form>

        <p className={styles.footer}>
          Déjà un compte ? <Link to="/login" className={styles.link}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
