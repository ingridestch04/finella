import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './Auth.module.css';

interface LoginForm { email: string; password: string; }

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUiStore((s) => s.addToast);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginForm) => apiClient.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => { setAuth(data.token, data.user); navigate('/'); },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      addToast('error', err.response?.data?.error ?? 'Identifiants invalides'),
  });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><span className={styles.logoText}>finella</span></div>
        <h1 className={styles.title}>Bon retour 👋</h1>
        <p className={styles.subtitle}>Connectez-vous pour accéder à votre espace</p>
        <form onSubmit={handleSubmit((d) => mutate(d))} className={styles.form}>
          <Input label="Email" type="email" placeholder="alice@exemple.com"
            error={errors.email?.message} {...register('email', { required: 'Email requis' })} />
          <Input label="Mot de passe" type="password" placeholder="••••••••"
            error={errors.password?.message} {...register('password', { required: 'Mot de passe requis' })} />
          <Button type="submit" fullWidth loading={isPending} size="lg">Se connecter</Button>
        </form>
        <p className={styles.footer}>
          Pas encore de compte ?{' '}
          <Link to="/register" className={styles.link}>Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
