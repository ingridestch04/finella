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

interface RegisterForm { name: string; email: string; password: string; }

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useUiStore((s) => s.addToast);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: RegisterForm) => apiClient.post('/auth/register', data).then((r) => r.data),
    onSuccess: (data) => { setAuth(data.token, data.user); navigate('/'); },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      addToast('error', err.response?.data?.error ?? 'Erreur lors de la création'),
  });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><span className={styles.logoText}>finella</span></div>
        <h1 className={styles.title}>Créer un compte</h1>
        <p className={styles.subtitle}>Rejoignez finella — gratuit et simple</p>
        <form onSubmit={handleSubmit((d) => mutate(d))} className={styles.form}>
          <Input label="Nom complet" placeholder="Alice Dupont" error={errors.name?.message}
            {...register('name', { required: 'Nom requis', minLength: { value: 2, message: 'Min 2 caractères' } })} />
          <Input label="Email" type="email" placeholder="alice@exemple.com" error={errors.email?.message}
            {...register('email', { required: 'Email requis' })} />
          <Input label="Mot de passe" type="password" placeholder="Min 8 caractères" error={errors.password?.message}
            {...register('password', { required: 'Requis', minLength: { value: 8, message: 'Min 8 caractères' } })} />
          <Button type="submit" fullWidth loading={isPending} size="lg">Créer mon compte</Button>
        </form>
        <p className={styles.footer}>
          Déjà un compte ? <Link to="/login" className={styles.link}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
